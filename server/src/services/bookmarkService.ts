import { Prisma, type Bookmark } from '@prisma/client';
import { prisma } from '../db.js';
import type { ImportedBookmarkNode } from '../utils/bookmarkHtml.js';
import { createBookmarkHtml } from '../utils/bookmarkHtml.js';
import { fetchBookmarkMetadata, normalizeBookmarkUrl } from '../utils/bookmarkMetadata.js';

export type BookmarkType = 'folder' | 'bookmark';

export interface BookmarkNode {
  id: string;
  parent_id: string | null;
  title: string;
  type: BookmarkType;
  url: string | null;
  favicon_url: string | null;
  favicon_base64: string | null;
  favicon_mime: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children: BookmarkNode[];
}

export interface CreateBookmarkInput {
  title?: string;
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
    favicon_url: record.faviconUrl,
    favicon_base64: record.faviconBase64,
    favicon_mime: record.faviconMime,
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

function fallbackTitleFromUrl(url: string) {
  try {
    return new URL(url).hostname || '未命名书签';
  } catch {
    return '未命名书签';
  }
}

function fallbackFaviconUrl(url: string) {
  try {
    return new URL('/favicon.ico', url).toString();
  } catch {
    return null;
  }
}

async function refreshBookmarkIcon(id: string, sourceUrl: string) {
  try {
    const metadata = await fetchBookmarkMetadata(sourceUrl);
    const current = await prisma.bookmark.findUnique({ where: { id } });
    if (!current || current.type !== 'bookmark' || current.url !== sourceUrl) {
      return;
    }

    await prisma.bookmark.update({
      where: { id },
      data: {
        faviconUrl: metadata.faviconUrl,
        faviconBase64: metadata.faviconBase64,
        faviconMime: metadata.faviconMime
      }
    });
  } catch {
    // Metadata is best-effort; saving bookmarks should not depend on external sites.
  }
}

function queueBookmarkIconRefresh(id: string, sourceUrl: string) {
  void refreshBookmarkIcon(id, sourceUrl);
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
  const inputTitle = input.title?.trim() ?? '';
  const parentId = input.parent_id ?? null;

  if (input.type !== 'folder' && input.type !== 'bookmark') {
    throw new Error('Type must be folder or bookmark');
  }

  await assertParentFolder(parentId);

  if (input.type === 'folder') {
    if (!inputTitle) {
      throw new Error('Title is required');
    }

    const record = await prisma.bookmark.create({
      data: {
        title: inputTitle,
        type: input.type,
        url: null,
        faviconUrl: null,
        faviconBase64: null,
        faviconMime: null,
        parentId,
        sortOrder: input.sort_order ?? (await nextSortOrder(parentId))
      }
    });

    return toNode(record);
  }

  const url = normalizeBookmarkUrl(input.url ?? '');
  let title = inputTitle;
  let faviconUrl = fallbackFaviconUrl(url);
  let faviconBase64: string | null = null;
  let faviconMime: string | null = null;

  if (!title) {
    const metadata = await fetchBookmarkMetadata(url);
    title = metadata.title || fallbackTitleFromUrl(url);
    faviconUrl = metadata.faviconUrl;
    faviconBase64 = metadata.faviconBase64;
    faviconMime = metadata.faviconMime;
  }

  const record = await prisma.bookmark.create({
    data: {
      title,
      type: input.type,
      url,
      faviconUrl,
      faviconBase64,
      faviconMime,
      parentId,
      sortOrder: input.sort_order ?? (await nextSortOrder(parentId))
    }
  });

  queueBookmarkIconRefresh(record.id, url);
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

  let title = input.title === undefined ? existing.title : input.title.trim();
  if (existing.type === 'folder' && !title) {
    throw new Error('Title is required');
  }

  let url = input.url === undefined ? existing.url : input.url?.trim() || null;
  if (existing.type === 'bookmark' && !url) {
    throw new Error('URL is required for bookmarks');
  }

  let faviconUrl = existing.faviconUrl;
  let faviconBase64 = existing.faviconBase64;
  let faviconMime = existing.faviconMime;
  let shouldRefreshIcon = false;

  if (existing.type === 'bookmark' && url) {
    url = normalizeBookmarkUrl(url);
    if (input.url !== undefined || !title) {
      shouldRefreshIcon = true;
      title = title || fallbackTitleFromUrl(url);
      faviconUrl = fallbackFaviconUrl(url);
      faviconBase64 = null;
      faviconMime = null;
    }
  }

  const record = await prisma.bookmark.update({
    where: { id },
    data: {
      title,
      url: existing.type === 'folder' ? null : url,
      faviconUrl: existing.type === 'folder' ? null : faviconUrl,
      faviconBase64: existing.type === 'folder' ? null : faviconBase64,
      faviconMime: existing.type === 'folder' ? null : faviconMime,
      parentId: nextParentId ?? null,
      sortOrder: input.sort_order ?? existing.sortOrder
    }
  });

  if (record.type === 'bookmark' && record.url && shouldRefreshIcon) {
    queueBookmarkIconRefresh(record.id, record.url);
  }

  return toNode(record);
}

export async function refreshBookmarkIconInBackground(id: string) {
  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark || bookmark.type !== 'bookmark' || !bookmark.url) {
    throw new Error('Bookmark not found');
  }

  queueBookmarkIconRefresh(bookmark.id, bookmark.url);
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

function environmentTitleFromImport(sourceName?: string | null) {
  const fallback = `导入环境 ${new Date().toLocaleString('zh-CN', { hour12: false })}`;
  const name = sourceName?.replace(/\.[^.]+$/, '').trim();
  return name || fallback;
}

export async function importBookmarkNodes(nodes: ImportedBookmarkNode[], sourceName?: string | null) {
  if (nodes.length === 0) {
    return 0;
  }

  const environment = await prisma.bookmark.create({
    data: {
      title: environmentTitleFromImport(sourceName),
      type: 'folder',
      url: null,
      faviconUrl: null,
      faviconBase64: null,
      faviconMime: null,
      parentId: null,
      sortOrder: await nextSortOrder(null)
    }
  });

  return 1 + (await createImportedBranch(nodes, environment.id));
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
