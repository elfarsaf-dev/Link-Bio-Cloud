/**
 * LinkHub - Cloudflare Worker
 * Menggunakan Supabase REST API + Web Crypto untuk JWT & password hashing
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
}

// ─── CORS ────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── SUPABASE ────────────────────────────────────────────────────────────────

function sb(env: Env, path: string, options: RequestInit = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  });
}

async function sbJson<T = unknown>(env: Env, path: string, options: RequestInit = {}): Promise<T> {
  const res = await sb(env, path, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── JWT (Web Crypto API — no npm needed) ────────────────────────────────────

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64url(new TextEncoder().encode(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  })));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${base64url(sig)}`;
}

async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown>> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");
  const key = await getKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC", key,
    base64urlDecode(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!valid) throw new Error("Invalid signature");
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[1])));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
  return payload;
}

// ─── PASSWORD HASHING (PBKDF2 via Web Crypto) ────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key, 256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const salt = new Uint8Array(parts[1].match(/.{2}/g)!.map(h => parseInt(h, 16)));
  const expected = parts[2];
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key, 256
  );
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex === expected;
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────

async function getUser(request: Request, env: Env): Promise<{ userId: string; email: string; username: string } | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = await verifyJwt(auth.slice(7), env.JWT_SECRET);
    return { userId: payload.userId as string, email: payload.email as string, username: payload.username as string };
  } catch {
    return null;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function toProfileResponse(row: Record<string, unknown>) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio ?? null,
    avatarUrl: row.avatar_url ?? null,
    backgroundTheme: row.background_theme ?? null,
    totalClicks: row.total_clicks ?? 0,
    createdAt: row.created_at,
  };
}

function toLinkResponse(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    icon: row.icon ?? null,
    clickCount: row.click_count ?? 0,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  };
}

// ─── HANDLERS ────────────────────────────────────────────────────────────────

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const { email, username, password } = body as { email: string; username: string; password: string };

  if (!email || !username || !password) return json({ error: "Email, username, dan password wajib diisi" }, 400);
  if (password.length < 6) return json({ error: "Password minimal 6 karakter" }, 400);
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return json({ error: "Username hanya boleh huruf, angka, dan underscore (3-30 karakter)" }, 400);

  const existing = await sbJson<unknown[]>(env,
    `/lh_users?or=(email.eq.${encodeURIComponent(email.toLowerCase())},username.eq.${encodeURIComponent(username.toLowerCase())})&limit=1`,
    { method: "GET" }
  );
  if (Array.isArray(existing) && existing.length > 0) {
    return json({ error: "Email atau username sudah digunakan" }, 409);
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  const [user] = await sbJson<Record<string, unknown>[]>(env, "/lh_users", {
    method: "POST",
    body: JSON.stringify({ id: userId, email: email.toLowerCase(), username: username.toLowerCase(), password_hash: passwordHash }),
  });

  await sbJson(env, "/profile", {
    method: "POST",
    body: JSON.stringify({
      id: userId,
      user_id: userId,
      username: username.toLowerCase(),
      display_name: username,
      background_theme: "grid",
      total_clicks: 0,
    }),
  });

  const token = await signJwt({ userId, email: user.email, username: user.username }, env.JWT_SECRET);
  return json({ token, user: { id: userId, email: user.email, username: user.username } }, 201);
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const { emailOrUsername, password } = body as { emailOrUsername: string; password: string };
  if (!emailOrUsername || !password) return json({ error: "Data tidak valid" }, 400);

  const q = emailOrUsername.toLowerCase();
  const rows = await sbJson<Record<string, unknown>[]>(env,
    `/lh_users?or=(email.eq.${encodeURIComponent(q)},username.eq.${encodeURIComponent(q)})&limit=1`
  );
  if (!rows?.length) return json({ error: "Email/username atau password salah" }, 401);

  const user = rows[0];
  const valid = await verifyPassword(password, user.password_hash as string);
  if (!valid) return json({ error: "Email/username atau password salah" }, 401);

  const token = await signJwt({ userId: user.id, email: user.email, username: user.username }, env.JWT_SECRET);
  return json({ token, user: { id: user.id, email: user.email, username: user.username } });
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const user = await getUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);
  return json({ id: user.userId, email: user.email, username: user.username });
}

async function handleProfile(request: Request, env: Env): Promise<Response> {
  const user = await getUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  if (request.method === "GET") {
    const rows = await sbJson<Record<string, unknown>[]>(env, `/profile?user_id=eq.${user.userId}&limit=1`);
    if (!rows?.length) return json({ error: "Profile not found" }, 404);
    return json(toProfileResponse(rows[0]));
  }

  if (request.method === "PUT") {
    const body = await request.json() as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.username !== undefined) update.username = body.username;
    if (body.displayName !== undefined) update.display_name = body.displayName;
    if (body.bio !== undefined) update.bio = body.bio;
    if (body.avatarUrl !== undefined) update.avatar_url = body.avatarUrl;
    if (body.backgroundTheme !== undefined) update.background_theme = body.backgroundTheme;

    const rows = await sbJson<Record<string, unknown>[]>(env, `/profile?user_id=eq.${user.userId}`, {
      method: "PATCH", body: JSON.stringify(update),
    });
    if (!rows?.length) return json({ error: "Profile not found" }, 404);
    return json(toProfileResponse(rows[0]));
  }

  return json({ error: "Method not allowed" }, 405);
}

async function handleLinks(request: Request, env: Env, linkId?: string): Promise<Response> {
  const user = await getUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  if (request.method === "GET" && !linkId) {
    const links = await sbJson<Record<string, unknown>[]>(env, `/links?user_id=eq.${user.userId}&order=sort_order.asc`);
    return json(Array.isArray(links) ? links.map(toLinkResponse) : []);
  }

  if (request.method === "POST" && !linkId) {
    const body = await request.json() as Record<string, unknown>;
    const maxRows = await sbJson<Record<string, unknown>[]>(env,
      `/links?user_id=eq.${user.userId}&select=sort_order&order=sort_order.desc&limit=1`
    );
    const maxOrder = maxRows?.length ? Number(maxRows[0].sort_order ?? -1) : -1;
    const [link] = await sbJson<Record<string, unknown>[]>(env, "/links", {
      method: "POST",
      body: JSON.stringify({
        id: crypto.randomUUID(),
        user_id: user.userId,
        title: body.title,
        url: body.url,
        icon: body.icon ?? null,
        click_count: 0,
        sort_order: maxOrder + 1,
        is_active: body.isActive ?? true,
      }),
    });
    return json(toLinkResponse(link), 201);
  }

  if (request.method === "PUT" && linkId === "reorder") {
    const body = await request.json() as { ids: string[] };
    await Promise.all(body.ids.map((id, index) =>
      sbJson(env, `/links?id=eq.${id}&user_id=eq.${user.userId}`, {
        method: "PATCH", body: JSON.stringify({ sort_order: index }),
      })
    ));
    return json({ success: true });
  }

  if (request.method === "PUT" && linkId) {
    const body = await request.json() as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.url !== undefined) update.url = body.url;
    if (body.icon !== undefined) update.icon = body.icon;
    if (body.isActive !== undefined) update.is_active = body.isActive;
    if (body.sortOrder !== undefined) update.sort_order = body.sortOrder;

    const rows = await sbJson<Record<string, unknown>[]>(env,
      `/links?id=eq.${linkId}&user_id=eq.${user.userId}`, {
      method: "PATCH", body: JSON.stringify(update),
    });
    if (!rows?.length) return json({ error: "Link not found" }, 404);
    return json(toLinkResponse(rows[0]));
  }

  if (request.method === "DELETE" && linkId) {
    await sbJson(env, `/links?id=eq.${linkId}&user_id=eq.${user.userId}`, { method: "DELETE" });
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, 405);
}

async function handleLinkClick(env: Env, linkId: string): Promise<Response> {
  const rows = await sbJson<Record<string, unknown>[]>(env, `/links?id=eq.${linkId}&select=click_count,user_id`);
  if (!rows?.length) return json({ error: "Link not found" }, 404);

  const link = rows[0];
  const newCount = Number(link.click_count ?? 0) + 1;

  await Promise.all([
    sbJson(env, `/links?id=eq.${linkId}`, { method: "PATCH", body: JSON.stringify({ click_count: newCount }) }),
    (async () => {
      const profileRows = await sbJson<Record<string, unknown>[]>(env,
        `/profile?user_id=eq.${link.user_id}&select=total_clicks`
      );
      const total = Number(profileRows?.[0]?.total_clicks ?? 0) + 1;
      await sbJson(env, `/profile?user_id=eq.${link.user_id}`, {
        method: "PATCH", body: JSON.stringify({ total_clicks: total }),
      });
    })(),
  ]);

  return json({ success: true, clickCount: newCount });
}

async function handleStats(request: Request, env: Env): Promise<Response> {
  const user = await getUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const [allLinks, topLinks, profileRows] = await Promise.all([
    sbJson<Record<string, unknown>[]>(env, `/links?user_id=eq.${user.userId}&select=id`),
    sbJson<Record<string, unknown>[]>(env, `/links?user_id=eq.${user.userId}&order=click_count.desc&limit=5`),
    sbJson<Record<string, unknown>[]>(env, `/profile?user_id=eq.${user.userId}&select=total_clicks`),
  ]);

  return json({
    totalLinks: allLinks?.length ?? 0,
    totalClicks: Number(profileRows?.[0]?.total_clicks ?? 0),
    topLinks: Array.isArray(topLinks) ? topLinks.map(toLinkResponse) : [],
  });
}

async function handleResetStats(request: Request, env: Env): Promise<Response> {
  const user = await getUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  await Promise.all([
    sbJson(env, `/links?user_id=eq.${user.userId}`, {
      method: "PATCH",
      body: JSON.stringify({ click_count: 0 }),
    }),
    sbJson(env, `/profile?user_id=eq.${user.userId}`, {
      method: "PATCH",
      body: JSON.stringify({ total_clicks: 0 }),
    }),
  ]);

  return json({ success: true });
}

async function handlePublic(env: Env, username: string): Promise<Response> {
  const profiles = await sbJson<Record<string, unknown>[]>(env,
    `/profile?username=eq.${encodeURIComponent(username.toLowerCase())}&limit=1`
  );
  if (!profiles?.length) return json({ error: "User not found" }, 404);

  const profile = profiles[0];
  const links = await sbJson<Record<string, unknown>[]>(env,
    `/links?user_id=eq.${profile.user_id}&is_active=eq.true&order=sort_order.asc`
  );

  return json({ profile: toProfileResponse(profile), links: Array.isArray(links) ? links.map(toLinkResponse) : [] });
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, "");

    try {
      if (path === "/healthz") return json({ status: "ok" });

      // Auth
      if (path === "/auth/register" && request.method === "POST") return handleRegister(request, env);
      if (path === "/auth/login" && request.method === "POST") return handleLogin(request, env);
      if (path === "/auth/me" && request.method === "GET") return handleMe(request, env);

      // Profile
      if (path === "/profile") return handleProfile(request, env);

      // Stats
      if (path === "/stats/reset" && request.method === "POST") return handleResetStats(request, env);
      if (path === "/stats") return handleStats(request, env);

      // Links
      const clickMatch = path.match(/^\/links\/([^/]+)\/click$/);
      if (clickMatch && request.method === "POST") return handleLinkClick(env, clickMatch[1]);

      const linkIdMatch = path.match(/^\/links\/([^/]+)$/);
      if (linkIdMatch) return handleLinks(request, env, linkIdMatch[1]);

      if (path === "/links" || path === "/links/reorder") {
        return handleLinks(request, env, path === "/links/reorder" ? "reorder" : undefined);
      }

      // Public profile
      const publicMatch = path.match(/^\/public\/([^/]+)$/);
      if (publicMatch && request.method === "GET") return handlePublic(env, publicMatch[1]);

      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "Internal server error" }, 500);
    }
  },
};
