import { Router, type IRouter } from "express";
import { randomBytes, pbkdf2 } from "crypto";
import { promisify } from "util";
import { db, usersTable, profileTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const pbkdf2Async = promisify(pbkdf2);
const router: IRouter = Router();

// Same format as CF Worker (PBKDF2) so passwords are cross-compatible
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await pbkdf2Async(password, salt, 100000, 32, "sha256");
  return `pbkdf2:${salt.toString("hex")}:${key.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = parts[2];
  const key = await pbkdf2Async(password, salt, 100000, 32, "sha256");
  return key.toString("hex") === expected;
}

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh huruf, angka, dan underscore"),
  password: z.string().min(6),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { email, username, password } = parsed.data;

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.email, email.toLowerCase()), eq(usersTable.username, username.toLowerCase())))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email atau username sudah digunakan" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  const [user] = await db
    .insert(usersTable)
    .values({ id: userId, email: email.toLowerCase(), username: username.toLowerCase(), passwordHash })
    .returning();

  await db.insert(profileTable).values({
    id: userId,
    userId,
    username: username.toLowerCase(),
    displayName: username,
    backgroundTheme: "grid",
    totalClicks: 0,
  });

  const token = signToken({ userId: user.id, email: user.email, username: user.username });
  res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid" });
    return;
  }

  const { emailOrUsername, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.email, emailOrUsername.toLowerCase()), eq(usersTable.username, emailOrUsername.toLowerCase())))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Email/username atau password salah" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Email/username atau password salah" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, username: user.username });
  res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  res.json({ id: user.userId, email: user.email, username: user.username });
});

export default router;
