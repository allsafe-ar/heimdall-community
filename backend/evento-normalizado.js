"use strict";
/**
 * El evento de Heimdall en su forma de intercambio: la que se escribe en el registro para el SIEM
 * (Wazuh), la que entrega la API de integración y la que viaja a TheHive y a Gjallarhorn.
 *
 * 🔑 Un solo formato para todos los destinos. Si cada salida armara el suyo, la misma conexión
 * terminaría descrita de tres maneras y la correlación entre sistemas dejaría de cerrar.
 *
 * Lógica pura, sin base ni servidor, para que `pruebas/` la cubra sin levantar nada.
 *
 * Campos de primer nivel con los nombres estáticos de Wazuh (`srcip`, `srcport`, `dstport`,
 * `srcuser`, `protocol`): así el decodificador JSON los toma como propios y funcionan la
 * geolocalización y la respuesta activa sin reglas extra. El resto va bajo `heimdall.*`.
 */

/** Protocolo según el método que registró la trampa. */
function protocoloDe(method, dstPort) {
  const m = String(method || "").toUpperCase();
  if (["FTP", "SMTP", "SSH", "TCP"].includes(m)) return m.toLowerCase();
  if (dstPort === 443) return "https";
  return "http";
}

/**
 * Categoría del evento y técnica de MITRE ATT&CK más cercana. Es orientativa: le da al analista
 * un punto de partida y a Wazuh un agrupador, no un veredicto.
 */
const CATEGORIA = {
  BRUTE:    { categoria: "autenticacion",   mitre: "T1110" },   // Brute Force
  PORTSCAN: { categoria: "reconocimiento",  mitre: "T1046" },   // Network Service Discovery
  SCAN:     { categoria: "reconocimiento",  mitre: "T1595" },   // Active Scanning
  RECON:    { categoria: "reconocimiento",  mitre: "T1595" },
  CRAWLER:  { categoria: "reconocimiento",  mitre: "T1593" },   // Search Open Websites/Domains
  RESEARCH: { categoria: "reconocimiento",  mitre: "T1595" },
  BOT:      { categoria: "automatizado",    mitre: "T1595" },
  EXPLOIT:  { categoria: "explotacion",     mitre: "T1190" },   // Exploit Public-Facing Application
  HUMAN:    { categoria: "interaccion",     mitre: "T1059" },   // Command and Scripting Interpreter
};

/**
 * Severidad en tres escalas: la propia (texto), la de TheHive (1 a 4) y el nivel de regla de
 * Wazuh (0 a 15) que sugieren las reglas que acompañan al producto.
 */
function severidadDe(score) {
  const s = Number(score) || 0;
  if (s >= 85) return { severidad: "critica", thehive: 4 };
  if (s >= 65) return { severidad: "alta",    thehive: 3 };
  if (s >= 35) return { severidad: "media",   thehive: 2 };
  return { severidad: "baja", thehive: 1 };
}

const vacio = (v) => (v === undefined || v === null || v === "" ? null : v);
const puerto = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 && n < 65536 ? n : null; };

/**
 * Arma el evento normalizado a partir de lo que registró logEvent (y guardó la base).
 * `ev.ts` puede venir como Date o como texto ISO: sale siempre en UTC con zona explícita.
 */
function normalizar(ev, { sensor = null, version = null } = {}) {
  const ts = ev.ts instanceof Date ? ev.ts : new Date(ev.ts || Date.now());
  const dstPort = puerto(ev.dst_port ?? ev.port);
  const cat = CATEGORIA[ev.type] || { categoria: "otro", mitre: null };
  const sev = severidadDe(ev.threat_score);
  const proto = vacio(ev.proto) || protocoloDe(ev.method, dstPort);
  return {
    timestamp: isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString(),
    srcip:    vacio(ev.ip),
    srcport:  puerto(ev.src_port),
    dstport:  dstPort,
    protocol: proto,
    srcuser:  vacio(ev.username),
    heimdall: {
      id:           ev.id != null ? Number(ev.id) : null,
      event_uid:    vacio(ev.event_uid),
      sensor:       vacio(ev.sensor) || sensor,
      version,
      type:         ev.type,
      categoria:    cat.categoria,
      mitre:        cat.mitre,
      severidad:    sev.severidad,
      threat_score: Number(ev.threat_score) || 0,
      method:       vacio(ev.method),
      path:         vacio(ev.path),
      username:     vacio(ev.username),
      password:     vacio(ev.password),
      command:      vacio(ev.command),
      payload:      vacio(ev.payload),
      // `ua` se usó históricamente para otras cosas (el contenido TCP, "FTP client"): acá sale
      // solo lo que de verdad es un agente HTTP o el identificador del cliente SSH.
      user_agent:   proto === "http" || proto === "https" ? vacio(ev.ua ?? ev.user_agent) : null,
      client:       proto === "ssh" && !/^SSH (client|shell)$/.test(ev.ua ?? ev.user_agent ?? "") ? vacio(ev.ua ?? ev.user_agent) : null,
      detail:       vacio(ev.detail),
      portal:       vacio(ev.portal),
      signals:      vacio(ev.signals),
      country:      ev.country === "??" ? null : vacio(ev.country),   // "??" es "sin geolocalización"
      city:         vacio(ev.city),
      internal:     !!Number(ev.internal),
    },
  };
}

/** Saca las claves en null (también dentro de `heimdall`). */
function sinNulos(o) {
  const r = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === null || v === undefined) continue;
    r[k] = v && typeof v === "object" && !Array.isArray(v) ? sinNulos(v) : v;
  }
  return r;
}

/**
 * Una línea JSON por evento, sin saltos internos (los escapa JSON.stringify).
 *
 * 🔴 Sin los campos en null: Wazuh decodifica `null` como el texto "null", y una regla que pide
 * `heimdall.command` con algo adentro disparaba en eventos sin comando. Lo que no hay, no va.
 */
function lineaJson(ev, opciones) {
  return JSON.stringify(sinNulos(normalizar(ev, opciones))) + "\n";
}

module.exports = { normalizar, lineaJson, protocoloDe, severidadDe, CATEGORIA };
