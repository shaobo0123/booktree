import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "bookmarks" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "parent_id" TEXT,
      "title" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "url" TEXT,
      "favicon_url" TEXT,
      "favicon_base64" TEXT,
      "favicon_mime" TEXT,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL,
      CONSTRAINT "bookmarks_parent_id_fkey"
        FOREIGN KEY ("parent_id") REFERENCES "bookmarks" ("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "bookmarks_parent_id_sort_order_idx"
    ON "bookmarks" ("parent_id", "sort_order");
  `);

  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("bookmarks")`);
  const names = new Set(columns.map((column) => column.name));

  if (!names.has('favicon_url')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "bookmarks" ADD COLUMN "favicon_url" TEXT`);
  }
  if (!names.has('favicon_base64')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "bookmarks" ADD COLUMN "favicon_base64" TEXT`);
  }
  if (!names.has('favicon_mime')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "bookmarks" ADD COLUMN "favicon_mime" TEXT`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('SQLite schema is ready.');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
