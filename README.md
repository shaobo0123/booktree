# Tree Bookmarks

Tree Bookmarks is an MVP online bookmark manager with a macOS Finder-style column tree.

## Project Structure

```text
.
├── client/                  # Vue 3 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── types/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   └── style.css
│   └── vite.config.ts
├── server/                  # Node.js + Express + TypeScript + Prisma
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── routes/
│       ├── services/
│       ├── utils/
│       ├── db.ts
│       └── index.ts
└── package.json
```

## Setup

```bash
npm install
npm run db:init
npm run dev
```

Frontend: http://localhost:5173

Backend: http://localhost:3000

## Useful Scripts

```bash
npm run dev          # Start frontend and backend
npm run build        # Build both apps
npm run db:init      # Create/update SQLite schema and seed demo data
npm run db:push      # Apply Prisma schema to SQLite
npm run db:seed      # Seed demo data
```

The SQLite database is stored at `server/prisma/dev.db`.
