import { db, generateId, nowISO } from "../db.js";
import { createBookmarkHtml, parseBookmarkHtml, type ImportedBookmarkNode } from "../utils/bookmarkHtml.js";
import { fetchPageInfo } from "../utils/fetchPageInfo.js";

const FAVICON_SUCCESS_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days
const FAVICON_FAILED_TTL = 30 * 1000; // 30s

// --- Types ---
export type BookmarkType = "folder" | "bookmark";

export interface BookmarkNode {
  id: string; parent_id: string | null; title: string; type: BookmarkType;
  url: string | null;
  favicon_base64: string | null;
  favicon_mime: string | null;
  read_permission: "public" | "private";
  sort_order: number; created_at: string; updated_at: string;
  children: BookmarkNode[];
}

export interface CreateBookmarkInput {
  title?: string; type: BookmarkType; url?: string | null; parent_id?: string | null;
  sort_order?: number; read_permission?: "public" | "private";
}

export interface UpdateBookmarkInput {
  title?: string; url?: string | null; parent_id?: string | null;
  sort_order?: number; read_permission?: "public" | "private";
}

// --- Helpers ---
interface BookmarkRow {
  id: string; parent_id: string | null; title: string; type: string;
  url: string | null; favicon_base64: string | null; favicon_mime: string | null;
  favicon_expires_at: string | null; icon_failed_at: string | null;
  read_permission: string; sort_order: number; created_at: string; updated_at: string;
}

function rowToNode(row: BookmarkRow): BookmarkNode {
  const now = Date.now();
  let faviconBase64: string | null = null;
  let faviconMime: string | null = null;

  if (row.type === "bookmark" && row.favicon_base64 && row.favicon_mime) {
    const expiresAt = row.favicon_expires_at ? new Date(row.favicon_expires_at).getTime() : 0;
    if (expiresAt && now < expiresAt) {
      faviconBase64 = row.favicon_base64;
      faviconMime = row.favicon_mime;
    }
  }

  return {
    id: row.id,
    parent_id: row.parent_id,
    title: row.title,
    type: row.type as BookmarkType,
    url: row.url,
    favicon_base64: faviconBase64,
    favicon_mime: faviconMime,
    read_permission: row.read_permission as "public" | "private",
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    children: []
  };
}

function sortNodes(nodes: BookmarkNode[]) {
  nodes.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
  for (const n of nodes) sortNodes(n.children);
}

function buildTree(rows: BookmarkRow[]): BookmarkNode[] {
  const byId = new Map<string, BookmarkNode>();
  const roots: BookmarkNode[] = [];
  for (const r of rows) byId.set(r.id, rowToNode(r));
  for (const n of byId.values()) {
    if (n.parent_id && byId.has(n.parent_id)) {
      byId.get(n.parent_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  }
  sortNodes(roots);
  return roots;
}

function filterPublicOnly(nodes: BookmarkNode[]): BookmarkNode[] {
  const result: BookmarkNode[] = [];
  for (const n of nodes) {
    if (n.read_permission !== "public") continue;
    result.push({ ...n, children: filterPublicOnly(n.children) });
  }
  return result;
}

// --- URL helpers ---
function normalizeBookmarkUrl(value: string): string {
  const raw = value.trim();
  if (!raw) throw new Error("URL is required for bookmarks");
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  const u = new URL(withProtocol);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Bookmark URL must use http or https");
  return u.toString();
}

function fallbackTitleFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (!hostname) return "未命名书签";
    return hostname[0].toUpperCase();
  } catch { return "未命名书签"; }
}

interface ResolvedMeta {
  title: string;
  faviconBase64: string | null;
  faviconMime: string | null;
  faviconFailed: boolean;
}

async function resolvePageMeta(url: string, userTitle?: string): Promise<ResolvedMeta> {
  const pageInfo = await fetchPageInfo(url);
  return {
    title: userTitle || pageInfo.title || fallbackTitleFromUrl(url),
    faviconBase64: pageInfo.faviconBase64,
    faviconMime: pageInfo.faviconMime,
    faviconFailed: !pageInfo.faviconBase64,
  };
}

function nextSortOrder(parentId: string | null): number {
  const row = db.query("SELECT MAX(sort_order) as max_sort FROM bookmarks WHERE parent_id IS ?").get(parentId ?? null) as { max_sort: number | null };
  return (row?.max_sort ?? 0) + 10;
}

