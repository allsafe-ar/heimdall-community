"use strict";
// Threat Intel para IPs — portado/adaptado de Gjallarhorn.
// Cada fuente devuelve un objeto normalizado y nunca lanza hacia arriba.
// Fuentes sin API key (gratis, cacheadas 1h): ASN (Team Cymru DNS), Tor exit nodes,
// FeodoTracker, C2-Tracker.
//
// Edición Community: SOLO las fuentes sin clave. Las de cuenta paga (AbuseIPDB,
// Shodan, GreyNoise), el enriquecimiento en lote y el automático son de la edición
// Pro. Ver el criterio en el README, sección Community vs Pro.
const dns = require("dns").promises;
const { httpRequest, parseJSON } = require("./http");

const isIPv4 = ip => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);

// ── ASN vía Team Cymru (DNS, sin key, sin archivo de datos) ──────────────────
async function lookupASN(ip) {
  if (!isIPv4(ip)) return { source: "ASN", skipped: true };
  try {
    const rev = ip.split(".").reverse().join(".");
    const txt = await dns.resolveTxt(`${rev}.origin.asn.cymru.com`);
    const line = (txt[0] || []).join("");
    // Formato: "15169 | 8.8.8.0/24 | US | arin | 2023-12-28"
    const parts = line.split("|").map(s => s.trim());
    const asn = parseInt((parts[0] || "").split(" ")[0], 10);
    let asOrg = "";
    try {
      const a = await dns.resolveTxt(`AS${asn}.asn.cymru.com`);
      const aline = (a[0] || []).join("");
      asOrg = (aline.split("|").pop() || "").trim().replace(/,?\s*[A-Z]{2}$/, "").trim();
    } catch { /* org opcional */ }
    return Number.isFinite(asn)
      ? { source: "ASN", found: true, asn, as_org: asOrg, prefix: parts[1] || "", country: parts[2] || "" }
      : { source: "ASN", found: false };
  } catch (e) {
    return { source: "ASN", skipped: false, error: e.message };
  }
}

// ── FeodoTracker (sin key, C2 botnet, cache 1h) ──────────────────────────────
let feodoCache = null, feodoCacheTs = 0;
async function queryFeodoTracker(ip) {
  try {
    if (!feodoCache || Date.now() - feodoCacheTs > 3600000) {
      const r = await httpRequest("https://feodotracker.abuse.ch/downloads/ipblocklist.json", { timeout: 20000 });
      if (r.status === 200) { feodoCache = parseJSON(r.data) || []; feodoCacheTs = Date.now(); }
    }
    if (!feodoCache) return { source: "FeodoTracker", skipped: false, error: "No data" };
    const entry = feodoCache.find(e => e.ip_address === ip);
    return { source: "FeodoTracker", found: !!entry, malware: entry?.malware, status: entry?.status, score_contribution: entry ? 70 : 0 };
  } catch (e) {
    return { source: "FeodoTracker", skipped: false, error: e.message };
  }
}

// ── Tor Exit Nodes (sin key, cache 1h) ───────────────────────────────────────
let torCache = null, torCacheTs = 0;
async function queryTorExitNodes(ip) {
  try {
    if (!torCache || Date.now() - torCacheTs > 3600000) {
      const r = await httpRequest("https://check.torproject.org/exit-addresses", { timeout: 20000 });
      if (r.status === 200) {
        const matches = r.data.match(/ExitAddress (\d+\.\d+\.\d+\.\d+)/g) || [];
        torCache = new Set(matches.map(m => m.split(" ")[1]));
        torCacheTs = Date.now();
      }
    }
    if (!torCache) return { source: "Tor", skipped: false, error: "No data" };
    const found = torCache.has(ip);
    return { source: "Tor", found, is_tor: found, score_contribution: found ? 25 : 0 };
  } catch (e) {
    return { source: "Tor", skipped: false, error: e.message };
  }
}

