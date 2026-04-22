// ============================================================
// LinkHub - Cloudflare Worker (Single File)
// 1. Ganti SUPABASE_SERVICE_ROLE_KEY dengan service_role key kamu
//    (Supabase Dashboard → Project Settings → API → service_role)
// 2. Ganti JWT_SECRET dengan random string panjang sesukamu
// 3. Deploy: paste file ini di Cloudflare Workers editor
// ============================================================

const SUPABASE_URL = "https://bgwkwlrkvbspycqsdeif.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "PASTE_SERVICE_ROLE_KEY_DI_SINI";
const JWT_SECRET = "PASTE_JWT_SECRET_DI_SINI";
const GITHUB_TOKEN = "PASTE_GITHUB_TOKEN_DI_SINI";
const GITHUB_REPO  = "elfarsaf-dev/lawuscape";

// ─── CORS ────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ─── SUPABASE REST ───────────────────────────────────────────
async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── JWT (Web Crypto) ────────────────────────────────────────
function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDec(str) {
  return Uint8Array.from(atob(str.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
}
async function hmacKey() {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function signJwt(payload) {
  const h = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const p = b64url(new TextEncoder().encode(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 604800, // 7 hari
  })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64url(sig)}`;
}
async function verifyJwt(token) {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new Error("Invalid token");
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(), b64urlDec(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw new Error("Invalid signature");
  const payload = JSON.parse(new TextDecoder().decode(b64urlDec(p)));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
  return payload;
}

// ─── PASSWORD (PBKDF2) ───────────────────────────────────────
async function hashPwd(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  const hex = arr => Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:${hex(salt)}:${hex(new Uint8Array(bits))}`;
}
async function verifyPwd(password, stored) {
  const [algo, saltHex, expectedHex] = stored.split(":");
  if (algo !== "pbkdf2") return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex === expectedHex;
}

// ─── AUTH HELPER ─────────────────────────────────────────────
async function getUser(request) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try { return await verifyJwt(auth.slice(7)); } catch { return null; }
}

// ─── RESPONSE MAPPERS ────────────────────────────────────────
function toProfile(r) {
  return { id: r.id, username: r.username, displayName: r.display_name, bio: r.bio ?? null,
    avatarUrl: r.avatar_url ?? null, backgroundTheme: r.background_theme ?? null,
    totalClicks: r.total_clicks ?? 0, createdAt: r.created_at };
}
function toLink(r) {
  return { id: r.id, title: r.title, url: r.url, icon: r.icon ?? null,
    clickCount: r.click_count ?? 0, sortOrder: r.sort_order ?? 0,
    isActive: r.is_active ?? true, createdAt: r.created_at };
}
function toStory(r) {
  return { id: r.id, text: r.text ?? null, mediaUrl: r.media_url ?? null,
    mediaType: r.media_type ?? null, createdAt: r.created_at, expiresAt: r.expires_at };
}

// ─── HANDLERS ────────────────────────────────────────────────
async function register(req) {
  const { email, username, password } = await req.json();
  if (!email || !username || !password) return json({ error: "Email, username, dan password wajib diisi" }, 400);
  if (password.length < 6) return json({ error: "Password minimal 6 karakter" }, 400);
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return json({ error: "Username hanya boleh huruf, angka, dan underscore (3-30 karakter)" }, 400);

  const existing = await sb(`/lh_users?or=(email.eq.${encodeURIComponent(email.toLowerCase())},username.eq.${encodeURIComponent(username.toLowerCase())})&limit=1`);
  if (existing?.length) return json({ error: "Email atau username sudah digunakan" }, 409);

  const userId = crypto.randomUUID();
  const passwordHash = await hashPwd(password);

  const [user] = await sb("/lh_users", { method: "POST", body: JSON.stringify({
    id: userId, email: email.toLowerCase(), username: username.toLowerCase(), password_hash: passwordHash,
  }) });
  await sb("/profile", { method: "POST", body: JSON.stringify({
    id: userId, user_id: userId, username: username.toLowerCase(),
    display_name: username, background_theme: "grid", total_clicks: 0,
  }) });

  const token = await signJwt({ userId, email: user.email, username: user.username });
  return json({ token, user: { id: userId, email: user.email, username: user.username } }, 201);
}

async function login(req) {
  const { emailOrUsername, password } = await req.json();
  if (!emailOrUsername || !password) return json({ error: "Data tidak valid" }, 400);
  const q = emailOrUsername.toLowerCase();
  const rows = await sb(`/lh_users?or=(email.eq.${encodeURIComponent(q)},username.eq.${encodeURIComponent(q)})&limit=1`);
  if (!rows?.length) return json({ error: "Email/username atau password salah" }, 401);
  const user = rows[0];
  if (user.password_hash.startsWith("$2b$") || user.password_hash.startsWith("$2a$")) {
    return json({ error: "LEGACY_HASH", needsReset: true }, 401);
  }
  if (!await verifyPwd(password, user.password_hash)) return json({ error: "Email/username atau password salah" }, 401);
  const token = await signJwt({ userId: user.id, email: user.email, username: user.username });
  return json({ token, user: { id: user.id, email: user.email, username: user.username } });
}

async function resetPassword(req) {
  const { emailOrUsername, newPassword } = await req.json();
  if (!emailOrUsername || !newPassword) return json({ error: "Data tidak lengkap" }, 400);
  if (newPassword.length < 6) return json({ error: "Password minimal 6 karakter" }, 400);
  const q = emailOrUsername.toLowerCase();
  const rows = await sb(`/lh_users?or=(email.eq.${encodeURIComponent(q)},username.eq.${encodeURIComponent(q)})&limit=1`);
  if (!rows?.length) return json({ error: "Akun tidak ditemukan" }, 404);
  const user = rows[0];
  if (!user.password_hash.startsWith("$2b$") && !user.password_hash.startsWith("$2a$")) {
    return json({ error: "Akun sudah menggunakan sistem terbaru. Gunakan login biasa." }, 400);
  }
  const newHash = await hashPwd(newPassword);
  await sb(`/lh_users?id=eq.${user.id}`, { method: "PATCH", body: JSON.stringify({ password_hash: newHash }) });
  return json({ success: true, message: "Password berhasil direset. Silakan login." });
}

async function profile(req) {
  const u = await getUser(req);
  if (!u) return json({ error: "Unauthorized" }, 401);
  if (req.method === "GET") {
    const rows = await sb(`/profile?user_id=eq.${u.userId}&limit=1`);
    if (!rows?.length) return json({ error: "Profile not found" }, 404);
    return json(toProfile(rows[0]));
  }
  if (req.method === "PUT") {
    const body = await req.json();
    const update = {};
    if (body.username !== undefined) update.username = body.username;
    if (body.displayName !== undefined) update.display_name = body.displayName;
    if (body.bio !== undefined) update.bio = body.bio;
    if (body.avatarUrl !== undefined) update.avatar_url = body.avatarUrl;
    if (body.backgroundTheme !== undefined) update.background_theme = body.backgroundTheme;
    const rows = await sb(`/profile?user_id=eq.${u.userId}`, { method: "PATCH", body: JSON.stringify(update) });
    if (!rows?.length) return json({ error: "Profile not found" }, 404);
    return json(toProfile(rows[0]));
  }
  return json({ error: "Method not allowed" }, 405);
}

async function links(req, linkId) {
  const u = await getUser(req);
  if (!u) return json({ error: "Unauthorized" }, 401);

  if (req.method === "GET" && !linkId) {
    const rows = await sb(`/links?user_id=eq.${u.userId}&order=sort_order.asc`);
    return json(rows?.map(toLink) ?? []);
  }
  if (req.method === "POST" && !linkId) {
    const body = await req.json();
    const maxRows = await sb(`/links?user_id=eq.${u.userId}&select=sort_order&order=sort_order.desc&limit=1`);
    const maxOrder = maxRows?.length ? Number(maxRows[0].sort_order ?? -1) : -1;
    const [link] = await sb("/links", { method: "POST", body: JSON.stringify({
      id: crypto.randomUUID(), user_id: u.userId, title: body.title, url: body.url,
      icon: body.icon ?? null, click_count: 0, sort_order: maxOrder + 1, is_active: body.isActive ?? true,
    }) });
    return json(toLink(link), 201);
  }
  if (req.method === "PUT" && linkId === "reorder") {
    const { ids } = await req.json();
    await Promise.all(ids.map((id, i) =>
      sb(`/links?id=eq.${id}&user_id=eq.${u.userId}`, { method: "PATCH", body: JSON.stringify({ sort_order: i }) })
    ));
    return json({ success: true });
  }
  if (req.method === "PUT" && linkId) {
    const body = await req.json();
    const update = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.url !== undefined) update.url = body.url;
    if (body.icon !== undefined) update.icon = body.icon;
    if (body.isActive !== undefined) update.is_active = body.isActive;
    if (body.sortOrder !== undefined) update.sort_order = body.sortOrder;
    const rows = await sb(`/links?id=eq.${linkId}&user_id=eq.${u.userId}`, { method: "PATCH", body: JSON.stringify(update) });
    if (!rows?.length) return json({ error: "Link not found" }, 404);
    return json(toLink(rows[0]));
  }
  if (req.method === "DELETE" && linkId) {
    await sb(`/links?id=eq.${linkId}&user_id=eq.${u.userId}`, { method: "DELETE" });
    return json({ success: true });
  }
  return json({ error: "Method not allowed" }, 405);
}

