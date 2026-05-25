// Copyright (c) 2026 Eduardo Emiliano Alaniz - AllSafe Security Solutions
// SPDX-License-Identifier: AGPL-3.0-only
// https://github.com/allsafe-ar/heimdall-community

"use strict";
require("dotenv").config();

const express    = require("express");
const http       = require("http");
const https      = require("https");
const { Server } = require("socket.io");
const path       = require("path");
const fs         = require("fs");
const mysql      = require("mysql2/promise");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const helmet     = require("helmet");
const cors       = require("cors");
const geoip      = require("geoip-lite");
const rateLimit  = require("express-rate-limit");

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT        = parseInt(process.env.PORT        || "3005");
const JWT_SECRET  = process.env.JWT_SECRET           || "CHANGE_IN_PRODUCTION";
const DB_HOST     = process.env.DB_HOST              || "localhost";
const DB_USER     = process.env.DB_USER              || "heimdall";
const DB_PASS     = process.env.DB_PASSWORD          || "";
const DB_NAME     = process.env.DB_NAME              || "heimdall_db";
const CORS_ORIGIN = process.env.CORS_ORIGIN          || (process.env.NODE_ENV === "production" ? false : "http://localhost:5180");

if (!JWT_SECRET || JWT_SECRET === "CHANGE_IN_PRODUCTION" || JWT_SECRET.length < 16) {
  console.error("[Heimdall] FATAL: JWT_SECRET no configurado en .env");
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && !process.env.DB_PASSWORD) {
  console.error("[Heimdall] FATAL: DB_PASSWORD no configurado en .env para producción");
  process.exit(1);
}

// ─── Database ──────────────────────────────────────────────────────────────────
const db    = mysql.createPool({ host: DB_HOST, user: DB_USER, password: DB_PASS, database: DB_NAME, waitForConnections: true, connectionLimit: 10 });
const qRun  = async (sql, p = []) => { const [r]   = await db.execute(sql, p); return r; };
const qRow  = async (sql, p = []) => { const [[r]] = await db.execute(sql, p); return r; };
const qRows = async (sql, p = []) => { const [r]   = await db.execute(sql, p); return r; };

async function logAudit(userId, action, detail = '') {
  try { await qRun("INSERT INTO audit_log (user_id, action, detail) VALUES (?,?,?)", [userId, action, detail]); } catch {}
}

// ─── GeoIP ────────────────────────────────────────────────────────────────────
function geoLookup(rawIp) {
  const ip  = (rawIp || "").replace(/^::ffff:/, "").split(",")[0].trim();
  const geo = geoip.lookup(ip) || {};
  return { ip, country: geo.country || "??", city: geo.city || "" };
}

function flag(code) {
  if (!code || code.length !== 2) return "🌐";
  const [a, b] = [...code.toUpperCase()];
  if (a < 'A' || a > 'Z' || b < 'A' || b > 'Z') return "🌐";
  return String.fromCodePoint(0x1F1E6 + a.charCodeAt(0) - 65, 0x1F1E6 + b.charCodeAt(0) - 65);
}

// ─── Event classifier ─────────────────────────────────────────────────────────
const SCAN_PATHS = new Set([
  "/.env", "/.git/config", "/.git/HEAD", "/wp-admin", "/wp-login.php",
  "/admin", "/phpinfo.php", "/config.php", "/backup", "/.htaccess",
  "/server-status", "/actuator/env", "/actuator/health", "/manager/html",
  "/phpmyadmin", "/pma", "/.aws/credentials", "/etc/passwd",
  "/proc/self/environ", "/xmlrpc.php", "/shell.php", "/.DS_Store",
  "/config/database.php", "/api/swagger", "/swagger-ui.html",
  "/.well-known/security.txt", "/robots.txt", "/sitemap.xml", "/favicon.ico",
  "/login.php", "/administrator", "/user/login", "/jenkins",
]);

const KNOWN_SCANNERS = [
  "nmap", "masscan", "zgrab", "shodan", "censys", "nuclei", "sqlmap",
  "nikto", "dirbuster", "gobuster", "wfuzz", "hydra", "medusa",
  "python-requests", "curl/", "go-http-client", "libwww-perl",
  "scrapy", "wget/", "zgrab2", "zmap",
];