// --- Validation ---
function assertParentFolder(parentId: string | null | undefined): void {
  if (!parentId) return;
  const p = db.query("SELECT type FROM bookmarks WHERE id = ?").get(parentId) as { type: string } | null;
  if (!p) throw new Error("Parent folder not found");
  if (p.type !== "folder") throw new Error("Parent must be a folder");
}

function isDescendant(nodeId: string, possibleDescendantId: string): boolean {
  const children = db.query("SELECT id FROM bookmarks WHERE parent_id = ?").all(nodeId) as { id: string }[];
  for (const c of children) {
    if (c.id === possibleDescendantId || isDescendant(c.id, possibleDescendantId)) return true;
  }
  return false;
}

// --- CRUD ---
export function getBookmarkTree(isAuthenticated = false): BookmarkNode[] {
  const rows = db.query("SELECT * FROM bookmarks ORDER BY sort_order ASC, title ASC").all() as BookmarkRow[];
  const tree = buildTree(rows);
  if (!isAuthenticated) return filterPublicOnly(tree);
  return tree;
}

function deleteNode(id: string): void {
  const children = db.query("SELECT id FROM bookmarks WHERE parent_id = ?").all(id) as { id: string }[];
  for (const c of children) deleteNode(c.id);
  db.run("DELETE FROM bookmarks WHERE id = ?", [id]);
}

export function createBookmark(input: CreateBookmarkInput): BookmarkNode {
  const title = input.title?.trim() ?? "";
  const parentId = input.parent_id ?? null;
  if (input.type !== "folder" && input.type !== "bookmark") throw new Error("Type must be folder or bookmark");
  assertParentFolder(parentId);

  const id = generateId();
  const now = nowISO();
  const sortOrder = input.sort_order ?? nextSortOrder(parentId);
  const readPermission = input.read_permission ?? "public";

  if (input.type === "folder") {
    if (!title) throw new Error("Title is required");
    db.run(
      "INSERT INTO bookmarks (id, parent_id, title, type, url, sort_order, read_permission, created_at, updated_at) VALUES (?, ?, ?, 'folder', NULL, ?, ?, ?, ?)",
      [id, parentId, title, sortOrder, readPermission, now, now]
    );
    return rowToNode(db.query("SELECT * FROM bookmarks WHERE id = ?").get(id) as BookmarkRow);
  }

  // Bookmark — fetch page meta synchronously via async wrapper
  const url = normalizeBookmarkUrl(input.url ?? "");

  // We need to await the async page fetch ... but this is a sync function.
  // For Bun, we can use a promise-based approach with the route being async.
  // Actually let's handle this at the route level — createBookmark needs to be async.
  // But we can't change the return type now. Let's refactor: make this async.
  throw new Error("Use createBookmarkAsync for bookmarks");
}

