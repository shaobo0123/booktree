import type { JwtPayload } from "./auth.js";
import { getAuthUser, requireAuth, signToken, verifyPassword } from "./auth.js";
import {
  batchDeleteBookmarks,
  batchMoveBookmarks,
  batchUpdatePermission,
  clearFavicons,
  createBookmarkAsync,
  exportBookmarkHtmlByRoot,
  fetchBookmarkFavicon,
  getBookmarkTree,
  importBookmarkNodes,
  removeBookmark,
  reorderBookmarks,
  searchBookmarks,
  updateBookmark,
  type CreateBookmarkInput,
  type UpdateBookmarkInput
} from "./services/bookmarkService.js";
import { parseBookmarkHtml } from "./utils/bookmarkHtml.js";

type Handler = (req: Request, user: JwtPayload | null, params: Record<string, string>) => Promise<Response> | Response;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function getQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const u = new URL(url);
  u.searchParams.forEach((v, k) => { params[k] = v; });
  return params;
}

// Helper: parse request body based on content-type
async function parseBody(req: Request): Promise<unknown> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    return await req.formData();
  }
  if (ct.includes("application/json")) {
    return await req.json();
  }
  return await req.text();
}

// --- Route table ---
interface Route {
  method: string;
  pattern: URLPattern;
  handler: (req: Request, user: JwtPayload | null, params: Record<string, string>) => Promise<Response>;
}

// URLPattern is available in Bun
const routes: Route[] = [];

function addRoute(method: string, pathname: string, handler: Handler) {
  routes.push({
    method,
    pattern: new URLPattern({ pathname }),
    handler
  });
}

// --- Health ---
addRoute("GET", "/api/health", () => json({ ok: true }));

// --- Auth ---
addRoute("POST", "/api/auth/login", async (req) => {
  try {
    const body = await req.json() as { password?: string };
    if (!body.password) return error("请输入密码");
    const user = await verifyPassword(body.password);
    if (!user) return error("密码错误", 401);
    const token = signToken(user);
    return json({ token, username: user.username });
  } catch (e) {
    return error(e instanceof Error ? e.message : "登录失败", 500);
  }
});

addRoute("GET", "/api/auth/status", (_req, user) => {
  if (!user) return error("请先登录", 401);
  return json({ username: user.username });
});

// --- Bookmarks: read ---
addRoute("GET", "/api/bookmarks/tree", (req) => {
  try {
    const user = getAuthUser(req);
    return json(getBookmarkTree(!!user));
  } catch (e) {
    return error(e instanceof Error ? e.message : "Unexpected error", 500);
  }
});

addRoute("GET", "/api/bookmarks/search", (req) => {
  try {
    const q = getQueryParams(req.url).q ?? "";
    const user = getAuthUser(req);
    return json(searchBookmarks(q, !!user));
  } catch (e) {
    return error(e instanceof Error ? e.message : "Unexpected error", 500);
  }
});

addRoute("GET", "/api/bookmarks/:id/favicon", async (_req, _user, params) => {
  try {
    return json(await fetchBookmarkFavicon(params.id));
  } catch (e) {
    return error(e instanceof Error ? e.message : "Unexpected error", 500);
  }
});

// --- Bookmarks: write (require auth) ---
addRoute("POST", "/api/bookmarks", async (req, user) => {
  if (!user) return error("请先登录", 401);
  try {
    const body = await req.json() as CreateBookmarkInput;
    return json(await createBookmarkAsync(body), 201);
  } catch (e) {
    return error(e instanceof Error ? e.message : "创建失败");
  }
});

addRoute("PUT", "/api/bookmarks/reorder", async (req, user) => {
  if (!user) return error("请先登录", 401);
  try {
    const body = await req.json() as { parent_id: string | null; ordered_ids: string[] };
    reorderBookmarks(body.parent_id, body.ordered_ids);
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "排序失败");
  }
});

