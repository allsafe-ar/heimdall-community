// Pruebas de regresión de la auditoría de seguridad de octubre de 2026 (H-01 a H-06).
// Cada una falla con el código anterior a la corrección. Corren contra el server.js real, con
// el doble de mysql2 (ver servidor.js): `npm test` desde backend/.
"use strict";
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { arrancar, correrHastaSalir, SECRETO } = require("./servidor");

const SALUD = "/heimdall/api/health";
const ADMIN = { id: 1, username: "admin", role: "admin", enabled: 1, token_version: 0, password_hash: "x" };
const tokenAdmin = () => jwt.sign({ id: 1, username: "admin", role: "admin", tokenVersion: 0 }, SECRETO);
const insercionesDeEventos = (srv) => srv.sql().filter(q => q.sql.startsWith("INSERT INTO events"));

describe("H-01: el arranque rechaza un JWT_SECRET de ejemplo o corto", () => {
  test("no arranca con el valor del .env.example de antes", async () => {
    const r = await correrHastaSalir({ JWT_SECRET: "change_this_to_a_random_string_min_32_chars" });
    assert.equal(r.codigo, 1, r.salida);
    assert.match(r.salida, /FATAL: JWT_SECRET/);
  });
  test("no arranca con menos de 32 caracteres", async () => {
    const r = await correrHastaSalir({ JWT_SECRET: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d" }); // 31
    assert.equal(r.codigo, 1, r.salida);
  });
  test("el .env.example no trae un secreto que arranque", async () => {
    const ej = fs.readFileSync(path.join(__dirname, "..", ".env.example"), "utf8");
    const valor = (ej.match(/^JWT_SECRET=(.*)$/m) || [])[1] || "";
    const r = await correrHastaSalir({ JWT_SECRET: valor });
    assert.equal(r.codigo, 1, r.salida);
  });
});

describe("señuelo y panel", () => {
  let srv;
  before(async () => { srv = await arrancar({ salud: SALUD, datos: { usuarios: [ADMIN] }, env: { TRUST_PROXY: "false" } }); });
  after(() => srv.cerrar());

  test("H-02: un path de más de 500 caracteres queda registrado, recortado", async () => {
    const largo = "/" + "A".repeat(700) + "/index.php";
    await srv.pedir("GET", largo + "?id=1%20union%20select%201,2,3");
    const ev = insercionesDeEventos(srv).find(q => String(q.p[7]).startsWith("/AAAA"));
    assert.ok(ev, "el ataque tiene que llegar al INSERT");
    assert.ok(ev.p[7].length <= 500, `path de ${ev.p[7].length} caracteres: MySQL lo rechaza`);
    assert.ok(ev.p[0].length <= 45 && ev.p[6].length <= 10);
  });

  test("H-03: sin proxy de confianza, X-Forwarded-For no elige la IP registrada", async () => {
    await srv.pedir("GET", "/.env", { headers: { "X-Forwarded-For": "10.0.0.1" } });
    const ev = insercionesDeEventos(srv).filter(q => q.p[7] === "/.env").pop();
    assert.ok(ev);
    assert.notEqual(ev.p[0], "10.0.0.1");
    assert.equal(ev.p[0], "127.0.0.1");
  });

  test("H-05: limit/offset inválidos no arman SQL inválido", async () => {
    const t = tokenAdmin();
    const r1 = await srv.pedir("GET", "/heimdall/api/events?limit=abc&offset=-3", { token: t });
    const r2 = await srv.pedir("GET", "/heimdall/api/ips?limit=xyz&offset=zz", { token: t });
    assert.equal(r1.status, 200); assert.equal(r2.status, 200);
    const limites = srv.sql().filter(q => /FROM events/.test(q.sql) && /LIMIT/.test(q.sql)).map(q => q.sql);
    assert.ok(limites.some(s => /LIMIT 50 OFFSET 0\b/.test(s)), limites.join("\n"));
    assert.ok(limites.some(s => /LIMIT 100 OFFSET 0\b/.test(s)), limites.join("\n"));
    assert.ok(!limites.some(s => /NaN|-\d/.test(s)));
  });

  test("H-06: el señuelo responde como siempre ante un cuerpo con tipos raros", async () => {
    const r = await srv.pedir("POST", "/login", { body: { username: { a: 1 }, password: [1] } });
    assert.equal(r.status, 401);
    const ev = insercionesDeEventos(srv).filter(q => q.p[7] === "/login").pop();
    assert.ok(ev, "el intento queda registrado");
  });
});

describe("H-03 detrás del nginx propio (trust proxy = loopback)", () => {
  let srv;
  before(async () => { srv = await arrancar({ salud: SALUD, datos: { usuarios: [ADMIN] } }); });
  after(() => srv.cerrar());

  test("se toma la IP que agrega el proxy, no la que el cliente puso primero", async () => {
    await srv.pedir("GET", "/wp-admin", { headers: { "X-Forwarded-For": "10.0.0.1, 203.0.113.9" } });
    const ev = insercionesDeEventos(srv).filter(q => q.p[7] === "/wp-admin").pop();
    assert.ok(ev);
    assert.equal(ev.p[0], "203.0.113.9");
  });
});
