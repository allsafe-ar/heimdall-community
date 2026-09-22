# Changelog

All notable changes to Heimdall Community are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); versioning follows [SemVer](https://semver.org/).

## [1.4.1] - 2026-09-22

### Security
- Dependencies back to **0 known vulnerabilities**. `express` moved up to 4.22.3, which is the first release that pins a `qs` outside the vulnerable range, plus transitive bumps within the declared ranges. No application code changed.

## [1.4.0] - 2026-08-18

### Added
- **Email alerts.** A honeypot that captures and stays quiet leaves you unable to tell whether nothing happened or the sensor is dead. Community now warns about the two things you cannot miss: a **critical attack** (exploitation attempt or brute force against the decoy) and a **silent sensor** (no traffic for more than X hours). Same branded email body as Pro, minimum interval between notices, test button and delivery history.
- **Allowlist for your own IPs.** Your team's traffic is still captured, but flagged as internal: it does not raise alerts and does not count in the report.

> Pro adds picking alerts by event type (human visit, campaign, captured credentials), automatic threat intel enrichment and the blocklist feed.

## [1.3.0] - 2026-08-18

Cataloguing quality is the **same in both editions**. What Pro adds is depth. A honeypot that labels traffic wrongly is defective, not a free version.

### Added
- **EXPLOIT category** (SQLi, path traversal, Log4Shell, RCE, webshell), which used to be Pro-only. It is the most conclusive thing a honeypot can say.
- **CRAWLER (score 5) and RESEARCH (15) categories.** Flagging Googlebot as a threat is a cataloguing mistake, not a paid feature.
- **Threat intel from key-free sources**: ASN (Team Cymru), Tor exit nodes, FeodoTracker and C2-Tracker. Nothing to configure and nothing to pay. New `ip_intel` table and endpoints `GET /api/ip/:ip`, `POST /api/ip/:ip/enrich` (admin, audited) and `GET /api/integrations/status`.
- **`events.signals` column**, which makes the HUMAN verdict auditable.

### Changed
- **HUMAN no longer relies on the user agent.** It now requires the headers a real browser sends on its own, with a threshold that depends on the scheme, because `Sec-Fetch-*` and `Sec-CH-UA` are only sent to secure origins.
- `robots.txt`, `sitemap.xml`, `favicon.ico` and `security.txt` removed from `SCAN_PATHS`: they are what every browser and every legitimate crawler asks for.

> AbuseIPDB, Shodan, GreyNoise, bulk enrichment and automatic enrichment stay in Pro.

## [1.2.1] - 2026-08-18

### Fixed
- **The honeypot was not logging visits to its own front door.** Three `app.get` handlers served the decoy and returned before the catch-all, which is the only place that calls `logEvent`. Every GET to the root was lost silently, and it is the most frequent event a honeypot receives.
- **A double slash evaded scan detection.** Scanners request `//xmlrpc.php` and `//wp-includes/wlwmanifest.xml`, and `SCAN_PATHS` matched exactly, so those scans were counted as human visits. Paths are now normalised and `SCAN_PATTERNS` matches by sensitive-file family (`.env.local`, `/api/.env`, `.git/`, `wp-*`, `actuator/`...).
- A sensitive path now outweighs the user agent, and `detail` stores the query string instead of a copy of `user_agent`, which already has its own column.

### Security
- Dependencies back to **0 known vulnerabilities** (jspdf 2.5 → 4.2.1, vite 5 → 8.2.1, plugin-react 4 → 6, plus transitive bumps).

## [1.2.0] - 2026-06-26

### Added
- **Guide & glossary**: built-in reference page explaining every attack type (BRUTE, SCAN, BOT, RECON, HUMAN) and system concept (honeypot, credential stuffing, etc.) in plain language, bilingual (ES/EN), with search.
- **Security reports**: executive report with an auto-generated plain-language verdict and event/IP/path/country breakdown, exportable to a branded PDF (navy header + AllSafe logo). New endpoint `GET /heimdall/api/report`.

## [1.1.0] - 2026-06-26

### Added
- **Cyber Attack Map**: real-time world map (flat planisphere, fully offline — no external tiles) showing attack origins, with animated attack arcs that travel from each origin to the defended host, a time-range filter (24h / 7d / 30d / all) and a top-countries panel. Powered by `d3-geo` + `topojson-client` + `world-atlas`.
- `events` table now stores `lat`/`lon` (additive migration + one-time backfill of historical rows from geoip-lite). New endpoint `GET /heimdall/api/geo`.

## [1.0.1] - 2026-06-05

### Security
- `docker-compose.yml` now **requires** `DB_PASSWORD`, `DB_ROOT_PASSWORD` and `JWT_SECRET` (no known default secrets). Added root `.env.example`.

### Changed
- JWT expiry aligned to **12h** (was 24h).
- `install.sh`: now `chown`s the install dir, excludes `.git/`, `node_modules/`, `screenshots/` from `/opt`, and offers optional Let's Encrypt TLS when a real domain is provided.

## [1.0.0]
- Initial public release: 4 honeypot templates, HTTP/HTTPS decoys, real-time WebSocket dashboard, threat scoring, IP list & geolocation, JWT + TOTP 2FA + account lockout.
