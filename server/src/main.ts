import { ensureAdminUser } from "./auth.js";
import { handleRequest } from "./routes.js";

const port = Number(process.env.PORT ?? 3000);

// Ensure admin user exists before starting
await ensureAdminUser();

const server = Bun.serve({
  port,
  fetch(req) {
    return handleRequest(req);
  },
});

console.log(`Bookmark API (Bun) listening on http://localhost:${server.port}`);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  server.stop();
  process.exit(0);
});
