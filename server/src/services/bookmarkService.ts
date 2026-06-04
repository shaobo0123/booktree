import { Prisma, type Bookmark } from '@prisma/client';
import { prisma } from '../db.js';
import type { ImportedBookmarkNode } from '../utils/bookmarkHtml.js';
import { createBookmarkHtml } from '../utils/bookmarkHtml.js';

export type BookmarkType = 'folder' | 'bookmark';

export interface BookmarkNode {
  id: string;
  parent_id: string | null;
  title: string;
  type: BookmarkType;
  url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children: BookmarkNode[];
}

export interface CreateBookmarkInput {
  title: string;
  type: BookmarkType;
  url?: string | null;
  parent_id?: string | null;
  sort_order?: number;
}

export interface UpdateBookmarkInput {
  title?: string;
  url?: string | null;
  parent_id?: string | null;
  sort_order?: number;
}

function toNode(record: Bookmark): BookmarkNode {
  return {
    id: record.id,
    parent_id: record.parentId,
    title: record.title,
    type: record.type as BookmarkType,
    url: record.url,
    sort_order: record.sortOrder,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
    children: []
  };
}

function sortNodes(nodes: BookmarkNode[]) {
  nodes.sort((left, right) => left.sort_order - right.sort_order || left.title.localeCompare(right.title));
  for (const node of nodes) {
    sortNodes(node.children);
  }
}

async function assertParentFolder(parentId: string | null | undefined) {
  if (!parentId) {
    return;
  }

  const parent = await prisma.bookmark.findUnique({ where: { id: parentId } });
  if (!parent) {
    throw new Error('Parent folder not found');
  }
  if (parent.type !== 'folder') {
    throw new Error('Parent must be a folder');
  }
}

async function nextSortOrder(parentId: string | null) {
  const aggregate = await prisma.bookmark.aggregate({
    where: { parentId },
    _max: { sortOrder: true }
  });

  return (aggregate._max.sortOrder ?? 0) + 10;
}

async function isDescendant(nodeId: string, possibleDescendantId: string): Promise<boolean> {
  const children = await prisma.bookmark.findMany({
    where: { parentId: nodeId },
    select: { id: true }
  });

  for (const child of children) {
    if (child.id === possibleDescendantId || (await isDescendant(child.id, possibleDescendantId))) {
      return true;
    }
  }

  return false;
}

async function deleteNode(id: string, tx: Prisma.TransactionClient) {
  const children = await tx.bookmark.findMany({
    where: { parentId: id },
    select: { id: true }
  });

  for (const child of children) {
    await deleteNode(child.id, tx);
  }

  await tx.bookmark.delete({ where: { id } });
}

export async function getBookmarkTree(): Promise<BookmarkNode[]> {
  const records = await prisma.bookmark.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }]
  });

  const byId = new Map<string, BookmarkNode>();
  const roots: BookmarkNode[] = [];

  for (const record of records) {
    byId.set(record.id, toNode(record));
  }

  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortNodes(roots);
  return roots;
}

export async function createBookmark(input: CreateBookmarkInput): Promise<BookmarkNode> {
  const title = input.title.trim();
  const parentId = input.parent_id ?? null;

  if (!title) {
    throw new Error('Title is required');
  }
  if (input.type !== 'folder' && input.type !== 'bookmark') {
    throw new Error('Type must be folder or bookmark');
  }

  await assertParentFolder(parentId);

  const url = input.type === 'bookmark' ? input.url?.trim() : null;
  if (input.type === 'bookmark' && !url) {
    throw new Error('URL is required for bookmarks');
  }

  const record = await prisma.bookmark.create({
    data: {
      title,
      type: input.type,
      url,
      parentId,
      sortOrder: input.sort_order ?? (await nextSortOrder(parentId))
    }
  });

  return toNode(record);
}

export async function updateBookmark(id: string, input: UpdateBookmarkInput): Promise<BookmarkNode> {
  const existing = await prisma.bookmark.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Bookmark not found');
  }

  const nextParentId = input.parent_id === undefined ? existing.parentId : input.parent_id;
  if (nextParentId) {
    if (nextParentId === id) {
      throw new Error('A node cannot be its own parent');
    }
    await assertParentFolder(nextParentId);
    if (await isDescendant(id, nextParentId)) {
      throw new Error('A node cannot be moved into its own descendant');
    }
  }

  const title = input.title === undefined ? existing.title : input.title.trim();
  if (!title) {
    throw new Error('Title is required');
  }

  const url = input.url === undefined ? existing.url : input.url?.trim() || null;
  if (existing.type === 'bookmark' && !url) {
    throw new Error('URL is required for bookmarks');
  }

  const record = await prisma.bookmark.update({
    where: { id },
    data: {
      title,
      url: existing.type === 'folder' ? null : url,
      parentId: nextParentId ?? null,
      sortOrder: input.sort_order ?? existing.sortOrder
    }
  });

  return toNode(record);
}

export async function removeBookmark(id: string) {
  const existing = await prisma.bookmark.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Bookmark not found');
  }

  await prisma.$transaction(async (tx) => {
    await deleteNode(id, tx);
  });
}

export async function searchBookmarks(query: string): Promise<BookmarkNode[]> {
  const q = query.trim();
  if (!q) {
    return [];
  }

  const records = await prisma.bookmark.findMany({
    where: {
      type: 'bookmark',
      OR: [{ title: { contains: q } }, { url: { contains: q } }]
    },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }]
  });

  return records.map(toNode);
}

async function createImportedBranch(nodes: ImportedBookmarkNode[], parentId: string | null): Promise<number> {
  let imported = 0;
  let sortOrder = await nextSortOrder(parentId);

  for (const node of nodes) {
    const created = await prisma.bookmark.create({
      data: {
        title: node.title,
        type: node.type,
        url: node.type === 'bookmark' ? node.url : null,
        parentId,
        sortOrder
      }
    });

    imported += 1;
    sortOrder += 10;

    if (node.type === 'folder' && node.children.length > 0) {
      imported += await createImportedBranch(node.children, created.id);
    }
  }

  return imported;
}

export async function importBookmarkNodes(nodes: ImportedBookmarkNode[]) {
  if (nodes.length === 0) {
    return 0;
  }

  return createImportedBranch(nodes, null);
}

export async function reorderBookmarks(parentId: string | null, orderedIds: string[]): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.bookmark.update({
        where: { id },
        data: { sortOrder: (index + 1) * 10 }
      })
    )
  );
}

export async function exportBookmarkHtml() {
  return createBookmarkHtml(await getBookmarkTree());
}

export async function exportBookmarkHtmlByRoot(rootId: string | null) {
  const tree = await getBookmarkTree();
  if (!rootId) {
    return createBookmarkHtml(tree);
  }

  function findNode(nodes: BookmarkNode[]): BookmarkNode | null {
    for (const node of nodes) {
      if (node.id === rootId) {
        return node;
      }
      const child = findNode(node.children);
      if (child) {
        return child;
      }
    }

    return null;
  }

  const root = findNode(tree);
  if (!root) {
    throw new Error('Export root not found');
  }

  return createBookmarkHtml([root]);
}
