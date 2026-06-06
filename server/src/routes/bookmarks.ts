import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../db.js';
import { optionalAuth, requireAuth, verifyToken } from '../auth.js';
import {
  createBookmark,
  exportBookmarkHtmlByRoot,
  fetchBookmarkFavicon,
  getBookmarkTree,
  importBookmarkNodes,
  removeBookmark,
  reorderBookmarks,
  searchBookmarks,
  updateBookmark
} from '../services/bookmarkService.js';
import { parseBookmarkHtml } from '../utils/bookmarkHtml.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const reorderSchema = z.object({
  parent_id: z.string().nullable(),
  ordered_ids: z.array(z.string()).min(1)
});

const createSchema = z.object({
  title: z.string().optional(),
  type: z.enum(['folder', 'bookmark']),
  url: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
  read_permission: z.enum(['public', 'private']).optional()
});

const updateSchema = z.object({
  title: z.string().optional(),
  url: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
  read_permission: z.enum(['public', 'private']).optional()
});

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected server error';
}

// --- Read-only routes (no auth required, but filtered when not logged in) ---

router.get('/tree', optionalAuth, async (req, res) => {
  try {
    res.json(await getBookmarkTree(!!req.user));
  } catch (error) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.get('/search', optionalAuth, async (req, res) => {
  try {
    res.json(await searchBookmarks(String(req.query.q ?? ''), !!req.user));
  } catch (error) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.get('/:id/favicon', async (req, res) => {
  try {
    res.json(await fetchBookmarkFavicon(req.params.id));
  } catch (error) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

// --- Write routes (auth required) ---

router.put('/reorder', requireAuth, async (req, res) => {
  try {
    const payload = reorderSchema.parse(req.body);
    await reorderBookmarks(payload.parent_id, payload.ordered_ids);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const payload = createSchema.parse(req.body);
    res.status(201).json(await createBookmark(payload));
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const payload = updateSchema.parse(req.body);
    res.json(await updateBookmark(req.params.id, payload));
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await removeBookmark(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: errorMessage(error) });
  }
});

router.post('/import', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const html =
      req.file?.buffer.toString('utf8') ??
      (typeof req.body === 'string' ? req.body : typeof req.body?.html === 'string' ? req.body.html : '');

    if (!html.trim()) {
      res.status(400).json({ error: 'Import file is required' });
      return;
    }

    const imported = await importBookmarkNodes(parseBookmarkHtml(html), req.file?.originalname);
    res.status(201).json({ imported });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

router.post('/clear-favicons', requireAuth, async (_req, res) => {
  try {
    await prisma.bookmark.updateMany({
      data: { faviconBase64: null, faviconMime: null, faviconExpiresAt: null, iconFailedAt: null }
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.get('/export', async (req, res) => {
  try {
    // Support token via query param (for file download) or Authorization header
    let isAuth = false;
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const payload = verifyToken(header.slice(7));
      if (payload) { req.user = payload; isAuth = true; }
    }
    if (!isAuth && typeof req.query.token === 'string') {
      const payload = verifyToken(req.query.token);
      if (payload) { req.user = payload; isAuth = true; }
    }
    if (!isAuth) {
      res.status(401).json({ error: '请先登录' });
      return;
    }

    const rootId = typeof req.query.root_id === 'string' && req.query.root_id.trim() ? req.query.root_id.trim() : null;
    const html = await exportBookmarkHtmlByRoot(rootId, true);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tree-bookmarks.html"');
    res.send(html);
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

export default router;