async function linkClick(linkId) {
  const rows = await sb(`/links?id=eq.${linkId}&select=click_count,user_id`);
  if (!rows?.length) return json({ error: "Link not found" }, 404);
  const link = rows[0];
  const newCount = Number(link.click_count ?? 0) + 1;
  await Promise.all([
    sb(`/links?id=eq.${linkId}`, { method: "PATCH", body: JSON.stringify({ click_count: newCount }) }),
    (async () => {
      const p = await sb(`/profile?user_id=eq.${link.user_id}&select=total_clicks`);
      await sb(`/profile?user_id=eq.${link.user_id}`, {
        method: "PATCH", body: JSON.stringify({ total_clicks: Number(p?.[0]?.total_clicks ?? 0) + 1 }),
      });
    })(),
  ]);
  return json({ success: true, clickCount: newCount });
}

async function stats(req) {
  const u = await getUser(req);
  if (!u) return json({ error: "Unauthorized" }, 401);
  const [all, top, profileRows] = await Promise.all([
    sb(`/links?user_id=eq.${u.userId}&select=id`),
    sb(`/links?user_id=eq.${u.userId}&order=click_count.desc&limit=5`),
    sb(`/profile?user_id=eq.${u.userId}&select=total_clicks`),
  ]);
  return json({ totalLinks: all?.length ?? 0, totalClicks: Number(profileRows?.[0]?.total_clicks ?? 0), topLinks: top?.map(toLink) ?? [] });
}

