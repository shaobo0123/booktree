import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type DemoNode = {
  title: string;
  url?: string;
  children?: DemoNode[];
};

const envPath = join(import.meta.dir, "..", ".env");

function loadEnvFile() {
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

loadEnvFile();
process.chdir(join(import.meta.dir, ".."));

const { db, nowISO } = await import("../src/db.ts");

const demoTree: DemoNode[] = [
  {
    title: "官方文档",
    children: [
      {
        title: "前端框架",
        children: [
          { title: "React", url: "https://react.dev/" },
          { title: "Vue", url: "https://vuejs.org/" },
          { title: "Angular", url: "https://angular.dev/" },
          { title: "Svelte", url: "https://svelte.dev/" },
          { title: "Next.js", url: "https://nextjs.org/docs" },
          { title: "Nuxt", url: "https://nuxt.com/docs" },
          { title: "Vite", url: "https://vite.dev/" },
          { title: "Astro", url: "https://docs.astro.build/" },
          { title: "Solid", url: "https://docs.solidjs.com/" }
        ]
      },
      {
        title: "Web 平台",
        children: [
          { title: "MDN Web Docs", url: "https://developer.mozilla.org/" },
          { title: "web.dev", url: "https://web.dev/" },
          { title: "TypeScript", url: "https://www.typescriptlang.org/docs/" },
          { title: "Node.js", url: "https://nodejs.org/en/docs" },
          { title: "Deno", url: "https://docs.deno.com/" },
          { title: "Bun", url: "https://bun.sh/docs" }
        ]
      },
      {
        title: "UI 与样式",
        children: [
          { title: "Tailwind CSS", url: "https://tailwindcss.com/docs" },
          { title: "Radix UI", url: "https://www.radix-ui.com/" },
          { title: "shadcn/ui", url: "https://ui.shadcn.com/" },
          { title: "MUI", url: "https://mui.com/" },
          { title: "Ant Design", url: "https://ant.design/" }
        ]
      }
    ]
  },
  {
    title: "后端与云",
    children: [
      {
        title: "数据库",
        children: [
          { title: "PostgreSQL", url: "https://www.postgresql.org/docs/" },
          { title: "MySQL", url: "https://dev.mysql.com/doc/" },
          { title: "Redis", url: "https://redis.io/docs/latest/" },
          { title: "MongoDB", url: "https://www.mongodb.com/docs/" },
          { title: "SQLite", url: "https://www.sqlite.org/docs.html" },
          { title: "Prisma", url: "https://www.prisma.io/docs" }
        ]
      },
      {
        title: "DevOps",
        children: [
          { title: "Docker Docs", url: "https://docs.docker.com/" },
          { title: "Kubernetes", url: "https://kubernetes.io/docs/" },
          { title: "NGINX Docs", url: "https://docs.nginx.com/" },
          { title: "Terraform", url: "https://developer.hashicorp.com/terraform/docs" },
          { title: "GitHub Actions", url: "https://docs.github.com/actions" },
          { title: "Cloudflare Docs", url: "https://developers.cloudflare.com/" }
        ]
      },
      {
        title: "云平台",
        children: [
          { title: "AWS Docs", url: "https://docs.aws.amazon.com/" },
          { title: "Azure Docs", url: "https://learn.microsoft.com/azure/" },
          { title: "Google Cloud Docs", url: "https://cloud.google.com/docs" },
          { title: "Vercel Docs", url: "https://vercel.com/docs" },
          { title: "Netlify Docs", url: "https://docs.netlify.com/" }
        ]
      }
    ]
  },
  {
    title: "开发工具",
    children: [
      {
        title: "编辑器与协作",
        children: [
          { title: "Visual Studio Code", url: "https://code.visualstudio.com/docs" },
          { title: "Git", url: "https://git-scm.com/doc" },
          { title: "GitHub Docs", url: "https://docs.github.com/" },
          { title: "GitLab Docs", url: "https://docs.gitlab.com/" }
        ]
      },
      {
        title: "测试与质量",
        children: [
          { title: "Playwright", url: "https://playwright.dev/docs/intro" },
          { title: "Vitest", url: "https://vitest.dev/" },
          { title: "Jest", url: "https://jestjs.io/docs/getting-started" },
          { title: "Cypress", url: "https://docs.cypress.io/" },
          { title: "ESLint", url: "https://eslint.org/docs/latest/" },
          { title: "Prettier", url: "https://prettier.io/docs/" }
        ]
      },
      {
        title: "包管理",
        children: [
          { title: "npm", url: "https://docs.npmjs.com/" },
          { title: "pnpm", url: "https://pnpm.io/" },
          { title: "Yarn", url: "https://yarnpkg.com/" }
        ]
      }
    ]
  },
  {
    title: "AI 与数据",
    children: [
      {
        title: "AI 平台",
        children: [
          { title: "OpenAI Docs", url: "https://platform.openai.com/docs" },
          { title: "Anthropic Docs", url: "https://docs.anthropic.com/" },
          { title: "Google AI", url: "https://ai.google.dev/docs" },
          { title: "Hugging Face", url: "https://huggingface.co/docs" },
          { title: "LangChain", url: "https://js.langchain.com/docs/" },
          { title: "Ollama", url: "https://github.com/ollama/ollama" }
        ]
      },
      {
        title: "数据工具",
        children: [
          { title: "Pandas", url: "https://pandas.pydata.org/docs/" },
          { title: "NumPy", url: "https://numpy.org/doc/" },
          { title: "Matplotlib", url: "https://matplotlib.org/stable/" },
          { title: "Jupyter", url: "https://docs.jupyter.org/" }
        ]
      }
    ]
  },
  {
    title: "语言官方",
    children: [
      {
        title: "编程语言",
        children: [
          { title: "Python", url: "https://docs.python.org/3/" },
          { title: "Rust Book", url: "https://doc.rust-lang.org/book/" },
          { title: "Go", url: "https://go.dev/doc/" },
          { title: "Java", url: "https://docs.oracle.com/en/java/" },
          { title: "Kotlin", url: "https://kotlinlang.org/docs/" },
          { title: "Swift", url: "https://www.swift.org/documentation/" },
          { title: "PHP", url: "https://www.php.net/docs.php" },
          { title: "Ruby", url: "https://www.ruby-lang.org/en/documentation/" }
        ]
      }
    ]
  },
  {
    title: "设计系统",
    children: [
      {
        title: "设计规范",
        children: [
          { title: "Apple HIG", url: "https://developer.apple.com/design/human-interface-guidelines/" },
          { title: "Material Design", url: "https://m3.material.io/" },
          { title: "Microsoft Fluent", url: "https://fluent2.microsoft.design/" },
          { title: "Atlassian Design", url: "https://atlassian.design/" },
          { title: "Shopify Polaris", url: "https://polaris.shopify.com/" }
        ]
      }
    ]
  }
];

let sequence = 0;

function nextId() {
  sequence += 1;
  return `demo_${sequence.toString().padStart(4, "0")}`;
}

function insertNode(node: DemoNode, parentId: string | null, index: number): number {
  const id = nextId();
  const now = nowISO();
  const isBookmark = typeof node.url === "string";
  const sortOrder = (index + 1) * 10;

  insertStatement.run(
    id,
    parentId,
    node.title,
    isBookmark ? "bookmark" : "folder",
    node.url ?? null,
    null,
    null,
    null,
    null,
    sortOrder,
    "public",
    now,
    now
  );

  let count = 1;
  if (!isBookmark) {
    for (const [childIndex, child] of (node.children ?? []).entries()) {
      count += insertNode(child, id, childIndex);
    }
  }
  return count;
}

const insertStatement = db.prepare(`
  INSERT INTO bookmarks (
    id,
    parent_id,
    title,
    type,
    url,
    favicon_base64,
    favicon_mime,
    favicon_expires_at,
    icon_failed_at,
    sort_order,
    read_permission,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let inserted = 0;

db.transaction(() => {
  db.run("DELETE FROM bookmarks");
  for (const [index, node] of demoTree.entries()) {
    inserted += insertNode(node, null, index);
  }
})();

db.run("PRAGMA wal_checkpoint(TRUNCATE)");

const folders = db.query("SELECT COUNT(*) as count FROM bookmarks WHERE type = 'folder'").get() as { count: number };
const bookmarks = db.query("SELECT COUNT(*) as count FROM bookmarks WHERE type = 'bookmark'").get() as { count: number };

console.log(`Seeded official demo bookmarks: ${folders.count} folders, ${bookmarks.count} bookmarks, ${inserted} total nodes.`);
db.close();