export async function createBookmarkAsync(input: CreateBookmarkInput): Promise<BookmarkNode> {
  const title = input.title?.trim() ?? "";
  const parentId = input.parent_id ?? null;
  if (input.type !== "folder" && input.type !== "bookmark") throw new Error("Type must be folder or bookmark");
  assertParentFolder(parentId);

  const id = generateId();
  const now = nowISO();
  const sortOrder = input.sort_order ?? nextSortOrder(parentId);
  const readPermission = input.read_permission ?? "public";

  if (input.type === "folder") {
    if (!title) throw new Error("Title is required");
    db.run(
      "INSERT INTO bookmarks (id, parent_id, title, type, url, sort_order, read_permission, created_at, updated_at) VALUES (?, ?, ?, 'folder', NULL, ?, ?, ?, ?)",
      [id, parentId, title, sortOrder, readPermission, now, now]
    );
    return rowToNode(db.query("SELECT * FROM bookmarks WHERE id = ?").get(id) as BookmarkRow);
  }

  const url = normalizeBookmarkUrl(input.url ?? "");
  const meta = await resolvePageMeta(url, title || undefined);
  const expiresAt = meta.faviconBase64 ? new Date(Date.now() + FAVICON_SUCCESS_TTL).toISOString() : null;
  const failedAt = meta.faviconFailed ? now : null;

  db.run(
    `INSERT INTO bookmarks (id, parent_id, title, type, url, favicon_base64, favicon_mime, favicon_expires_at, icon_failed_at, sort_order, read_permission, created_at, updated_at)
     VALUES (?, ?, ?, 'bookmark', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, parentId, meta.title, url, meta.faviconBase64, meta.faviconMime, expiresAt, failedAt, sortOrder, readPermission, now, now]
  );
  return rowToNode(db.query("SELECT * FROM bookmarks WHERE id = ?").get(id) as BookmarkRow);
}

export async function updateBookmark(id: string, input: UpdateBookmarkInput): Promise<BookmarkNode> {
  const existing = db.query("SELECT * FROM bookmarks WHERE id = ?").get(id) as BookmarkRow | null;
  if (!existing) throw new Error("Bookmark not found");

  const nextParentId = input.parent_id === undefined ? existing.parent_id : input.parent_id;
  if (nextParentId) {
    if (nextParentId === id) throw new Error("A node cannot be its own parent");
    assertParentFolder(nextParentId);
    if (isDescendant(id, nextParentId)) throw new Error("A node cannot be moved into its own descendant");
  }

  let title = input.title === undefined ? existing.title : input.title.trim();
  if (existing.type === "folder" && !title) throw new Error("Title is required");

  let url = input.url === undefined ? existing.url : input.url?.trim() || null;
  if (existing.type === "bookmark" && !url) throw new Error("URL is required");

  const now = nowISO();
  let faviconBase64 = existing.favicon_base64;
  let faviconMime = existing.favicon_mime;
  let faviconExpiresAt = existing.favicon_expires_at;
  let iconFailedAt = existing.icon_failed_at;

  if (existing.type === "bookmark" && url) {
    url = normalizeBookmarkUrl(url);
    const meta = await resolvePageMeta(url, title || undefined);
    title = meta.title;
    faviconBase64 = meta.faviconBase64;
    faviconMime = meta.faviconMime;
    faviconExpiresAt = meta.faviconBase64 ? new Date(Date.now() + FAVICON_SUCCESS_TTL).toISOString() : null;
    iconFailedAt = meta.faviconFailed ? now : null;
  }

  const sortOrder = input.sort_order ?? existing.sort_order;
  const readPermission = input.read_permission ?? existing.read_permission;

  db.run(
    `UPDATE bookmarks SET title=?, url=?, parent_id=?, sort_order=?, read_permission=?,
     favicon_base64=?, favicon_mime=?, favicon_expires_at=?, icon_failed_at=?, updated_at=?
     WHERE id=?`,
    [title, existing.type === "folder" ? null : url, nextParentId, sortOrder, readPermission,
     faviconBase64, faviconMime, faviconExpiresAt, iconFailedAt, now, id]
  );

  return rowToNode(db.query("SELECT * FROM bookmarks WHERE id = ?").get(id) as BookmarkRow);
}

export function removeBookmark(id: string): void {
  const existing = db.query("SELECT id FROM bookmarks WHERE id = ?").get(id);
  if (!existing) throw new Error("Bookmark not found");
  deleteNode(id);
}

export function searchBookmarks(query: string, isAuthenticated = false): BookmarkNode[] {
  const q = query.trim();
  if (!q) return [];

  const rows = db.query(
    "SELECT * FROM bookmarks WHERE type = 'bookmark' AND (title LIKE ? OR url LIKE ?) ORDER BY sort_order ASC, title ASC"
  ).all(`%${q}%`, `%${q}%`) as BookmarkRow[];

  if (isAuthenticated) return rows.map(r => rowToNode(r));

  // Filter by ancestor chain
  const allBookmarks = db.query("SELECT id, parent_id, read_permission FROM bookmarks").all() as {
    id: string; parent_id: string | null; read_permission: string;
  }[];
  const permMap = new Map(allBookmarks.map(b => [b.id, { parentId: b.parent_id, readPermission: b.read_permission }]));

  function hasPrivateAncestor(bookmarkId: string | null): boolean {
    while (bookmarkId) {
      const entry = permMap.get(bookmarkId);
      if (!entry) return false;
      if (entry.readPermission !== "public") return true;
      bookmarkId = entry.parentId;
    }
    return false;
  }

  return rows
    .filter(r => r.read_permission === "public" && !hasPrivateAncestor(r.parent_id))
    .map(r => rowToNode(r));
}

export function reorderBookmarks(parentId: string | null, orderedIds: string[]): void {
  const stmt = db.prepare("UPDATE bookmarks SET sort_order = ?, updated_at = ? WHERE id = ?");
  const now = nowISO();
  const tx = db.transaction((ids: string[]) => {
    for (let i = 0; i < ids.length; i++) {
      stmt.run((i + 1) * 10, now, ids[i]);
    }
  });
  tx(orderedIds);
}

// --- Import / Export ---
function createImportedBranch(nodes: ImportedBookmarkNode[], parentId: string | null): number {
  let imported = 0;
  let so = nextSortOrder(parentId);
  for (const node of nodes) {
    const id = generateId();
    const now = nowISO();
    db.run(
      "INSERT INTO bookmarks (id, parent_id, title, type, url, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, parentId, node.title, node.type, node.type === "bookmark" ? node.url : null, so, now, now]
    );
    imported += 1;
    so += 10;
    if (node.type === "folder" && node.children.length > 0) {
      imported += createImportedBranch(node.children, id);
    }
  }
  return imported;
}

export function importBookmarkNodes(nodes: ImportedBookmarkNode[], sourceName?: string | null): number {
  if (nodes.length === 0) return 0;
  const name = sourceName?.replace(/\.[^.]+$/, "").trim() || `导入环境 ${new Date().toLocaleString("zh-CN", { hour12: false })}`;
  const id = generateId();
  const now = nowISO();
  const so = nextSortOrder(null);
  db.run(
    "INSERT INTO bookmarks (id, parent_id, title, type, url, sort_order, created_at, updated_at) VALUES (?, NULL, ?, 'folder', NULL, ?, ?, ?)",
    [id, name, so, now, now]
  );
  return 1 + createImportedBranch(nodes, id);
}

export function exportBookmarkHtmlByRoot(rootId: string | null, isAuthenticated = false): string {
  const tree = getBookmarkTree(isAuthenticated);
  if (!rootId) return createBookmarkHtml(tree);

  function find(nodes: BookmarkNode[]): BookmarkNode | null {
    for (const n of nodes) {
      if (n.id === rootId) return n;
      const c = find(n.children);
      if (c) return c;
    }
    return null;
  }
  const root = find(tree);
  if (!root) throw new Error("Export root not found");
  return createBookmarkHtml([root]);
}

// --- Favicon ---
const inFlightFavicons = new Map<string, Promise<{ favicon_base64: string | null; favicon_mime: string | null }>>();

async function fetchAndCacheFavicon(url: string): Promise<{ favicon_base64: string | null; favicon_mime: string | null }> {
  try {
    const pageInfo = await fetchPageInfo(url);
    const now = nowISO();
    const expiresAt = pageInfo.faviconBase64 ? new Date(Date.now() + FAVICON_SUCCESS_TTL).toISOString() : null;
    const failedAt = pageInfo.faviconBase64 ? null : now;

    db.run(
      "UPDATE bookmarks SET favicon_base64=?, favicon_mime=?, favicon_expires_at=?, icon_failed_at=?, updated_at=? WHERE url=?",
      [pageInfo.faviconBase64, pageInfo.faviconMime, expiresAt, failedAt, now, url]
    );
    return { favicon_base64: pageInfo.faviconBase64, favicon_mime: pageInfo.faviconMime };
  } catch {
    return { favicon_base64: null, favicon_mime: null };
  }
}

export async function fetchBookmarkFavicon(bookmarkId: string): Promise<{ favicon_base64: string | null; favicon_mime: string | null }> {
  const bookmark = db.query("SELECT * FROM bookmarks WHERE id = ?").get(bookmarkId) as BookmarkRow | null;
  if (!bookmark || bookmark.type !== "bookmark" || !bookmark.url) {
    return { favicon_base64: null, favicon_mime: null };
  }

  const now = Date.now();

  if (bookmark.favicon_base64 && bookmark.favicon_mime && bookmark.favicon_expires_at) {
    if (now < new Date(bookmark.favicon_expires_at).getTime()) {
      return { favicon_base64: bookmark.favicon_base64, favicon_mime: bookmark.favicon_mime };
    }
  }

  if (bookmark.icon_failed_at && now - new Date(bookmark.icon_failed_at).getTime() < FAVICON_FAILED_TTL) {
    return { favicon_base64: null, favicon_mime: null };
  }

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

export function clearFavicons(): void {
  const now = nowISO();
  db.run(
    "UPDATE bookmarks SET favicon_base64=NULL, favicon_mime=NULL, favicon_expires_at=NULL, icon_failed_at=NULL, updated_at=?",
    [now]
  );
}