const REAL_BROWSER_UA = /Mozilla\/5\.0.*(?:Chrome|Firefox|Safari|Gecko|Edge|Trident)/i;

function classifyHttp(method, urlPath, ua) {
  const uaLow = (ua || "").toLowerCase();
  // Known automated scanners/tools — classify before anything else
  if (KNOWN_SCANNERS.some(s => uaLow.includes(s))) return "BOT";
  if (/bot|crawl|spider|scraper/i.test(uaLow)) return "BOT";
  // Path-based checks take priority over browser UA (bots spoof real browser UAs)
  if (SCAN_PATHS.has(urlPath)) return "SCAN";
  if (/\.\.|%2e%2e|%252e|\/etc\/|\/proc\//i.test(urlPath)) return "SCAN";
  // Non-browser POST to login endpoints → brute-force tool
  if (method === "POST" && /login|auth|session|signin/i.test(urlPath)) return "BRUTE";
  // Only classify as human if using a real browser AND not hitting recon paths
  if (REAL_BROWSER_UA.test(ua || "")) return "HUMAN";
  return "RECON";
}

function threatScore(type) {
  return { BRUTE: 80, PORTSCAN: 70, SCAN: 55, BOT: 40, RECON: 20, HUMAN: 30 }[type] ?? 10;
}

// ─── Express + Socket.io ──────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: CORS_ORIGIN, credentials: true },
});

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: CORS_ORIGIN, credentials: true, methods: ["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","Authorization"] }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const apiLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10,  standardHeaders: true, legacyHeaders: false, message: { error: "Demasiados intentos. Intentá de nuevo en 15 minutos." } });
app.use("/heimdall/api/", apiLimiter);

// Socket.io auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No autorizado"));
  try { socket.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { next(new Error("Token inválido")); }
});

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES   = ["generic", "wordpress", "cpanel", "microsoft"];
let activeTemplate = "generic";

function serveTemplate(res, name) {
  const file = path.join(__dirname, "templates", `${name}.html`);
  if (fs.existsSync(file)) return res.sendFile(file);
  res.send(`<html><body style="background:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><h2>Login</h2></body></html>`);
}

// ─── Event logging + broadcast ────────────────────────────────────────────────
async function logEvent({ rawIp, type, method = "", urlPath = "", detail = "", port = null, ua = "" }) {
  const geo   = geoLookup(rawIp);
  const score = threatScore(type);
  const ts    = new Date();
  const ev    = {
    ip:           geo.ip,
    country:      geo.country,
    city:         geo.city,
    flag:         flag(geo.country),
    type,
    method,
    path:         urlPath,
    detail:       (detail || "").slice(0, 500),
    port,
    ua:           (ua || "").slice(0, 300),
    threat_score: score,
    ts:           ts.toISOString(),
  };
  try {
    await qRun(
      "INSERT INTO events (ip, country, city, type, method, path, detail, port, user_agent, threat_score, ts) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [ev.ip, ev.country, ev.city, ev.type, ev.method, ev.path, ev.detail, ev.port, ev.ua, ev.threat_score, ts]
    );
  } catch (e) { console.error("[log]", e.message); }
  io.emit("event", ev);
  return ev;
}

// ─── TOTP ─────────────────────────────────────────────────────────────────────
const crypto = require("crypto");

function verifyTOTP(secret, token) {
  function base32decode(s) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    s = s.toUpperCase().replace(/=+$/, "");
    let bits = 0, val = 0;
    const out = [];
    for (const c of s) {
      const idx = alphabet.indexOf(c);
      if (idx < 0) continue;
      val = (val << 5) | idx;
      bits += 5;
      if (bits >= 8) { out.push((val >>> (bits - 8)) & 0xFF); bits -= 8; }
    }
    return Buffer.from(out);
  }
  const key  = base32decode(secret);
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let i = -2; i <= 2; i++) {
    const t   = step + i;
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(t / 0x100000000), 0);
    buf.writeUInt32BE(t >>> 0, 4);
    const hmac   = crypto.createHmac("sha1", key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code   = ((hmac[offset] & 0x7f) << 24 | hmac[offset+1] << 16 | hmac[offset+2] << 8 | hmac[offset+3]) % 1_000_000;
    if (code.toString().padStart(6, "0") === String(token)) return true;
  }
  return false;
}

