import { Prisma, type Bookmark } from '@prisma/client';
import { prisma } from '../db.js';
import type { ImportedBookmarkNode } from '../utils/bookmarkHtml.js';
import { createBookmarkHtml } from '../utils/bookmarkHtml.js';
function normalizeBookmarkUrl(value: string) {
  const raw = value.trim();
  if (!raw) throw new Error('URL is required for bookmarks');
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  const u = new URL(withProtocol);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Bookmark URL must use http or https');
  return u.toString();
}

export type BookmarkType = 'folder' | 'bookmark';

export interface BookmarkNode {
  id: string; parent_id: string | null; title: string; type: BookmarkType;
  url: string | null;
  favicon_url: string | null; favicon_base64: string | null; favicon_mime: string | null;
  favicon_expires_at: string | null; icon_failed_at: string | null;
  sort_order: number; created_at: string; updated_at: string;
  children: BookmarkNode[];
}

export interface CreateBookmarkInput {
  title?: string; type: BookmarkType; url?: string | null; parent_id?: string | null; sort_order?: number;
}
export interface UpdateBookmarkInput {
  title?: string; url?: string | null; parent_id?: string | null; sort_order?: number;
}

function toNode(record: Bookmark): BookmarkNode {
  return {
    id: record.id, parent_id: record.parentId, title: record.title, type: record.type as BookmarkType,
    url: record.url,
    favicon_url: record.faviconUrl, favicon_base64: record.faviconBase64, favicon_mime: record.faviconMime,
    favicon_expires_at: record.faviconExpiresAt?.toISOString() ?? null,
    icon_failed_at: record.iconFailedAt?.toISOString() ?? null,
    sort_order: record.sortOrder, created_at: record.createdAt.toISOString(), updated_at: record.updatedAt.toISOString(),
    children: []
  };
}

function sortNodes(nodes: BookmarkNode[]) {
  nodes.sort((l, r) => l.sort_order - r.sort_order || l.title.localeCompare(r.title));
  for (const n of nodes) sortNodes(n.children);
}

async function assertParentFolder(parentId: string | null | undefined) {
  if (!parentId) return;
  const p = await prisma.bookmark.findUnique({ where: { id: parentId } });
  if (!p) throw new Error('Parent folder not found');
  if (p.type !== 'folder') throw new Error('Parent must be a folder');
}

async function nextSortOrder(parentId: string | null) {
  const agg = await prisma.bookmark.aggregate({ where: { parentId }, _max: { sortOrder: true } });
  return (agg._max.sortOrder ?? 0) + 10;
}

function fallbackTitleFromUrl(url: string) {
  try { return new URL(url).hostname || '未命名书签'; } catch { return '未命名书签'; }
}

// --- CRUD ---
async function deleteNode(id: string, tx: Prisma.TransactionClient) {
  const children = await tx.bookmark.findMany({ where: { parentId: id }, select: { id: true } });
  for (const c of children) await deleteNode(c.id, tx);
  await tx.bookmark.delete({ where: { id } });
}

async function isDescendant(nodeId: string, possibleDescendantId: string): Promise<boolean> {
  const children = await prisma.bookmark.findMany({ where: { parentId: nodeId }, select: { id: true } });
  for (const c of children) { if (c.id === possibleDescendantId || await isDescendant(c.id, possibleDescendantId)) return true; }
  return false;
}

export async function getBookmarkTree(): Promise<BookmarkNode[]> {
  const records = await prisma.bookmark.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
  const byId = new Map<string, BookmarkNode>();
  const roots: BookmarkNode[] = [];
  for (const r of records) byId.set(r.id, toNode(r));
  for (const n of byId.values()) {
    if (n.parent_id && byId.has(n.parent_id)) byId.get(n.parent_id)!.children.push(n);
    else roots.push(n);
  }
  sortNodes(roots);
  return roots;
}

export async function createBookmark(input: CreateBookmarkInput): Promise<BookmarkNode> {
  const title = input.title?.trim() ?? '';
  const parentId = input.parent_id ?? null;
  if (input.type !== 'folder' && input.type !== 'bookmark') throw new Error('Type must be folder or bookmark');
  await assertParentFolder(parentId);

  if (input.type === 'folder') {
    if (!title) throw new Error('Title is required');
    const r = await prisma.bookmark.create({
      data: { title, type: 'folder', url: null, faviconUrl: null, faviconBase64: null, faviconMime: null, parentId, sortOrder: input.sort_order ?? await nextSortOrder(parentId) }
    });
    return toNode(r);
  }

  const url = normalizeBookmarkUrl(input.url ?? '');
  const record = await prisma.bookmark.create({
    data: {
      title: title || fallbackTitleFromUrl(url),
      type: 'bookmark', url,
      faviconUrl: null,
      parentId,
      sortOrder: input.sort_order ?? await nextSortOrder(parentId)
    }
  });
  return toNode(record);
}

