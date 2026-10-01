// Pruebas de regresión de la segunda vuelta de la auditoría de octubre de 2026 (Heimdall
// Community): lo que la reauditoría encontró abierto o a medias. Cada una falla con el código
// anterior a la corrección. `npm test` desde backend/.
"use strict";
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { arrancar, SECRETO } = require("./servidor");
const totp = require("../totp");

const SALUD = "/heimdall/api/health";
const CLAVE = "ClaveDePrueba-123";
const HASH = bcrypt.hashSync(CLAVE, 4);
const ADMIN  = { id: 1, username: "admin",  role: "admin",  enabled: 1, token_version: 0, password_hash: HASH };
const CON2FA = { id: 2, username: "con2fa", role: "viewer", enabled: 1, token_version: 0, password_hash: HASH, totp_secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" };
const NUEVO  = { id: 3, username: "nuevo",  role: "admin",  enabled: 1, token_version: 0, password_hash: HASH, must_change_password: 1 };
const BAJA   = { id: 4, username: "baja",   role: "admin",  enabled: 0, token_version: 0, password_hash: HASH };
const tokenDe = (u) => jwt.sign({ id: u.id, username: u.username, role: u.role, tokenVersion: 0 }, SECRETO);
const codigoActual = (s) => totp.codigoDe(s, Math.floor(Date.now() / 30000));
const eventosEn = (srv, ruta) => srv.sql().filter(q => q.sql.startsWith("INSERT INTO events") && q.p[7] === ruta);

// Conexión de socket.io a mano (transporte polling), sin depender del cliente: devuelve el
// paquete con que el servidor contesta al intento de entrar al espacio "/".
async function conectarSocket(base, token) {
  const url = `${base}/socket.io/?EIO=4&transport=polling`;
  const abierto = await (await fetch(url)).text();
  const sid = JSON.parse(abierto.slice(1)).sid;
  await fetch(`${url}&sid=${sid}`, { method: "POST", body: "40" + JSON.stringify({ token }), headers: { "Content-Type": "text/plain" } });
  return (await fetch(`${url}&sid=${sid}`)).text();
}

describe("señuelo y panel", () => {
  let srv;
  before(async () => { srv = await arrancar({ salud: SALUD, datos: { usuarios: [ADMIN, CON2FA, NUEVO, BAJA] }, env: { TRUST_PROXY: "false" } }); });
  after(() => srv.cerrar());

  test("H-06: {\"username\":{\"toString\":1}} se registra y recibe la respuesta de siempre", async () => {
    const r = await srv.pedir("POST", "/wp-login.php", { body: { username: { toString: 1 }, password: "x" } });
    assert.equal(r.status, 401, r.texto);
    assert.equal(r.json.error, "Usuario o contraseña incorrectos.");
    const ev = eventosEn(srv, "/wp-login.php").pop();
    assert.ok(ev, "el intento tiene que quedar registrado");
    assert.ok(ev.p.some(v => typeof v === "string" && v.includes("toString")), JSON.stringify(ev.p));
  });

  test("H-06: un JSON malformado al login del señuelo se registra y no delata la trampa", async () => {
    const r = await srv.pedir("POST", "/admin/login", { body: '{"username": "adm', headers: { "Content-Type": "application/json" } });
    assert.equal(r.status, 401, r.texto);
    assert.ok(!r.texto.includes("Pedido inválido"));
    assert.ok(eventosEn(srv, "/admin/login").length > 0, "el intento tiene que quedar registrado");
  });

  test("H-06: un JSON malformado a otra ruta del señuelo devuelve la página trampa", async () => {
    const r = await srv.pedir("PUT", "/xmlrpc.php", { body: "{nope", headers: { "Content-Type": "application/json" } });
    assert.equal(r.status, 200, r.texto);
    assert.match(r.headers.get("content-type") || "", /html/);
    assert.ok(eventosEn(srv, "/xmlrpc.php").length > 0);
  });

  test("H-08: el panel responde con CSP y el señuelo no (una CSP propia lo delataría)", async () => {
    const panel = await srv.pedir("GET", SALUD);
    const csp = panel.headers.get("content-security-policy") || "";
    assert.match(csp, /default-src 'self'/);
    assert.ok(!/upgrade-insecure-requests/.test(csp));
    const trampa = await srv.pedir("GET", "/wp-admin/");
    assert.equal(trampa.headers.get("content-security-policy"), null);
  });

  test("H-09: activar el 2FA exige la contraseña", async () => {
    const s = totp.generarSecreto();
    const sin = await srv.pedir("POST", "/heimdall/api/auth/setup-totp", { token: tokenDe(ADMIN), body: { totpSecret: s, totpToken: codigoActual(s) } });
    assert.equal(sin.status, 400);
    const mal = await srv.pedir("POST", "/heimdall/api/auth/setup-totp", { token: tokenDe(ADMIN), body: { totpSecret: s, totpToken: codigoActual(s), password: "otra" } });
    assert.equal(mal.status, 401);
    assert.ok(!srv.sql().some(q => /SET totp_secret = \?/.test(q.sql)));
  });

  test("H-09: no pisa un 2FA activo y con la contraseña sí lo activa", async () => {
    const s = totp.generarSecreto();
    const pisar = await srv.pedir("POST", "/heimdall/api/auth/setup-totp", { token: tokenDe(CON2FA), body: { totpSecret: s, totpToken: codigoActual(s), password: CLAVE } });
    assert.equal(pisar.status, 409);
    const ok = await srv.pedir("POST", "/heimdall/api/auth/setup-totp", { token: tokenDe(ADMIN), body: { totpSecret: s, totpToken: codigoActual(s), password: CLAVE } });
    assert.equal(ok.status, 200, ok.texto);
  });

  test("H-10/11: con la contraseña inicial solo se puede cambiarla", async () => {
    const r = await srv.pedir("GET", "/heimdall/api/stats", { token: tokenDe(NUEVO) });
    assert.equal(r.status, 403);
    assert.equal(r.json.mustChangePassword, true);
    const me = await srv.pedir("GET", "/heimdall/api/auth/me", { token: tokenDe(NUEVO) });
    assert.equal(me.status, 200);
    assert.equal(me.json.mustChangePassword, true);
    const cambio = await srv.pedir("POST", "/heimdall/api/auth/change-password", { token: tokenDe(NUEVO), body: { currentPassword: CLAVE, newPassword: "OtraClave-456" } });
    assert.equal(cambio.status, 200, cambio.texto);
    assert.match(srv.sql().filter(q => /SET password_hash = \?/.test(q.sql)).pop().sql, /must_change_password = 0/);
  });

  test("N-3: bajar el rol revoca las sesiones abiertas", async () => {
    const r = await srv.pedir("PUT", "/heimdall/api/users/2", { token: tokenDe(ADMIN), body: { role: "admin" } });
    assert.equal(r.status, 200, r.texto);
    const upd = srv.sql().filter(q => /^UPDATE users SET role = \?/.test(q.sql)).pop();
    assert.match(upd.sql, /token_version = token_version \+ 1/);
  });

  test("N-4: el canal en vivo rechaza una cuenta deshabilitada", async () => {
    assert.match(await conectarSocket(srv.base, tokenDe(ADMIN)), /^40/);
    assert.match(await conectarSocket(srv.base, tokenDe(BAJA)), /^44/);
  });
});

describe("H-10/11: el primer arranque no crea admin/admin123", () => {
  const COUNT_CERO = { re: "SELECT COUNT\\(\\*\\) AS c FROM users", filas: [{ c: 0 }] };
  const hashDelAdmin = (srv) => srv.sql().find(q => /^INSERT INTO users/.test(q.sql)).p[1];

  test("sin variable: contraseña aleatoria, una vez en el log, y cambio obligatorio", async () => {
    const srv = await arrancar({ salud: SALUD, env: { TRUST_PROXY: "false", ADMIN_PASSWORD_INICIAL: "" }, datos: { reglas: [COUNT_CERO] } });
    try {
      const ins = srv.sql().find(q => /^INSERT INTO users/.test(q.sql));
      assert.match(ins.sql, /must_change_password/);
      assert.equal(bcrypt.compareSync("admin123", hashDelAdmin(srv)), false);
      const m = srv.salida().match(/se muestra una sola vez\): (\S+)/);
      assert.ok(m, srv.salida());
      assert.equal(bcrypt.compareSync(m[1], hashDelAdmin(srv)), true);
    } finally { await srv.cerrar(); }
  });

  test("con ADMIN_PASSWORD_INICIAL: usa esa y no la imprime", async () => {
    const srv = await arrancar({ salud: SALUD, env: { TRUST_PROXY: "false", ADMIN_PASSWORD_INICIAL: "Inicial-Elegida-789" }, datos: { reglas: [COUNT_CERO] } });
    try {
      assert.equal(bcrypt.compareSync("Inicial-Elegida-789", hashDelAdmin(srv)), true);
      assert.ok(!srv.salida().includes("Inicial-Elegida-789"));
    } finally { await srv.cerrar(); }
  });
});

describe("H-07: nodemailer sin avisos altos", () => {
  test("la versión instalada es la 10 o posterior y el módulo de alertas carga", () => {
    const v = require("nodemailer/package.json").version;
    assert.ok(Number(v.split(".")[0]) >= 10, `nodemailer ${v}`);
    const rango = require("../package.json").dependencies.nodemailer;
    assert.ok(Number(rango.replace(/^[^\d]*/, "").split(".")[0]) >= 10, `package.json pide ${rango}`);
    assert.equal(typeof require("../mailer").enviarAlerta, "function");
  });
  test("arma un correo con el logo en línea (la forma en que lo usan las alertas)", async () => {
    const nodemailer = require("nodemailer");
    const t = nodemailer.createTransport({ streamTransport: true, buffer: true });
    const r = await t.sendMail({ from: "a@b.c", to: "d@e.f", subject: "[Heimdall] x", text: "t", html: '<img src="cid:logo">',
      attachments: [{ filename: "allsafe.png", content: Buffer.from("png"), cid: "logo", contentDisposition: "inline" }] });
    assert.match(String(r.message), /Content-ID: <logo>/);
  });
});
