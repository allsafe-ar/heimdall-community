"use strict";
// Envío de las alertas de Heimdall (edición Community).
//
// El cuerpo del correo es el mismo que el de la edición Pro: un aviso que llega a
// las tres de la mañana tiene que leerse igual de bien en las dos.
//
// La configuración vive en la DB (tabla settings, clave alerts_config) y se carga
// desde la pantalla de Alertas, no del código: en la instalación de un cliente el
// servidor de correo es el del cliente. La contraseña se guarda del lado del
// servidor y nunca se devuelve a la interfaz.
const nodemailer = require("nodemailer");

const NAVY   = "#0f1e50";  // el mismo navy de los informes PDF
const ACCENT = "#0064d2";

const NIVELES = {
  critical: { etiqueta: "CRÍTICO", color: "#c81e1e", fondo: "#fdf2f2" },
  high:     { etiqueta: "ALTO",    color: "#b45309", fondo: "#fffbeb" },
  info:     { etiqueta: "AVISO",   color: "#1d4ed8", fondo: "#eff6ff" },
};

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/**
 * Arma el cuerpo HTML de una alerta. Sobrio a propósito: esto llega a las tres de
 * la mañana y tiene que leerse de un vistazo desde un teléfono.
 *
 * @param {object} a
 * @param {string} a.titulo      Qué pasó, en una línea
 * @param {string} a.nivel       critical | high | info
 * @param {string} a.resumen     Un párrafo explicando qué significa
 * @param {Array}  a.datos       [[etiqueta, valor], ...] con el detalle
 * @param {string} a.accion      Qué conviene hacer
 * @param {string} a.host        Dominio o nombre del honeypot
 * @param {string} a.panelUrl    Link al panel
 */
function construirHTML(a) {
  const n = NIVELES[a.nivel] || NIVELES.info;
  const filas = (a.datos || []).map(([k, v]) => `
    <tr>
      <td style="padding:6px 0;color:#6b7280;font-size:13px;width:150px;vertical-align:top">${esc(k)}</td>
      <td style="padding:6px 0;color:#111827;font-size:13px;font-family:ui-monospace,Menlo,Consolas,monospace">${esc(v)}</td>
    </tr>`).join("");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">

        <tr><td style="background:${NAVY};padding:18px 24px">
          <div style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:.2px">Heimdall</div>
          <div style="color:#a0b9e1;font-size:12px;margin-top:2px">AllSafe Security Solutions${a.host ? " · " + esc(a.host) : ""}</div>
        </td></tr>
        <tr><td style="background:${ACCENT};height:3px;font-size:0;line-height:0">&nbsp;</td></tr>

        <tr><td style="padding:22px 24px 8px">
          <span style="display:inline-block;background:${n.fondo};color:${n.color};border:1px solid ${n.color}33;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:.6px">${n.etiqueta}</span>
          <h1 style="margin:12px 0 0;font-size:19px;line-height:1.35;color:#111827;font-weight:700">${esc(a.titulo)}</h1>
        </td></tr>

        <tr><td style="padding:8px 24px 0">
          <p style="margin:0;color:#374151;font-size:14px;line-height:1.6">${esc(a.resumen)}</p>
        </td></tr>

        ${filas ? `<tr><td style="padding:16px 24px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:4px 0">${filas}</table>
        </td></tr>` : ""}

        ${a.accion ? `<tr><td style="padding:16px 24px 0">
          <div style="background:#f9fafb;border-left:3px solid ${ACCENT};padding:12px 14px;border-radius:0 6px 6px 0">
            <div style="color:#6b7280;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;margin-bottom:4px">Qué conviene hacer</div>
            <div style="color:#374151;font-size:13px;line-height:1.6">${esc(a.accion)}</div>
          </div>
        </td></tr>` : ""}

        ${a.panelUrl ? `<tr><td style="padding:20px 24px 0" align="left">
          <a href="${esc(a.panelUrl)}" style="display:inline-block;background:${NAVY};color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px">Ver en el panel</a>
        </td></tr>` : ""}

        <tr><td style="padding:22px 24px 20px">
          <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:14px">
            Alerta automática de Heimdall. Se envía según lo configurado en Alertas, con un intervalo mínimo entre avisos para no saturar la casilla.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

function construirTexto(a) {
  const n = NIVELES[a.nivel] || NIVELES.info;
  const datos = (a.datos || []).map(([k, v]) => `  ${k}: ${v}`).join("\n");
  return [
    `[${n.etiqueta}] ${a.titulo}`,
    "",
    a.resumen,
    datos ? "\n" + datos : "",
    a.accion ? `\nQué conviene hacer:\n  ${a.accion}` : "",
    a.panelUrl ? `\nPanel: ${a.panelUrl}` : "",
    "\n-- \nHeimdall · AllSafe Security Solutions",
  ].filter(Boolean).join("\n");
}

function crearTransporte(cfg) {
  if (!cfg?.host || !cfg?.user) throw new Error("SMTP sin configurar");
  return nodemailer.createTransport({
    host: cfg.host,
    port: Number(cfg.port) || 465,
    secure: cfg.secure !== false,          // 465 con SSL por defecto
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

/**
 * Envía una alerta. Devuelve { ok } o { ok:false, error } — nunca lanza, para que
 * un problema de correo no tumbe la captura, que es lo que el sistema no puede
 * dejar de hacer.
 */
async function enviarAlerta(cfg, alerta) {
  try {
    const destinatarios = (cfg.recipients || "").split(/[,;\s]+/).filter(Boolean);
    if (!destinatarios.length) return { ok: false, error: "Sin destinatarios" };

    const t = crearTransporte(cfg);
    await t.sendMail({
      from: cfg.from || cfg.user,
      to: destinatarios.join(", "),
      subject: `[Heimdall] ${alerta.titulo}`,
      text: construirTexto(alerta),
      html: construirHTML(alerta),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function probarSMTP(cfg) {
  try {
    const t = crearTransporte(cfg);
    await t.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { enviarAlerta, probarSMTP, construirHTML };
