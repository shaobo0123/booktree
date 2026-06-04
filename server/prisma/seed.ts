import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.bookmark.deleteMany();

  const work = await prisma.bookmark.create({
    data: {
      title: '工作',
      type: 'folder',
      sortOrder: 10
    }
  });

  const docs = await prisma.bookmark.create({
    data: {
      title: '官方文档',
      type: 'folder',
      parentId: work.id,
      sortOrder: 10
    }
  });

  await prisma.bookmark.createMany({
    data: [
      {
        title: 'Vue 官方文档',
        type: 'bookmark',
        url: 'https://vuejs.org',
        parentId: docs.id,
        sortOrder: 10
      },
      {
        title: 'Prisma 官方文档',
        type: 'bookmark',
        url: 'https://www.prisma.io/docs',
        parentId: docs.id,
        sortOrder: 20
      },
      {
        title: '设计灵感',
        type: 'folder',
        sortOrder: 20
      },
      {
        title: 'MDN Web Docs',
        type: 'bookmark',
        url: 'https://developer.mozilla.org',
        parentId: work.id,
        sortOrder: 20
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
