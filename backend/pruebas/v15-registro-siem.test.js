/**
 * v1.5.0: el evento estructurado y su registro en disco para el SIEM (Wazuh). Es el mismo formato
 * que escribe Heimdall Pro, así un Wazuh con las reglas de `integraciones/wazuh/` lee las dos
 * ediciones igual. Los casos de SSH sirven para fijar el formato aunque la Community solo tenga
 * señuelos web.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { normalizar, lineaJson, protocoloDe, severidadDe } = require("../evento-normalizado");
const { crearRegistro } = require("../registro-eventos");

const base = {
  id: 42, ip: "203.0.113.7", country: "NL", city: "Amsterdam", type: "BRUTE", method: "SSH", path: "",
  detail: "root:a:b", port: 2222, ua: "SSH-2.0-libssh_0.9.6", threat_score: 80, portal: null, signals: null,
  internal: 0, ts: "2026-10-24T15:00:00.000Z", event_uid: "11111111-2222-3333-4444-555555555555",
  sensor: "sensor-a", src_port: 51515, proto: "ssh", username: "root", password: "a:b",
};

test("🔴 el evento normalizado separa la credencial aunque la contraseña tenga ':'", () => {
  const n = normalizar(base);
  assert.equal(n.srcuser, "root");
  assert.equal(n.heimdall.username, "root");
  assert.equal(n.heimdall.password, "a:b");
});

test("🔑 campos de primer nivel con los nombres de Wazuh, hora en UTC con zona", () => {
  const n = normalizar(base);
  assert.equal(n.srcip, "203.0.113.7");
  assert.equal(n.srcport, 51515);
  assert.equal(n.dstport, 2222);
  assert.equal(n.protocol, "ssh");
  assert.equal(n.timestamp, "2026-10-24T15:00:00.000Z");
  assert.equal(n.heimdall.mitre, "T1110");
  assert.equal(n.heimdall.severidad, "alta");
  assert.equal(n.heimdall.client, "SSH-2.0-libssh_0.9.6");
  assert.equal(n.heimdall.user_agent, null, "en SSH no hay agente HTTP");
});

test("🔴 `ua` sobrecargado no sale como user_agent fuera de HTTP", () => {
  const tcp = normalizar({ ...base, method: "TCP", proto: "tcp", ua: "\x16\x03\x01 basura", username: null, password: null });
  assert.equal(tcp.heimdall.user_agent, null);
  assert.equal(tcp.heimdall.client, null);
  const ftp = normalizar({ ...base, method: "FTP", proto: "ftp", ua: "FTP client" });
  assert.equal(ftp.heimdall.user_agent, null);
  const http = normalizar({ ...base, method: "GET", proto: null, port: 443, dst_port: 443, ua: "curl/8.5" });
  assert.equal(http.protocol, "https");
  assert.equal(http.heimdall.user_agent, "curl/8.5");
});

test("los eventos anteriores a v2.8 (sin columnas nuevas) se normalizan sin inventar datos", () => {
  const viejo = normalizar({ id: 1, ip: "198.51.100.1", type: "SCAN", method: "GET", path: "/.env", port: null,
                             threat_score: 50, ts: new Date("2026-01-01T00:00:00Z"), internal: 0 }, { sensor: "s1" });
  assert.equal(viejo.srcport, null);
  assert.equal(viejo.dstport, null);
  assert.equal(viejo.srcuser, null);
  assert.equal(viejo.heimdall.sensor, "s1");
  assert.equal(viejo.protocol, "http");
});

test("una línea JSON por evento, sin saltos internos aunque el atacante los mande", () => {
  const l = lineaJson({ ...base, command: "echo a\nrm -rf /\r\n" });
  assert.equal(l.endsWith("\n"), true);
  assert.equal(l.slice(0, -1).includes("\n"), false);
  assert.equal(JSON.parse(l).heimdall.command, "echo a\nrm -rf /\r\n");
});

test("severidad en las tres escalas", () => {
  assert.deepEqual(severidadDe(90), { severidad: "critica", thehive: 4 });
  assert.deepEqual(severidadDe(70), { severidad: "alta", thehive: 3 });
  assert.deepEqual(severidadDe(40), { severidad: "media", thehive: 2 });
  assert.deepEqual(severidadDe(10), { severidad: "baja", thehive: 1 });
  assert.equal(protocoloDe("SMTP", 25), "smtp");
});

test("🔑 el registro en disco escribe JSONL y rota por tamaño sin perder la línea nueva", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hmd-reg-"));
  const ruta = path.join(dir, "sub", "eventos.json");
  const reg = crearRegistro({ ruta, maxBytes: 1500, conservar: 2, sensor: "t", version: "x" });
  for (let i = 0; i < 12; i++) reg.escribir({ ...base, id: i });
  const actual = fs.readFileSync(ruta, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(actual[actual.length - 1].heimdall.id, 11, "la última línea está en el archivo vigente");
  assert.ok(fs.existsSync(`${ruta}.1`), "rotó");
  assert.ok(!fs.existsSync(`${ruta}.3`), "conserva solo los pedidos");
  assert.equal(reg.estado().escritas, 12);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("🔴 un error de disco no se propaga: la captura sigue", () => {
  // Un archivo usado como carpeta: ENOTDIR. (Con /proc, mkdirSync se cuelga.)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hmd-err-"));
  fs.writeFileSync(path.join(dir, "archivo"), "x");
  const reg = crearRegistro({ ruta: path.join(dir, "archivo", "eventos.json") });
  assert.doesNotThrow(() => reg.escribir(base));
  assert.ok(reg.estado().error);
  const apagado = crearRegistro({ ruta: "off" });
  apagado.escribir(base);
  assert.equal(apagado.estado().activo, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("🔴 la línea del SIEM no lleva campos en null (Wazuh los lee como el texto \"null\")", () => {
  const l = JSON.parse(lineaJson({ ...base, command: null, payload: null, portal: null }));
  assert.equal("command" in l.heimdall, false);
  assert.equal("payload" in l.heimdall, false);
  assert.equal(l.heimdall.username, "root");
  assert.equal(l.heimdall.internal, false, "los false se quedan");
});
