import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  createBookmark,
  exportBookmarkHtmlByRoot,
  getBookmarkTree,
  importBookmarkNodes,
  refreshBookmarkIconInBackground,
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
  sort_order: z.number().int().optional()
});

const updateSchema = z.object({
  title: z.string().optional(),
  url: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  sort_order: z.number().int().optional()
});

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected server error';
}

router.get('/tree', async (_req, res) => {
  try {
    res.json(await getBookmarkTree());
  } catch (error) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.get('/search', async (req, res) => {
  try {
    res.json(await searchBookmarks(String(req.query.q ?? '')));
  } catch (error) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.put('/reorder', async (req, res) => {
  try {
    const payload = reorderSchema.parse(req.body);
    await reorderBookmarks(payload.parent_id, payload.ordered_ids);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

router.post('/:id/refresh-icon', async (req, res) => {
  try {
    await refreshBookmarkIconInBackground(req.params.id);
    res.status(202).json({ ok: true });
  } catch (error) {
    res.status(404).json({ error: errorMessage(error) });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = createSchema.parse(req.body);
    res.status(201).json(await createBookmark(payload));
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const payload = updateSchema.parse(req.body);
    res.json(await updateBookmark(req.params.id, payload));
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await removeBookmark(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: errorMessage(error) });
  }
});

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const html =
      req.file?.buffer.toString('utf8') ??
      (typeof req.body === 'string' ? req.body : typeof req.body?.html === 'string' ? req.body.html : '');

    if (!html.trim()) {
      res.status(400).json({ error: 'Import file is required' });
      return;
    }

    const imported = await importBookmarkNodes(parseBookmarkHtml(html));
    res.status(201).json({ imported });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

router.get('/export', async (req, res) => {
  try {
    const rootId = typeof req.query.root_id === 'string' && req.query.root_id.trim() ? req.query.root_id.trim() : null;
    const html = await exportBookmarkHtmlByRoot(rootId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tree-bookmarks.html"');
    res.send(html);
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

export default router;
