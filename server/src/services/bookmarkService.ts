import { Prisma, type Bookmark } from '@prisma/client';
import { prisma } from '../db.js';
import type { ImportedBookmarkNode } from '../utils/bookmarkHtml.js';
import { createBookmarkHtml } from '../utils/bookmarkHtml.js';
import { fetchPageInfo } from '../utils/fetchPageInfo.js';

const FAVICON_SUCCESS_TTL = 3 * 24 * 60 * 60 * 1000;  // 3 days
const FAVICON_FAILED_TTL  = 30 * 1000;  // 30s — prevent rapid retries on persistent failures

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
  favicon_base64: string | null;
  favicon_mime: string | null;
  read_permission: 'public' | 'private';
  sort_order: number; created_at: string; updated_at: string;
  children: BookmarkNode[];
}

export interface CreateBookmarkInput {
  title?: string; type: BookmarkType; url?: string | null; parent_id?: string | null; sort_order?: number;
  read_permission?: 'public' | 'private';
}
export interface UpdateBookmarkInput {
  title?: string; url?: string | null; parent_id?: string | null; sort_order?: number;
  read_permission?: 'public' | 'private';
}

function toNode(record: Bookmark): BookmarkNode {
  const now = Date.now();

  // Check if favicon cache is still valid
  let faviconBase64: string | null = null;
  let faviconMime: string | null = null;

  if (record.type === 'bookmark' && record.faviconBase64 && record.faviconMime) {
    const expiresAt = record.faviconExpiresAt?.getTime();
    if (expiresAt && now < expiresAt) {
      faviconBase64 = record.faviconBase64;
      faviconMime = record.faviconMime;
    }
    // Expired → return nulls (icon will be white-letter fallback)
  }

  // Check if on failure cooldown
  if (!faviconBase64 && record.iconFailedAt) {
    if (now - record.iconFailedAt.getTime() < FAVICON_FAILED_TTL) {
      // Still in cooldown — remain null
    }
  }

  return {
    id: record.id, parent_id: record.parentId, title: record.title, type: record.type as BookmarkType,
    url: record.url,
    favicon_base64: faviconBase64,
    favicon_mime: faviconMime,
    read_permission: record.readPermission as 'public' | 'private',
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
  try {
    const hostname = new URL(url).hostname;
    if (!hostname) return '未命名书签';
    return hostname[0].toUpperCase();
  } catch { return '未命名书签'; }
}

interface ResolvedMeta {
  title: string;
  faviconBase64: string | null;
  faviconMime: string | null;
  faviconFailed: boolean;
}

/** Fetch page info and resolve title + favicon base64 */
async function resolvePageMeta(url: string, userTitle?: string): Promise<ResolvedMeta> {
  const pageInfo = await fetchPageInfo(url);
  return {
    title: userTitle || pageInfo.title || fallbackTitleFromUrl(url),
    faviconBase64: pageInfo.faviconBase64,
    faviconMime: pageInfo.faviconMime,
    faviconFailed: !pageInfo.faviconBase64,
  };
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

/** Recursively prune nodes that are not public — only keep branches where every node is public */
function filterPublicOnly(nodes: BookmarkNode[]): BookmarkNode[] {
  const result: BookmarkNode[] = [];
  for (const n of nodes) {
    if (n.read_permission !== 'public') continue;
    result.push({ ...n, children: filterPublicOnly(n.children) });
  }
  return result;
}

export async function getBookmarkTree(isAuthenticated = false): Promise<BookmarkNode[]> {
  // Fetch all records — building tree first, then filtering — so that a public
  // child of a private folder is never leaked as an orphan root.
  const records = await prisma.bookmark.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
  const byId = new Map<string, BookmarkNode>();
  const roots: BookmarkNode[] = [];
  for (const r of records) byId.set(r.id, toNode(r));
  for (const n of byId.values()) {
    if (n.parent_id && byId.has(n.parent_id)) byId.get(n.parent_id)!.children.push(n);
    else roots.push(n);
  }
  sortNodes(roots);
  if (!isAuthenticated) {
    return filterPublicOnly(roots);
  }
  return roots;
}

// Deduplicated in-flight favicon fetch by URL (on-demand, triggered by frontend)
const inFlightFavicons = new Map<string, Promise<{ favicon_base64: string | null; favicon_mime: string | null }>>();

export async function fetchBookmarkFavicon(bookmarkId: string): Promise<{ favicon_base64: string | null; favicon_mime: string | null }> {
  const bookmark = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });
  if (!bookmark || bookmark.type !== 'bookmark' || !bookmark.url) {
    return { favicon_base64: null, favicon_mime: null };
  }

  const now = Date.now();

  // Valid cached favicon → return immediately
  if (bookmark.faviconBase64 && bookmark.faviconMime && bookmark.faviconExpiresAt) {
    if (now < bookmark.faviconExpiresAt.getTime()) {
      return { favicon_base64: bookmark.faviconBase64, favicon_mime: bookmark.faviconMime };
    }
  }

  // On failure cooldown → skip
  if (bookmark.iconFailedAt && now - bookmark.iconFailedAt.getTime() < FAVICON_FAILED_TTL) {
    return { favicon_base64: null, favicon_mime: null };
  }

  // Already in-flight for this URL → join existing Promise
  const existing = inFlightFavicons.get(bookmark.url);
  if (existing) return existing;

  const promise = fetchAndCacheFavicon(bookmark.url);
  inFlightFavicons.set(bookmark.url, promise);
  try {
    return await promise;
  } finally {
    inFlightFavicons.delete(bookmark.url);
  }
}