// ─── Password policy ──────────────────────────────────────────────────────────
function validatePassword(p) {
  if (!p || p.length < 8)      return "Mínimo 8 caracteres";
  if (!/[A-Z]/.test(p))        return "Debe contener al menos una mayúscula";
  if (!/[0-9]/.test(p))        return "Debe contener al menos un número";
  if (!/[^A-Za-z0-9]/.test(p)) return "Debe contener al menos un carácter especial";
  return null;
}

// ─── Dashboard auth ───────────────────────────────────────────────────────────
const authDash = async (req, res, next) => {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return res.status(401).json({ error: "No autorizado" });
  try {
    const decoded = jwt.verify(h.slice(7), JWT_SECRET);
    const user = await qRow("SELECT enabled, token_version FROM users WHERE id = ?", [decoded.id]);
    if (!user || !user.enabled) return res.status(401).json({ error: "Cuenta bloqueada" });
    if ((user.token_version || 0) !== (decoded.tokenVersion || 0))
      return res.status(401).json({ error: "Sesión inválida — iniciá sesión nuevamente" });
    req.user = decoded;
    next();
  } catch { res.status(401).json({ error: "Token inválido" }); }
};

const authAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acceso denegado" });
  next();
};

// ─── IP helper ────────────────────────────────────────────────────────────────
function clientIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRAP ROUTES  (must be declared before /heimdall)
// ═══════════════════════════════════════════════════════════════════════════════

// Serve honeypot assets on main app too (needed when port 80 is taken by nginx)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get("/",          (req, res) => serveTemplate(res, activeTemplate));
app.get("/login",     (req, res) => serveTemplate(res, activeTemplate));
app.get("/index.html",(req, res) => serveTemplate(res, activeTemplate));

// Capture login attempts — never authenticate, always delay + reject
app.post(["/api/auth/login", "/login", "/wp-login.php", "/admin/login", "/user/login"], async (req, res) => {
  const ip   = clientIp(req);
  const ua   = req.headers["user-agent"] || "";
  const body = req.body || {};
  const user = (body.username || body.user || body.email || body.log || "").slice(0, 100);
  const pass = (body.password || body.pass || body.pwd || "").slice(0, 100);
  const detail = user ? `${user}:${pass}` : JSON.stringify(body).slice(0, 200);
  const type = REAL_BROWSER_UA.test(ua) ? "HUMAN" : "BRUTE";
  await logEvent({ rawIp: ip, type, method: "POST", urlPath: req.path, detail, ua });
  await new Promise(r => setTimeout(r, 600 + Math.random() * 700));
  res.status(401).json({ error: "Usuario o contraseña incorrectos." });
});