export async function updateBookmark(id: string, input: UpdateBookmarkInput): Promise<BookmarkNode> {
  const existing = await prisma.bookmark.findUnique({ where: { id } });
  if (!existing) throw new Error('Bookmark not found');

  const nextParentId = input.parent_id === undefined ? existing.parentId : input.parent_id;
  if (nextParentId) {
    if (nextParentId === id) throw new Error('A node cannot be its own parent');
    await assertParentFolder(nextParentId);
    if (await isDescendant(id, nextParentId)) throw new Error('A node cannot be moved into its own descendant');
  }

  let title = input.title === undefined ? existing.title : input.title.trim();
  if (existing.type === 'folder' && !title) throw new Error('Title is required');

  let url = input.url === undefined ? existing.url : input.url?.trim() || null;
  if (existing.type === 'bookmark' && !url) throw new Error('URL is required');

  // If URL changed, clear old favicon (will be re-fetched on display)
  let faviconData: any = {};
  if (existing.type === 'bookmark' && url && url !== existing.url) {
    url = normalizeBookmarkUrl(url);
    title = title || fallbackTitleFromUrl(url);
    faviconData = { faviconUrl: null, faviconExpiresAt: null, iconFailedAt: null };
  }

  const record = await prisma.bookmark.update({
    where: { id },
    data: { title, url: existing.type === 'folder' ? null : url, parentId: nextParentId ?? null, sortOrder: input.sort_order ?? existing.sortOrder, ...faviconData }
  });
  return toNode(record);
}

export async function removeBookmark(id: string) {
  const existing = await prisma.bookmark.findUnique({ where: { id } });
  if (!existing) throw new Error('Bookmark not found');
  await prisma.$transaction(async (tx) => { await deleteNode(id, tx); });
}

export async function searchBookmarks(query: string): Promise<BookmarkNode[]> {
  const q = query.trim();
  if (!q) return [];
  const records = await prisma.bookmark.findMany({
    where: { type: 'bookmark', OR: [{ title: { contains: q } }, { url: { contains: q } }] },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }]
  });
  return records.map(toNode);
}

// --- Import / Export ---
async function createImportedBranch(nodes: ImportedBookmarkNode[], parentId: string | null): Promise<number> {
  let imported = 0;
  let so = await nextSortOrder(parentId);
  for (const node of nodes) {
    const created = await prisma.bookmark.create({
      data: { title: node.title, type: node.type, url: node.type === 'bookmark' ? node.url : null, parentId, sortOrder: so }
    });
    imported += 1; so += 10;
    if (node.type === 'folder' && node.children.length > 0) imported += await createImportedBranch(node.children, created.id);
  }
  return imported;
}

export async function importBookmarkNodes(nodes: ImportedBookmarkNode[], sourceName?: string | null) {
  if (nodes.length === 0) return 0;
  const name = sourceName?.replace(/\.[^.]+$/, '').trim() || `导入环境 ${new Date().toLocaleString('zh-CN', { hour12: false })}`;
  const env = await prisma.bookmark.create({
    data: { title: name, type: 'folder', url: null, faviconUrl: null, faviconBase64: null, faviconMime: null, parentId: null, sortOrder: await nextSortOrder(null) }
  });
  return 1 + await createImportedBranch(nodes, env.id);
}

export async function reorderBookmarks(parentId: string | null, orderedIds: string[]): Promise<void> {
  await prisma.$transaction(orderedIds.map((id, i) => prisma.bookmark.update({ where: { id }, data: { sortOrder: (i + 1) * 10 } })));
}

export async function exportBookmarkHtmlByRoot(rootId: string | null) {
  const tree = await getBookmarkTree();
  if (!rootId) return createBookmarkHtml(tree);
  function find(nodes: BookmarkNode[]): BookmarkNode | null {
    for (const n of nodes) { if (n.id === rootId) return n; const c = find(n.children); if (c) return c; }
    return null;
  }
  const root = find(tree);
  if (!root) throw new Error('Export root not found');
  return createBookmarkHtml([root]);
}
