[![Español](https://img.shields.io/badge/lang-es-blue)](README.es.md)

<div align="center">
  <img src="logo.png" alt="Heimdall Logo" width="500"/>

  # Heimdall Community - Web Honeypot Monitor

  **Real-time web honeypot platform - free and open source**

  *Powered by [AllSafe Security Solutions](https://www.allsafe.com.ar)*

  ![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)
  ![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
  ![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=flat-square&logo=mysql&logoColor=white)
  ![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)
  ![Version](https://img.shields.io/badge/Version-Community-blue?style=flat-square)

  [![Website](https://img.shields.io/badge/Website-allsafe.com.ar%2Fen%2Fheimdall--community-f5a623?style=for-the-badge&labelColor=1e324d)](https://allsafe.com.ar/en/heimdall-community/)
</div>

---

Heimdall Community is a free, open-source web honeypot platform with a real-time dashboard. It deploys fake services (login portals, admin panels, APIs) that log every interaction - brute-force attempts, scanners, bots, and human intruders - while remaining completely invisible to legitimate traffic.

> The name comes from Heimdall - the Aesir god who guards the Bifrost bridge in Norse mythology. He sees all and hears all, never sleeping.

---

## What is Heimdall Community?

Heimdall Community gives your Blue Team full visibility over who is probing your infrastructure:

- **4 honeypot templates** - WordPress, cPanel, CorpNet Portal, Microsoft
- **HTTP & HTTPS decoys** - Ports 80 and 443 with self-signed certificate support
- **Threat scoring** - Each event gets a risk classification: BRUTE / SCAN / BOT / RECON / HUMAN
- **Real-time dashboard** - Live event feed via WebSocket with pause/resume without missing events
- **Cyber Attack Map** - Real-time world map of attack origins with animated attack arcs converging on the defended host
- **IP list** - Aggregated view of attacking IPs with hit counts and geolocation
- **Event history** - Paginated table with filter by type
- **Statistics** - Total events, unique IPs, top attackers, attack breakdown by type
- **Security reports** - Executive PDF reports with an auto-generated plain-language verdict, event breakdown, top attackers and targeted paths
- **Guide & glossary** - Built-in reference explaining every attack type and system term in plain language
- **Role-based access** - `admin` / `viewer`
- **User management** - Create, edit, enable/disable users
- **TOTP 2FA** - RFC 6238, setup via QR code
- **Dark / Light / System theme**

> Looking for **more honeypot templates**, a **custom template builder**, **TCP trap ports** (nmap/masscan/zgrab detection), the **IP Profiler**, **threat intelligence** (IP enrichment with AbuseIPDB / Shodan / Tor / C2 feeds), or **audit logs**? Those are available in [Heimdall Pro](https://www.allsafe.com.ar).

---

## Community vs Pro

| Feature | Community | Pro |
|---|:---:|:---:|
| HTTP & HTTPS decoys (ports 80 / 443) | ✅ | ✅ |
| Real-time WebSocket dashboard | ✅ | ✅ |
| Cyber Attack Map (live world map with attack arcs) | ✅ | ✅ |
| Security reports (executive PDF export) | ✅ | ✅ |
| Guide & glossary | ✅ | ✅ |
| Threat scoring (BRUTE / SCAN / BOT / RECON / HUMAN) | ✅ | ✅ |
| Event history, statistics & IP geolocation | ✅ | ✅ |
| TOTP 2FA + account lockout | ✅ | ✅ |
| Dark / Light / System theme | ✅ | ✅ |
| Honeypot templates | 4 | 8+ |
| Custom template builder (logo / colors / labels / text) | ❌ | ✅ |
| TCP trap ports (nmap / masscan / zgrab detection) | ❌ | ✅ |
| PORTSCAN classification | ❌ | ✅ |
| Exploit detection (SQLi / path traversal / Log4Shell / RCE / webshell) | ❌ | ✅ |
| Interactive FTP / SMTP / SSH credential traps | ❌ | ✅ |
| Interactive SSH shell (fake shell) | ❌ | ✅ |
| Realistic randomized service banners (anti honeypot-fingerprint) | ❌ | ✅ |
| Configurable decoy ports (live, from the admin UI) | ❌ | ✅ |
| IP Profiler (per-IP attack timeline & threat level) | ❌ | ✅ |
| Behavioral IP scoring (cumulative risk per IP) | ❌ | ✅ |
| Campaign detection (credential stuffing, distributed attacks) | ❌ | ✅ |
| Threat intelligence (IP enrichment: ASN, reputation, AbuseIPDB, Shodan, Tor & C2 feeds) | ❌ | ✅ |
| Audit log | ❌ | ✅ |
| Custom branding (organization logo) | ❌ | ✅ |
| Roles | `admin` / `viewer` | `admin` / `analista` / `auditor` / `viewer` |

> **Upgrade path**: Community and Pro share the same database schema. Upgrading = replace files + `npm install` + `pm2 restart`. No migration needed.

---

## Screenshots

<div align="center">

**Real-time Dashboard**
<br/>
<img src="screenshots/dashboard-v2.png" alt="Real-time Dashboard" width="900"/>

<br/><br/>

**Event History**
<br/>
<img src="screenshots/tabla-v2.png" alt="Event Table" width="900"/>

<br/><br/>

**Attacker IP Profile**
<br/>
<img src="screenshots/ip-v2.png" alt="Attacker IP Profile" width="900"/>

</div>

---

## Installation

### Option A - Install script (recommended for Linux servers)

```bash
git clone https://github.com/allsafe-ar/heimdall-community.git
cd heimdall-community
chmod +x install.sh && sudo ./install.sh
```

Tested on Ubuntu 22.04 / 24.04 and Debian 12.

### Option B - Docker

```bash
git clone https://github.com/allsafe-ar/heimdall-community.git
cd heimdall-community
cp .env.example .env
# Edit .env: set DB_PASSWORD, DB_ROOT_PASSWORD and JWT_SECRET (openssl rand -hex 32)
docker compose up -d
```

### Option C - Manual

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env: DB credentials + strong JWT_SECRET (min 32 chars)
npm start   # port 3005

# Frontend
cd frontend
npm install
npm run build   # Production build → dist/
```

Default credentials (first run): `admin` / `admin123` - **change immediately**.

---

## Architecture

```
heimdall-community/
├── backend/
│   ├── server.js       # Single-file backend - honeypot engine + REST API + WebSocket
│   ├── templates/      # HTML decoy pages served as honeypots
│   └── .env.example
└── frontend/
    └── src/
        ├── pages/      # Dashboard, Events, IPs, Users, My Account
        ├── components/ # StatsBar, TerminalCard, EventTable, IpListView, ...
        └── lib/        # socket, api, cookies
```

### Backend

- Single-file Express server (`server.js`)
- MySQL 8.0+ - tables auto-created on first start
- JWT authentication (12h expiry), TOTP 2FA, account lockout
- WebSocket (Socket.IO) for live event streaming
- Honeypot engine: captures IP, User-Agent, path, method, body - assigns threat score
- Rate limiting: 5 failed logins → 15-min lockout; 300 req/15 min per IP

### Frontend

- React 18 + Vite + TypeScript
- shadcn/ui components + Tailwind CSS v4
- Real-time feed capped at 2000 events in memory
- Pause/resume live feed without losing events (internal buffer)

---

## Honeypot Templates

| Template | Simulates |
|----------|-----------|
| `generic` | CorpNet Portal - corporate employee login |
| `wordpress` | WordPress wp-admin login |
| `cpanel` | cPanel hosting panel |
| `microsoft` | Microsoft account login |

The active template is switchable from the dashboard without restart.

---

## Threat Classification

| Type | Description |
|------|-------------|
| `BRUTE` | Repeated login attempts - credential stuffing or brute force |
| `SCAN` | Path enumeration / vulnerability scanning |
| `BOT` | Automated bot - scraping or probing |
| `RECON` | Reconnaissance - info gathering |
| `HUMAN` | Likely manual interaction |

---

## Roles

| Role | Capabilities |
|------|-------------|
| `admin` | Full access - users, settings, all events |
| `viewer` | Dashboard - read-only view of events and stats |

---

## Security & Auth

The honeypot decoy endpoints are intentionally open — that is the whole point — but the **dashboard and management API are locked down** with the same hardening baseline as the commercial AllSafe suite:

- **JWT** — 12h expiry with `token_version` revocation on password change or user disable
- **TOTP 2FA** — RFC 6238, setup via QR code
- **Account lockout** — 5 failed attempts → 15-minute lockout, **persisted in the database** (survives restarts)
- **bcrypt** password hashing (per-user salt)
- **Security headers** (Helmet) + **HTTP rate limiting** — 300 req/15 min on the API, auth endpoints throttled to 10/15 min
- **Role-based access control** — `admin` / `viewer`
- **100% parameterized SQL** — no string-built queries, no injection vectors (OWASP Top 10 2021)
- **Fail-fast startup** — the backend refuses to boot with a missing, default or too-short `JWT_SECRET`
- **CORS** locked to the configured origin (no wildcard)

---

## Roadmap

- SSH honeypot (port 22, fake shell) with command logging
- Interactive Telnet fake shell
- Email / webhook alerts when score exceeds threshold
- CSV / JSON event export
- Geographic attack heatmap
- Automatic IP blacklist via iptables

---

## Author

Created by **Eduardo Emiliano Alaniz** ([@h4wkby73](https://github.com/h4wkby73))
[AllSafe Security Solutions](https://www.allsafe.com.ar)

---

## Trademark Notice

The names "AllSafe", "AllSafe Security Solutions", "Heimdall" and all associated logos are trademarks of AllSafe Security Solutions. The AGPL-3.0 license covering this software does not grant any rights to use these names or logos. You may not use them to identify, endorse or promote products derived from this software without prior written permission from AllSafe Security Solutions.

---

## License

GNU Affero General Public License v3.0 - see [LICENSE](LICENSE) file.

If you modify and deploy Heimdall Community as a service, you must publish your modifications under the same license.

---

## Security

Found a vulnerability? Please report it privately - see [SECURITY.md](SECURITY.md).

---

<div align="center">
  <sub>Powered by <a href="https://www.allsafe.com.ar">AllSafe Security Solutions</a></sub>
</div>