// ── C2-Tracker (sin key, GitHub feeds, cache 1h) ─────────────────────────────
const C2_FEED_URLS = [
  "https://raw.githubusercontent.com/montysecurity/C2-Tracker/main/data/Cobalt%20Strike%20C2%20IPs.txt",
  "https://raw.githubusercontent.com/montysecurity/C2-Tracker/main/data/Metasploit%20Framework%20C2%20IPs.txt",
  "https://raw.githubusercontent.com/montysecurity/C2-Tracker/main/data/Sliver%20C2%20IPs.txt",
  "https://raw.githubusercontent.com/montysecurity/C2-Tracker/main/data/Havoc%20C2%20IPs.txt",
  "https://raw.githubusercontent.com/montysecurity/C2-Tracker/main/data/Brute%20Ratel%20C2%20IPs.txt",
];
let c2Cache = null, c2CacheTs = 0;
async function queryC2Trackers(ip) {
  try {
    if (!c2Cache || Date.now() - c2CacheTs > 3600000) {
      const results = await Promise.allSettled(C2_FEED_URLS.map(u => httpRequest(u, { timeout: 15000 })));
      const all = new Set();
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.status === 200) {
          r.value.data.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#")).forEach(i => all.add(i));
        }
      }
      c2Cache = all; c2CacheTs = Date.now();
    }
    if (!c2Cache) return { source: "C2-Tracker", skipped: false, error: "No data" };
    const found = c2Cache.has(ip);
    return { source: "C2-Tracker", found, score_contribution: found ? 65 : 0 };
  } catch (e) {
    return { source: "C2-Tracker", skipped: false, error: e.message };
  }
}

// ── Orquestador: enriquece una IP y consolida un perfil ──────────────────────
async function enrichIP(ip) {
  const settled = await Promise.allSettled([
    lookupASN(ip),
    queryFeodoTracker(ip),
    queryTorExitNodes(ip),
    queryC2Trackers(ip),
  ]);
  const sources = settled.map(r => r.status === "fulfilled" ? r.value : { source: "unknown", error: r.reason?.message });
  const by = name => sources.find(s => s.source === name) || {};

  const asn   = by("ASN");
  const feodo = by("FeodoTracker");
  const tor   = by("Tor");
  const c2    = by("C2-Tracker");

  const is_tor = !!tor.is_tor;

  // Score consolidado = el mayor aporte entre las fuentes (cap 100)
  const intel_score = Math.min(100, Math.max(
    feodo.score_contribution || 0, tor.score_contribution || 0, c2.score_contribution || 0,
  ));

  // Reputación derivada
  let reputation = "clean";
  if (feodo.found || c2.found) {
    reputation = "malicious";
  } else if (is_tor) {
    reputation = "tor";
  }

  return {
    ip,
    asn: asn.asn || null,
    as_org: asn.as_org || null,
    feodo_malware: feodo.malware || null,
    is_tor,
    reputation, intel_score,
    sources,
  };
}

// ── Health-check de integraciones (para la página de Administración) ─────────
// Devuelve el estado de cada fuente: ok (verde) / no_key / error / down.
async function checkIntegrations(apiKeys = {}) {
  async function ping(fn) {
    try { return await fn(); } catch (e) { return { status: "error", detail: e.message }; }
  }

  const checks = {
    asn: ping(async () => {
      const r = await lookupASN("8.8.8.8");
      return r.found ? { status: "ok", detail: `AS${r.asn}` } : { status: "error", detail: "sin respuesta" };
    }),
    tor: ping(async () => {
      const r = await queryTorExitNodes("0.0.0.0");
      return r.error ? { status: "error", detail: r.error } : { status: "ok", detail: `${torCache ? torCache.size : 0} nodos` };
    }),
    feodo: ping(async () => {
      const r = await queryFeodoTracker("0.0.0.0");
      return r.error ? { status: "error", detail: r.error } : { status: "ok", detail: `${feodoCache ? feodoCache.length : 0} IPs C2` };
    }),
    c2: ping(async () => {
      const r = await queryC2Trackers("0.0.0.0");
      return r.error ? { status: "error", detail: r.error } : { status: "ok", detail: `${c2Cache ? c2Cache.size : 0} IPs` };
    }),
  };

  const META = {
    asn:       { name: "ASN (Team Cymru)", needs_key: false, kind: "Geolocalización ASN" },
    tor:       { name: "Tor Exit Nodes",   needs_key: false, kind: "Anonimato" },
    feodo:     { name: "FeodoTracker",      needs_key: false, kind: "C2 / Botnet" },
    c2:        { name: "C2-Tracker",        needs_key: false, kind: "C2 frameworks" },
  };

  const ids = Object.keys(META);
  const results = await Promise.all(ids.map(id => checks[id]));
  return ids.map((id, i) => ({
    id, ...META[id],
    configured: META[id].needs_key ? !!apiKeys[id] : true,
    ...results[i],
  }));
}

module.exports = { enrichIP, checkIntegrations };
