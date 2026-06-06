import { createHmac, randomBytes } from "node:crypto";
import { db, generateId, nowISO } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "booktree-dev-secret-change-in-production";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

export interface JwtPayload {
  userId: string;
  username: string;
  exp: number;
}

// --- Password ---
export async function ensureAdminUser(): Promise<void> {
  const existing = db.query("SELECT id FROM users WHERE username = 'admin'").get();
  if (existing) return;

  const hash = await Bun.password.hash(ADMIN_PASSWORD, { algorithm: "bcrypt", cost: 10 });
  const id = generateId();
  const now = nowISO();
  db.run(
    "INSERT INTO users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [id, "admin", hash, now, now]
  );
  console.log("[auth] Created default admin user (username: admin)");
}

export async function verifyPassword(password: string): Promise<{ userId: string; username: string } | null> {
  const user = db.query("SELECT id, username, password_hash FROM users WHERE username = 'admin'").get() as {
    id: string; username: string; password_hash: string;
  } | null;
  if (!user) return null;

  const valid = await Bun.password.verify(password, user.password_hash, "bcrypt");
  if (!valid) return null;

  return { userId: user.id, username: user.username };
}

// --- JWT ---
function base64url(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("base64url");
}

export function signToken(payload: Omit<JwtPayload, "exp">): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const header = base64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64url(Buffer.from(JSON.stringify({ ...payload, exp })));
  const sig = base64url(
    createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, bodyB64, sigB64] = parts;

    // Verify signature
    const expectedSig = base64url(
      createHmac("sha256", JWT_SECRET).update(`${headerB64}.${bodyB64}`).digest()
    );
    if (sigB64 !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(bodyB64, "base64url").toString("utf8")) as JwtPayload & { iat?: number };

    // Check expiration
    if (payload.exp && payload.exp < Date.now()) return null;

    return { userId: payload.userId, username: payload.username, exp: payload.exp };
  } catch {
    return null;
  }
}

// --- Request helpers ---
export function getAuthToken(req: Request): string | null {
  // Check Authorization header
  const header = req.headers.get("Authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  // Check query param (for file downloads)
  const url = new URL(req.url);
  const tokenParam = url.searchParams.get("token");
  if (tokenParam) return tokenParam;
  return null;
}

export function getAuthUser(req: Request): JwtPayload | null {
  const token = getAuthToken(req);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(req: Request): JwtPayload {
  const user = getAuthUser(req);
  if (!user) throw new AuthError("请先登录");
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