addRoute("PUT", "/api/bookmarks/:id", async (req, user, params) => {
  if (!user) return error("请先登录", 401);
  try {
    const body = await req.json() as UpdateBookmarkInput;
    return json(await updateBookmark(params.id, body));
  } catch (e) {
    return error(e instanceof Error ? e.message : "更新失败");
  }
});

addRoute("DELETE", "/api/bookmarks/:id", (req, user, params) => {
  if (!user) return error("请先登录", 401);
  try {
    removeBookmark(params.id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return error(e instanceof Error ? e.message : "删除失败", 404);
  }
});

// Batch operations
addRoute("POST", "/api/bookmarks/batch-delete", async (req, user) => {
  if (!user) return error("请先登录", 401);
  try {
    const body = await req.json() as { ids: string[] };
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return error("ids array is required");
    }
    batchDeleteBookmarks(body.ids);
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "批量删除失败");
  }
});

addRoute("POST", "/api/bookmarks/batch-move", async (req, user) => {
  if (!user) return error("请先登录", 401);
  try {
    const body = await req.json() as { ids: string[]; target_parent_id: string | null };
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return error("ids array is required");
    }
    batchMoveBookmarks(body.ids, body.target_parent_id ?? null);
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "批量移动失败");
  }
});

addRoute("POST", "/api/bookmarks/batch-permission", async (req, user) => {
  if (!user) return error("请先登录", 401);
  try {
    const body = await req.json() as { ids: string[]; read_permission: "public" | "private" };
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return error("ids array is required");
    }
    if (body.read_permission !== "public" && body.read_permission !== "private") {
      return error("read_permission must be public or private");
    }
    batchUpdatePermission(body.ids, body.read_permission);
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "批量修改权限失败");
  }
});

addRoute("POST", "/api/bookmarks/import", async (req, user) => {
  if (!user) return error("请先登录", 401);
  try {
    const ct = req.headers.get("content-type") ?? "";
    let html = "";

    if (ct.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (file instanceof File) {
        html = await file.text();
      }
    } else {
      const body = await req.text();
      try {
        const parsed = JSON.parse(body);
        html = typeof parsed.html === "string" ? parsed.html : body;
      } catch {
        html = body;
      }
    }

    if (!html.trim()) return error("Import file is required");
    const imported = importBookmarkNodes(parseBookmarkHtml(html));
    return json({ imported }, 201);
  } catch (e) {
    return error(e instanceof Error ? e.message : "导入失败");
  }
});

addRoute("POST", "/api/bookmarks/clear-favicons", (_req, user) => {
  if (!user) return error("请先登录", 401);
  try {
    clearFavicons();
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "清除失败", 500);
  }
});

addRoute("GET", "/api/bookmarks/export", (req) => {
  const user = getAuthUser(req);
  if (!user) return error("请先登录", 401);
  try {
    const params = getQueryParams(req.url);
    const rootId = params.root_id?.trim() || null;
    const html = exportBookmarkHtmlByRoot(rootId, true);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": 'attachment; filename="tree-bookmarks.html"'
      }
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "导出失败");
  }
});

// --- Router ---
const STATIC_DIR = process.env.SERVE_STATIC || null;
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // CORS headers
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  for (const route of routes) {
    if (route.method !== req.method) continue;

    const match = route.pattern.exec(url);
    if (match) {
      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(match.pathname.groups)) {
        params[key] = value ?? "";
      }
      const user = getAuthUser(req);
      const res = await route.handler(req, user, params);

      for (const [key, value] of Object.entries(corsHeaders)) {
        if (!res.headers.has(key)) {
          res.headers.set(key, value);
        }
      }
      return res;
    }
  }

  // Static file serving (production mode)
  if (STATIC_DIR && req.method === "GET") {
    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(STATIC_DIR + filePath);
    if (await file.exists()) {
      const ext = "." + (filePath.split(".").pop() ?? "");
      return new Response(file, {
        headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" }
      });
    }
    // SPA fallback
    const index = Bun.file(STATIC_DIR + "/index.html");
    if (await index.exists()) {
      return new Response(index, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
  }

  return error("Not found", 404);
}
