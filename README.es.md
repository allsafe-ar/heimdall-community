[![English](https://img.shields.io/badge/lang-en-blue)](README.md)

<div align="center">
  <img src="logo.png" alt="Heimdall Logo" width="500"/>

  # Heimdall Community — Monitor de Honeypot Web

  **Plataforma de honeypot web en tiempo real — libre y open source**

  *Powered by [AllSafe Security Solutions](https://www.allsafe.com.ar)*

  ![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)
  ![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
  ![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=flat-square&logo=mysql&logoColor=white)
  ![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)
  ![Version](https://img.shields.io/badge/Version-Community-blue?style=flat-square)
</div>

---

Heimdall Community es una plataforma de honeypot web libre y open source con dashboard en tiempo real. Despliega servicios falsos que registran cada interacción — intentos de fuerza bruta, escáneres, bots e intrusos humanos — siendo completamente invisible para el tráfico legítimo.

> El nombre viene de Heimdall — el dios Aesir que guarda el puente Bifrost en la mitología nórdica. Todo lo ve y todo lo escucha, sin dormir jamás.

---

## Instalación

### Opción A — Script de instalación (recomendado)

```bash
git clone https://github.com/allsafe-ar/heimdall-community.git
cd heimdall-community
chmod +x install.sh && sudo ./install.sh
```

### Opción B — Docker

```bash
git clone https://github.com/allsafe-ar/heimdall-community.git
cd heimdall-community
cp backend/.env.example backend/.env
docker compose up -d
```

### Opción C — Manual

```bash
cd backend && npm install && cp .env.example .env && npm start
cd frontend-shadcn && npm install && npm run build
```

Credenciales por defecto: `admin` / `admin123` — **cambiar inmediatamente**.

---

## Funcionalidades

- Templates de honeypot: WordPress, cPanel, Portal Corporativo, Login genérico
- Scoring de amenazas: BRUTE / SCAN / BOT / PORTSCAN / RECON / HUMAN
- Dashboard en tiempo real via WebSocket
- Perfil de IP con línea de tiempo de ataques
- Roles: admin / analista / auditor / viewer
- TOTP 2FA, lockout de cuentas, audit log

---

## Autor

Creado por **Eduardo Emiliano Alaniz** ([@h4wkby73](https://github.com/h4wkby73))
[AllSafe Security Solutions](https://www.allsafe.com.ar)

---

## Licencia

GNU Affero General Public License v3.0 — ver archivo [LICENSE](LICENSE).

---

## Seguridad

¿Encontraste una vulnerabilidad? Reportala de forma privada — ver [SECURITY.md](SECURITY.md).

---

<div align="center">
  <sub>Powered by <a href="https://www.allsafe.com.ar">AllSafe Security Solutions</a></sub>
</div>