// Catch-all trap — log every unknown request
app.use(async (req, res, next) => {
  if (req.path.startsWith("/heimdall")) return next();
  const ip   = clientIp(req);
  const ua   = req.headers["user-agent"] || "";
  const type = classifyHttp(req.method, req.path, ua);
  await logEvent({ rawIp: ip, type, method: req.method, urlPath: req.path, detail: ua.slice(0, 200), ua });
  // Return the trap page — keeps attacker engaged
  serveTemplate(res, activeTemplate);
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD ROUTES  /heimdall/*
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/heimdall/api/auth/login", authLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Datos requeridos" });
  const user = await qRow("SELECT * FROM users WHERE username = ?", [username]);
  if (!user) return res.status(401).json({ error: "Credenciales incorrectas" });
  if (user.enabled === 0 || user.enabled === false)
    return res.status(403).json({ error: "Cuenta bloqueada" });
  if (user.locked_until && new Date(user.locked_until) > new Date())
    return res.status(429).json({ error: "Cuenta bloqueada temporalmente por demasiados intentos fallidos" });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const attempts = (user.failed_attempts || 0) + 1;
    if (attempts >= 5) {
      const until = new Date(Date.now() + 15 * 60 * 1000);
      await qRun("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?", [attempts, until, user.id]);
    } else {
      await qRun("UPDATE users SET failed_attempts = ? WHERE id = ?", [attempts, user.id]);
    }
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }
  await qRun("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?", [user.id]);
  if (user.totp_secret) {
    return res.json({ needs2fa: true, userId: user.id, nombre: user.nombre || user.username, role: user.role });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role || "admin", nombre: user.nombre || "", tokenVersion: user.token_version || 0 },
    JWT_SECRET, { expiresIn: "24h" }
  );
  await logAudit(user.id, "login", `Login desde ${clientIp(req)}`);
  res.json({ token, username: user.username, role: user.role });
});

app.get("/heimdall/api/stats", authDash, async (req, res) => {
  const [[{ total }]]      = await db.execute("SELECT COUNT(*) AS total FROM events");
  const [[{ unique_ips }]] = await db.execute("SELECT COUNT(DISTINCT ip) AS unique_ips FROM events");
  const [[{ today }]]      = await db.execute("SELECT COUNT(*) AS today FROM events WHERE DATE(ts) = CURDATE()");
  const [[topIpRow]]       = await db.execute("SELECT ip, ANY_VALUE(country) AS country, ANY_VALUE(city) AS city, COUNT(*) AS hits FROM events GROUP BY ip ORDER BY hits DESC LIMIT 1");
  const [topCreds]         = await db.execute("SELECT detail, COUNT(*) AS c FROM events WHERE type='BRUTE' AND detail != '' GROUP BY detail ORDER BY c DESC LIMIT 10");
  const [byType]           = await db.execute("SELECT type, COUNT(*) AS c FROM events GROUP BY type");
  const [byCountry]        = await db.execute("SELECT country, COUNT(*) AS c FROM events GROUP BY country ORDER BY c DESC LIMIT 10");
  const [byHour]           = await db.execute("SELECT HOUR(ts) AS h, COUNT(*) AS c FROM events WHERE DATE(ts) = CURDATE() GROUP BY h ORDER BY h");
  const topIp = topIpRow ? { ...topIpRow, flag: flag(topIpRow.country) } : null;
  const byCountryWithFlag  = byCountry.map(r => ({ ...r, flag: flag(r.country) }));
  const topTypeRow = byType.reduce((best, r) => Number(r.c) > Number(best?.c || 0) ? r : best, null);
  res.json({ total: Number(total), unique_ips: Number(unique_ips), today: Number(today), top_ip: topIp, top_credentials: topCreds, by_type: byType, by_country: byCountryWithFlag, by_hour: byHour, active_template: activeTemplate, templates: TEMPLATES, top_type: topTypeRow?.type || null, top_type_count: Number(topTypeRow?.c || 0) });
});

app.get("/heimdall/api/events", authDash, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  || "50"), 1000);
  const offset = parseInt(req.query.offset || "0");
  const type   = req.query.type || null;
  const ip     = req.query.ip   || null;
  const wheres = []; const params = [];
  if (type) { wheres.push("type = ?"); params.push(type); }
  if (ip)   { wheres.push("ip = ?");   params.push(ip); }
  const where = wheres.length ? "WHERE " + wheres.join(" AND ") : "";
  const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM events ${where}`, params.slice());
  const rows = await qRows(`SELECT * FROM events ${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ events: rows.map(e => ({ ...e, flag: flag(e.country) })), total });
});

app.get("/heimdall/api/ips", authDash, async (req, res) => {
  const limit   = Math.min(parseInt(req.query.limit  || "100"), 500);
  const offset  = parseInt(req.query.offset || "0");
  const country = req.query.country ? req.query.country.toUpperCase().slice(0, 2) : null;
  const type    = req.query.type    || null;
  const VALID_SORT = ["hits", "last_seen", "first_seen"];
  const sortBy  = VALID_SORT.includes(req.query.sort) ? req.query.sort : "hits";
  const orderMap = { hits: "hits DESC", last_seen: "last_seen DESC", first_seen: "first_seen ASC" };

  const wheres = []; const params = [];
  if (country) { wheres.push("country = ?"); params.push(country); }
  if (type)    { wheres.push("type = ?");    params.push(type); }
  const where = wheres.length ? "WHERE " + wheres.join(" AND ") : "";

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(DISTINCT ip) AS total FROM events ${where}`, params);

  const rows = await qRows(`
    SELECT ip, country, city,
      COUNT(*)  AS hits,
      MIN(ts)   AS first_seen,
      MAX(ts)   AS last_seen,
      GROUP_CONCAT(DISTINCT type ORDER BY type SEPARATOR ',') AS types
    FROM events ${where}
    GROUP BY ip, country, city
    ORDER BY ${orderMap[sortBy]}
    LIMIT ${limit} OFFSET ${offset}
  `, params);

  const ips = rows.map(r => ({ ...r, flag: flag(r.country), hits: Number(r.hits), types: r.types ? r.types.split(",") : [] }));
  res.json({ ips, total: Number(total) });
});

app.get("/heimdall/api/template", authDash, (req, res) => {
  res.json({ template: activeTemplate, templates: TEMPLATES });
});

app.post("/heimdall/api/template", authDash, authAdmin, (req, res) => {
  const { template } = req.body || {};
  if (!TEMPLATES.includes(template)) return res.status(400).json({ error: "Template inválido" });
  activeTemplate = template;
  io.emit("template_changed", { template });
  console.log(`[Heimdall] Template cambiado → ${template}`);
  res.json({ ok: true, template });
});

app.post("/heimdall/api/auth/change-password", authDash, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Datos requeridos" });
  const pErr = validatePassword(newPassword);
  if (pErr) return res.status(400).json({ error: pErr });
  const user = await qRow("SELECT * FROM users WHERE id = ?", [req.user.id]);
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash)))
    return res.status(401).json({ error: "Contraseña actual incorrecta" });
  const hash = await bcrypt.hash(newPassword, 10);
  await qRun("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?", [hash, req.user.id]);
  await logAudit(req.user.id, "password_changed", "Contraseña cambiada");
  res.json({ ok: true });
});

app.get("/heimdall/api/auth/me", authDash, async (req, res) => {
  const user = await qRow("SELECT id, username, nombre, role, totp_secret FROM users WHERE id = ?", [req.user.id]);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json({ id: user.id, username: user.username, nombre: user.nombre, role: user.role, has_totp: !!user.totp_secret });
});

app.post("/heimdall/api/auth/verify-totp", authLimiter, async (req, res) => {
  const { userId, token: totpToken } = req.body || {};
  if (!userId || !totpToken) return res.status(400).json({ error: "Datos requeridos" });
  const user = await qRow("SELECT * FROM users WHERE id = ?", [userId]);
  if (!user || !user.totp_secret) return res.status(400).json({ error: "2FA no configurado" });
  if (user.locked_until && new Date(user.locked_until) > new Date())
    return res.status(429).json({ error: "Cuenta bloqueada temporalmente por demasiados intentos fallidos" });
  if (!verifyTOTP(user.totp_secret, String(totpToken))) {
    const attempts = (user.failed_attempts || 0) + 1;
    if (attempts >= 5) {
      const until = new Date(Date.now() + 15 * 60 * 1000);
      await qRun("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?", [attempts, until, user.id]);
    } else {
      await qRun("UPDATE users SET failed_attempts = ? WHERE id = ?", [attempts, user.id]);
    }
    return res.status(401).json({ error: "Código incorrecto" });
  }
  await qRun("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?", [user.id]);
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role || "admin", nombre: user.nombre || "", tokenVersion: user.token_version || 0 },
    JWT_SECRET, { expiresIn: "24h" }
  );
  await logAudit(user.id, "login_2fa", `Login 2FA desde ${clientIp(req)}`);
  res.json({ token, username: user.username, role: user.role });
});

app.post("/heimdall/api/auth/setup-totp", authDash, async (req, res) => {
  const { totpSecret, totpToken } = req.body || {};
  if (!totpSecret || !totpToken) return res.status(400).json({ error: "Datos requeridos" });
  if (!verifyTOTP(totpSecret, String(totpToken)))
    return res.status(400).json({ error: "Código incorrecto. Verificá que la hora de tu dispositivo sea correcta." });
  await qRun("UPDATE users SET totp_secret = ? WHERE id = ?", [totpSecret, req.user.id]);
  await logAudit(req.user.id, "totp_enabled", "2FA activado");
  res.json({ ok: true });
});

app.delete("/heimdall/api/auth/remove-totp", authDash, async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: "Contraseña requerida" });
  const user = await qRow("SELECT * FROM users WHERE id = ?", [req.user.id]);
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: "Contraseña incorrecta" });
  await qRun("UPDATE users SET totp_secret = NULL WHERE id = ?", [req.user.id]);
  await logAudit(req.user.id, "totp_disabled", "2FA desactivado");
  res.json({ ok: true });
});

app.get("/heimdall/api/users", authDash, authAdmin, async (req, res) => {
  const rows = await qRows("SELECT id, username, nombre, role, enabled, created_at, totp_secret FROM users ORDER BY created_at ASC");
  const users = rows.map(u => ({ ...u, has2FA: !!u.totp_secret, totp_secret: undefined }));
  res.json({ users });
});

app.post("/heimdall/api/users", authDash, authAdmin, async (req, res) => {
  const { username, password, role = "viewer", nombre = "" } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Datos requeridos" });
  const pErr = validatePassword(password);
  if (pErr) return res.status(400).json({ error: pErr });
  if (!["admin", "viewer"].includes(role)) return res.status(400).json({ error: "Rol inválido" });
  const hash = await bcrypt.hash(password, 10);
  try {
    const result = await qRun("INSERT INTO users (username, password_hash, nombre, role) VALUES (?,?,?,?)", [username, hash, nombre.slice(0, 100), role]);
    await logAudit(req.user.id, "user_created", `Usuario creado: ${username} (${role})`);
    res.json({ ok: true, id: result.insertId });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "El usuario ya existe" });
    throw e;
  }
});

app.put("/heimdall/api/users/:id", authDash, authAdmin, async (req, res) => {
  const { role, nombre, username, password } = req.body || {};
  const id = parseInt(req.params.id);
  if (role && !["admin", "viewer"].includes(role)) return res.status(400).json({ error: "Rol inválido" });
  const updates = []; const params = [];
  if (role !== undefined)              { updates.push("role = ?");          params.push(role); }
  if (nombre !== undefined)            { updates.push("nombre = ?");        params.push(nombre.slice(0, 100)); }
  if (username && username.trim())     { updates.push("username = ?");      params.push(username.trim().slice(0, 50)); }
  if (password) {
    const pErr = validatePassword(password);
    if (pErr) return res.status(400).json({ error: pErr });
    const hash = await bcrypt.hash(password, 10);
    updates.push("password_hash = ?");
    params.push(hash);
    updates.push("token_version = token_version + 1");
  }
  if (updates.length === 0) return res.status(400).json({ error: "Nada que actualizar" });
  params.push(id);
  try {
    await qRun(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
    await logAudit(req.user.id, "user_updated", `Usuario #${id} actualizado`);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "El nombre de usuario ya existe" });
    throw e;
  }
});

app.put("/heimdall/api/users/:id/toggle", authDash, authAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: "No puedes bloquearte a ti mismo" });
  const user = await qRow("SELECT username, enabled FROM users WHERE id = ?", [id]);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  const newState = (user.enabled === 0 || user.enabled === false) ? 1 : 0;
  // Incrementar token_version al bloquear — invalida tokens existentes del usuario
  const tvIncr = newState === 0 ? ", token_version = token_version + 1" : "";
  await qRun(`UPDATE users SET enabled = ?${tvIncr} WHERE id = ?`, [newState, id]);
  await logAudit(req.user.id, "user_toggle", `Usuario ${user.username} ${newState ? "habilitado" : "bloqueado"}`);
  res.json({ ok: true, enabled: newState });
});

app.delete("/heimdall/api/users/:id/totp", authDash, authAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await qRow("SELECT username FROM users WHERE id = ?", [id]);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  await qRun("UPDATE users SET totp_secret = NULL WHERE id = ?", [id]);
  await logAudit(req.user.id, "totp_reset", `2FA reseteado para usuario: ${user.username}`);
  res.json({ ok: true });
});

app.delete("/heimdall/api/users/:id", authDash, authAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: "No puedes eliminarte a ti mismo" });
  const user = await qRow("SELECT username FROM users WHERE id = ?", [id]);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  await qRun("DELETE FROM users WHERE id = ?", [id]);
  await logAudit(req.user.id, "user_deleted", `Usuario eliminado: ${user.username}`);
  res.json({ ok: true });
});

app.delete("/heimdall/api/events", authDash, authAdmin, async (req, res) => {
  await qRun("DELETE FROM events");
  io.emit("events_cleared");
  await logAudit(req.user.id, "events_cleared", "Todos los eventos eliminados");
  res.json({ ok: true });
});

// Serve dashboard frontend
app.use("/heimdall", express.static(path.join(__dirname, "../frontend-shadcn/dist")));
app.get("/heimdall/*", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend-shadcn/dist/index.html"))
);

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP/HTTPS TRAP SERVERS  — puertos 80 y 443 (señuelo en puertos estándar)
// ═══════════════════════════════════════════════════════════════════════════════

function buildTrapApp() {
  const t = express();
  t.use(express.json({ limit: "1mb" }));
  t.use(express.urlencoded({ extended: true, limit: "1mb" }));

  t.use('/assets', express.static(path.join(__dirname, 'assets')));

  t.get(["/", "/login", "/index.html", "/wp-login.php", "/wp-admin", "/admin"], (req, res) =>
    serveTemplate(res, activeTemplate));

  t.post(["/api/auth/login", "/login", "/wp-login.php", "/admin/login", "/user/login"], async (req, res) => {
    const ip   = clientIp(req);
    const ua   = req.headers["user-agent"] || "";
    const body = req.body || {};
    const user = (body.username || body.user || body.email || body.log || "").slice(0, 100);
    const pass = (body.password || body.pass || body.pwd || "").slice(0, 100);
    const type = REAL_BROWSER_UA.test(ua) ? "HUMAN" : "BRUTE";
    await logEvent({ rawIp: ip, type, method: "POST", urlPath: req.path, detail: user ? `${user}:${pass}` : JSON.stringify(body).slice(0, 200), ua });
    await new Promise(r => setTimeout(r, 600 + Math.random() * 700));
    res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  });

  t.use(async (req, res) => {
    const ip   = clientIp(req);
    const ua   = req.headers["user-agent"] || "";
    const type = classifyHttp(req.method, req.path, ua);
    await logEvent({ rawIp: ip, type, method: req.method, urlPath: req.path, detail: ua.slice(0, 200), ua });
    serveTemplate(res, activeTemplate);
  });

  return t;
}

const trapApp = buildTrapApp();

// Puerto 80 — HTTP
http.createServer(trapApp).listen(80, () => {
  console.log("[Heimdall] Trampa HTTP  → :80");
}).on("error", e => {
  if (e.code !== "EADDRINUSE") console.warn(`[trap] HTTP  :80 — ${e.message}`);
});

// Puerto 443 — HTTPS con certificado autofirmado
const sslPath = path.join(__dirname, "ssl");
try {
  const sslOpts = {
    key:  fs.readFileSync(path.join(sslPath, "key.pem")),
    cert: fs.readFileSync(path.join(sslPath, "cert.pem")),
  };
  https.createServer(sslOpts, trapApp).listen(443, () => {
    console.log("[Heimdall] Trampa HTTPS → :443");
  }).on("error", e => {
    if (e.code !== "EADDRINUSE") console.warn(`[trap] HTTPS :443 — ${e.message}`);
  });
} catch {
  console.warn("[Heimdall] SSL no encontrado — HTTPS en :443 deshabilitado. Generar con: openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -days 3650 -nodes -subj '/CN=heimdall'");
}

// ═══════════════════════════════════════════════════════════════════════════════
// DB INIT
// ═══════════════════════════════════════════════════════════════════════════════

async function initDB() {
  await qRun(`CREATE TABLE IF NOT EXISTS events (
    id           BIGINT       AUTO_INCREMENT PRIMARY KEY,
    ts           DATETIME     DEFAULT CURRENT_TIMESTAMP,
    ip           VARCHAR(45)  NOT NULL,
    country      CHAR(2),
    city         VARCHAR(100),
    type         ENUM('BRUTE','PORTSCAN','SCAN','BOT','RECON','HUMAN') NOT NULL,
    method       VARCHAR(10),
    path         VARCHAR(500),
    detail       TEXT,
    port         SMALLINT UNSIGNED,
    user_agent   TEXT,
    threat_score TINYINT UNSIGNED DEFAULT 0,
    INDEX idx_ip   (ip),
    INDEX idx_ts   (ts),
    INDEX idx_type (type)
  ) ENGINE=InnoDB CHARSET=utf8mb4`);

  await qRun(`CREATE TABLE IF NOT EXISTS users (
    id            INT         AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    nombre        VARCHAR(100) DEFAULT '',
    role          VARCHAR(20) NOT NULL DEFAULT 'admin',
    created_at    DATETIME    DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB CHARSET=utf8mb4`);

  // Migration: add columns if not exist (MySQL 8.0+)
  try { await qRun("ALTER TABLE users ADD COLUMN nombre VARCHAR(100) DEFAULT ''"); } catch {}
  try { await qRun("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin'"); } catch {}
  try { await qRun("ALTER TABLE users ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1"); } catch {}
  try { await qRun("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64) DEFAULT NULL"); } catch {}
  try { await qRun("ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0"); } catch {}
  try { await qRun("ALTER TABLE users ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0"); } catch {}
  try { await qRun("ALTER TABLE users ADD COLUMN locked_until DATETIME DEFAULT NULL"); } catch {}

  await qRun(`CREATE TABLE IF NOT EXISTS audit_log (
    id       BIGINT      AUTO_INCREMENT PRIMARY KEY,
    user_id  INT,
    action   VARCHAR(50) NOT NULL,
    detail   TEXT,
    ts       DATETIME    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ts (ts)
  ) ENGINE=InnoDB CHARSET=utf8mb4`);

  await qRun(`CREATE TABLE IF NOT EXISTS settings (
    key_name VARCHAR(100) PRIMARY KEY,
    value    MEDIUMTEXT
  ) ENGINE=InnoDB CHARSET=utf8mb4`);

  const existing = await qRow("SELECT COUNT(*) AS c FROM users");
  if (!existing || existing.c === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await qRun("INSERT INTO users (username, password_hash, role) VALUES (?,?,?)", ["admin", hash, "admin"]);
    console.log("[Heimdall] Usuario admin creado — password: admin123 (cambiar al primer login)");
  } else {
    // Ensure the first user has admin role
    await qRun("UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM (SELECT MIN(id) AS id FROM users) t)");
  }

  // Retención de eventos — máximo 500.000 entradas, purga los más antiguos
  async function trimEvents() {
    try {
      const row = await qRow("SELECT COUNT(*) AS c FROM events");
      if (row && row.c > 500_000) {
        await qRun("DELETE FROM events ORDER BY id ASC LIMIT ?", [row.c - 500_000]);
        console.log(`[Heimdall] Trim events: ${row.c - 500_000} eventos eliminados`);
      }
    } catch (e) { console.warn("[Heimdall] trimEvents:", e.message); }
  }
  await trimEvents();
  setInterval(trimEvents, 60 * 60 * 1000); // cada hora
}

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║  HEIMDALL Community — Honeypot        ║`);
    console.log(`╠══════════════════════════════════════╣`);
    console.log(`║  Dashboard → :${PORT}/heimdall          ║`);
    console.log(`║  Señuelo   → :80 (HTTP)               ║`);
    console.log(`║  Señuelo   → :443 (HTTPS)             ║`);
    console.log(`║  Template  → ${activeTemplate.padEnd(27)}║`);
    console.log(`╚══════════════════════════════════════╝\n`);
  });
}).catch(e => { console.error("[Heimdall] Error init:", e.message); process.exit(1); });
