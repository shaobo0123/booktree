import cors from 'cors';
import express from 'express';
import bookmarkRoutes from './routes/bookmarks.js';
import { prisma } from './db.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.text({ type: ['text/html', 'text/plain'], limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/bookmarks', bookmarkRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const server = app.listen(port, () => {
  console.log(`Bookmark API listening on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
