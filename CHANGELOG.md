# Changelog

All notable changes to Heimdall Community are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); versioning follows [SemVer](https://semver.org/).

## [1.0.1] - 2026-06-05

### Security
- `docker-compose.yml` now **requires** `DB_PASSWORD`, `DB_ROOT_PASSWORD` and `JWT_SECRET` (no known default secrets). Added root `.env.example`.

### Changed
- JWT expiry aligned to **12h** (was 24h).
- `install.sh`: now `chown`s the install dir, excludes `.git/`, `node_modules/`, `screenshots/` from `/opt`, and offers optional Let's Encrypt TLS when a real domain is provided.

## [1.0.0]
- Initial public release: 4 honeypot templates, HTTP/HTTPS decoys, real-time WebSocket dashboard, threat scoring, IP list & geolocation, JWT + TOTP 2FA + account lockout.