async function fetchAndCacheFavicon(url: string): Promise<{ favicon_base64: string | null; favicon_mime: string | null }> {
  try {
    const pageInfo = await fetchPageInfo(url);
    const now = new Date();
    await prisma.bookmark.updateMany({
      where: { url },
      data: {
        faviconBase64: pageInfo.faviconBase64,
        faviconMime: pageInfo.faviconMime,
        faviconExpiresAt: pageInfo.faviconBase64 ? new Date(now.getTime() + FAVICON_SUCCESS_TTL) : null,
        iconFailedAt: pageInfo.faviconBase64 ? null : now,
      },
    });
    return { favicon_base64: pageInfo.faviconBase64, favicon_mime: pageInfo.faviconMime };
  } catch {
    return { favicon_base64: null, favicon_mime: null };
  }
}

export async function createBookmark(input: CreateBookmarkInput): Promise<BookmarkNode> {
  const title = input.title?.trim() ?? '';
  const parentId = input.parent_id ?? null;
  if (input.type !== 'folder' && input.type !== 'bookmark') throw new Error('Type must be folder or bookmark');
  await assertParentFolder(parentId);

  if (input.type === 'folder') {
    if (!title) throw new Error('Title is required');
    const r = await prisma.bookmark.create({
      data: { title, type: 'folder', url: null, parentId, sortOrder: input.sort_order ?? await nextSortOrder(parentId), readPermission: input.read_permission ?? 'public' }
    });
    return toNode(r);
  }

  const url = normalizeBookmarkUrl(input.url ?? '');
  const meta = await resolvePageMeta(url, title || undefined);
  const now = new Date();
  const record = await prisma.bookmark.create({
    data: {
      title: meta.title,
      type: 'bookmark', url,
      faviconBase64: meta.faviconBase64,
      faviconMime: meta.faviconMime,
      faviconExpiresAt: meta.faviconBase64 ? new Date(now.getTime() + FAVICON_SUCCESS_TTL) : null,
      iconFailedAt: meta.faviconFailed ? now : null,
      parentId,
      sortOrder: input.sort_order ?? await nextSortOrder(parentId),
      readPermission: input.read_permission ?? 'public'
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

  let faviconData: Record<string, unknown> = {};

  if (existing.type === 'bookmark' && url) {
    url = normalizeBookmarkUrl(url);
    const meta = await resolvePageMeta(url, title || undefined);
    title = meta.title;
    const now = new Date();
    faviconData = {
      faviconBase64: meta.faviconBase64,
      faviconMime: meta.faviconMime,
      faviconExpiresAt: meta.faviconBase64 ? new Date(now.getTime() + FAVICON_SUCCESS_TTL) : null,
      iconFailedAt: meta.faviconFailed ? now : null,
    };
  }

  const record = await prisma.bookmark.update({
    where: { id },
    data: {
      title,
      url: existing.type === 'folder' ? null : url,
      parentId: nextParentId ?? null,
      sortOrder: input.sort_order ?? existing.sortOrder,
      readPermission: input.read_permission ?? existing.readPermission,
      ...faviconData,
    }
  });
  return toNode(record);
}

export async function removeBookmark(id: string) {
  const existing = await prisma.bookmark.findUnique({ where: { id } });
  if (!existing) throw new Error('Bookmark not found');
  await prisma.$transaction(async (tx) => { await deleteNode(id, tx); });
}

export async function searchBookmarks(query: string, isAuthenticated = false): Promise<BookmarkNode[]> {
  const q = query.trim();
  if (!q) return [];
  const records = await prisma.bookmark.findMany({
    where: { type: 'bookmark', OR: [{ title: { contains: q } }, { url: { contains: q } }] },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }]
  });
  if (isAuthenticated) return records.map(r => toNode(r));

  // When not authenticated, exclude bookmarks whose ancestor chain has any private node
  const allBookmarks = await prisma.bookmark.findMany({ select: { id: true, parentId: true, readPermission: true } });
  const permMap = new Map(allBookmarks.map(b => [b.id, { parentId: b.parentId, readPermission: b.readPermission }]));

  function hasPrivateAncestor(bookmarkId: string | null): boolean {
    while (bookmarkId) {
      const entry = permMap.get(bookmarkId);
      if (!entry) return false;
      if (entry.readPermission !== 'public') return true;
      bookmarkId = entry.parentId;
    }
    return false;
  }

  return records
    .filter(r => r.readPermission === 'public' && !hasPrivateAncestor(r.parentId))
    .map(r => toNode(r));
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
    data: { title: name, type: 'folder', url: null, parentId: null, sortOrder: await nextSortOrder(null) }
  });
  return 1 + await createImportedBranch(nodes, env.id);
}

export async function reorderBookmarks(parentId: string | null, orderedIds: string[]): Promise<void> {
  await prisma.$transaction(orderedIds.map((id, i) => prisma.bookmark.update({ where: { id }, data: { sortOrder: (i + 1) * 10 } })));
}

export async function exportBookmarkHtmlByRoot(rootId: string | null, isAuthenticated = false) {
  const tree = await getBookmarkTree(isAuthenticated);
  if (!rootId) return createBookmarkHtml(tree);
  function find(nodes: BookmarkNode[]): BookmarkNode | null {
    for (const n of nodes) { if (n.id === rootId) return n; const c = find(n.children); if (c) return c; }
    return null;
  }
  const root = find(tree);
  if (!root) throw new Error('Export root not found');
  return createBookmarkHtml([root]);
}