async function resetStats(req) {
  const u = await getUser(req);
  if (!u) return json({ error: "Unauthorized" }, 401);
  await Promise.all([
    sb(`/links?user_id=eq.${u.userId}`, { method: "PATCH", body: JSON.stringify({ click_count: 0 }) }),
    sb(`/profile?user_id=eq.${u.userId}`, { method: "PATCH", body: JSON.stringify({ total_clicks: 0 }) }),
  ]);
  return json({ success: true });
}

async function publicProfile(username) {
  const profiles = await sb(`/profile?username=eq.${encodeURIComponent(username.toLowerCase())}&limit=1`);
  if (!profiles?.length) return json({ error: "User not found" }, 404);
  const p = profiles[0];
  const nowIso = new Date().toISOString();
  const [lnks, sts] = await Promise.all([
    sb(`/links?user_id=eq.${p.user_id}&is_active=eq.true&order=sort_order.asc`),
    sb(`/lh_stories?user_id=eq.${p.user_id}&expires_at=gt.${nowIso}&order=created_at.desc`).catch(() => []),
  ]);
  return json({
    profile: toProfile(p),
    links: lnks?.map(toLink) ?? [],
    stories: sts?.map(toStory) ?? [],
  });
}

// ─── UPLOAD (proxy ke GitHub) ────────────────────────────────
async function upload(req) {
  try {
    const body = await req.json();
    if (!body?.content || !body?.fileName) return json({ success: false, error: "fileName & content wajib" }, 400);
    const safeName = String(body.fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}-${safeName}`;
    const path = `uploads/${fileName}`;
    const gh = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "nexvia-worker",
      },
      body: JSON.stringify({ message: "upload file", content: body.content }),
    });
    const data = await gh.json();
    if (!gh.ok) return json({ success: false, error: data.message || "Upload gagal" }, 500);
    const cdnUrl = `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/${path}`;
    return json({ success: true, content: { download_url: cdnUrl }, raw: data });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

// ─── STORIES (24 jam) ────────────────────────────────────────
async function stories(req, sid) {
  const u = await getUser(req);
  if (!u) return json({ error: "Unauthorized" }, 401);

  if (req.method === "GET" && !sid) {
    const nowIso = new Date().toISOString();
    const rows = await sb(`/lh_stories?user_id=eq.${u.userId}&expires_at=gt.${nowIso}&order=created_at.desc`);
    return json(rows?.map(toStory) ?? []);
  }
  if (req.method === "POST" && !sid) {
    const body = await req.json();
    if (!body.text && !body.mediaUrl) return json({ error: "Story harus berisi teks atau media" }, 400);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const [s] = await sb("/lh_stories", { method: "POST", body: JSON.stringify({
      id: crypto.randomUUID(),
      user_id: u.userId,
      text: body.text ?? null,
      media_url: body.mediaUrl ?? null,
      media_type: body.mediaType ?? null,
      expires_at: expiresAt,
    }) });
    return json(toStory(s), 201);
  }
  if (req.method === "DELETE" && sid) {
    await sb(`/lh_stories?id=eq.${sid}&user_id=eq.${u.userId}`, { method: "DELETE" });
    return json({ success: true });
  }
  return json({ error: "Method not allowed" }, 405);
}

// ─── MAIN ────────────────────────────────────────────────────
export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const path = new URL(request.url).pathname.replace(/^\/api/, "");
    try {
      if (path === "/healthz") return json({ status: "ok" });
      if (path === "/auth/register" && request.method === "POST") return register(request);
      if (path === "/auth/login" && request.method === "POST") return login(request);
      if (path === "/auth/reset-password" && request.method === "POST") return resetPassword(request);
      if (path === "/auth/me") return getUser(request).then(u => u ? json(u) : json({ error: "Unauthorized" }, 401));
      if (path === "/profile") return profile(request);
      if (path === "/stats/reset" && request.method === "POST") return resetStats(request);
      if (path === "/stats") return stats(request);
      if (path === "/upload" && request.method === "POST") return upload(request);
      if (path === "/stories") return stories(request);
      const sid = path.match(/^\/stories\/([^/]+)$/);
      if (sid) return stories(request, sid[1]);
      const click = path.match(/^\/links\/([^/]+)\/click$/);
      if (click && request.method === "POST") return linkClick(click[1]);
      const lid = path.match(/^\/links\/([^/]+)$/);
      if (lid) return links(request, lid[1]);
      if (path === "/links" || path === "/links/reorder") return links(request, path === "/links/reorder" ? "reorder" : undefined);
      const pub = path.match(/^\/public\/([^/]+)$/);
      if (pub && request.method === "GET") return publicProfile(pub[1]);
      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "Internal server error" }, 500);
    }
  },
};
