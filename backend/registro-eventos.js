"use strict";
/**
 * Registro de eventos en disco, una línea JSON por evento, para que lo lea un SIEM (Wazuh con
 * `log_format json`, o cualquier colector de archivos).
 *
 * 🔑 Es una copia de lo que ya quedó en la base, no la fuente: si el disco falla, el evento está
 * igual en `events` y el señuelo sigue respondiendo. Por eso un error de escritura se avisa una
 * vez y no se propaga nunca.
 *
 * Rotación propia por tamaño (`eventos.json` → `.1` → `.2` …), así no depende de que el
 * servidor tenga logrotate configurado. El agente de Wazuh sigue el archivo por nombre y detecta
 * el cambio de inodo, así que no pierde líneas al rotar.
 *
 * Variables:
 *   HEIMDALL_EVENT_LOG          ruta del archivo (por defecto backend/logs/eventos.json); "off" lo apaga
 *   HEIMDALL_EVENT_LOG_MAX_MB   tamaño que dispara la rotación (por defecto 50)
 *   HEIMDALL_EVENT_LOG_KEEP     cuántos archivos rotados se conservan (por defecto 5)
 */
const fs = require("fs");
const path = require("path");
const { lineaJson } = require("./evento-normalizado");

function crearRegistro({ ruta, maxBytes, conservar, sensor, version } = {}) {
  const destino = ruta === undefined ? (process.env.HEIMDALL_EVENT_LOG || path.join(__dirname, "logs", "eventos.json")) : ruta;
  const activo = !!destino && destino !== "off";
  const tope = maxBytes || (Number(process.env.HEIMDALL_EVENT_LOG_MAX_MB) || 50) * 1024 * 1024;
  const guardar = conservar || Number(process.env.HEIMDALL_EVENT_LOG_KEEP) || 5;
  let tam = 0, avisado = false, listo = false, escritas = 0, ultimoError = null;

  function preparar() {
    if (listo) return;
    fs.mkdirSync(path.dirname(destino), { recursive: true, mode: 0o750 });
    try { tam = fs.statSync(destino).size; } catch { tam = 0; }
    listo = true;
  }

  function rotar() {
    for (let i = guardar - 1; i >= 1; i--) {
      try { fs.renameSync(`${destino}.${i}`, `${destino}.${i + 1}`); } catch { /* no existía */ }
    }
    try { fs.renameSync(destino, `${destino}.1`); } catch { /* no existía */ }
    try { fs.unlinkSync(`${destino}.${guardar + 1}`); } catch { /* no existía */ }
    tam = 0;
  }

  /**
   * Escritura sincrónica a propósito: con appendFile asíncrono, dos eventos simultáneos durante
   * una rotación podían quedar en el archivo viejo o intercalados. Una línea pesa menos de 4 KB.
   */
  function escribir(ev) {
    if (!activo) return;
    try {
      preparar();
      const linea = lineaJson(ev, { sensor, version });
      if (tam + linea.length > tope) rotar();
      fs.appendFileSync(destino, linea, { mode: 0o640 });
      tam += Buffer.byteLength(linea);
      escritas++;
    } catch (e) {
      ultimoError = e.message;
      if (!avisado) { console.warn(`[registro] no se pudo escribir ${destino}: ${e.message}`); avisado = true; }
    }
  }

  function estado() {
    let bytes = null;
    try { bytes = fs.statSync(destino).size; } catch { /* todavía no existe */ }
    return { activo, ruta: activo ? destino : null, bytes, max_bytes: tope, conservar: guardar, escritas, error: ultimoError };
  }

  return { escribir, estado };
}

module.exports = { crearRegistro };
