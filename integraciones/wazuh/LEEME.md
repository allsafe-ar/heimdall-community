# Heimdall en Wazuh

Heimdall escribe cada evento del honeypot en un registro JSON, una línea por evento. Este directorio
trae lo necesario para que Wazuh lo lea, lo decodifique y genere alertas.

## Qué hay

| Archivo | Dónde va |
|---|---|
| `ossec-localfile.xml` | En el **agente** de Wazuh instalado en el servidor de Heimdall, dentro de `ossec.conf` |
| `heimdall_rules.xml` | En el **manager**, en `/var/ossec/etc/rules/` |

No hace falta un decodificador propio: el registro es JSON y Wazuh lo decodifica con el suyo.

## El registro

- Ruta por defecto: `backend/logs/eventos.json` dentro de la instalación de Heimdall
  (con el script de instalación, `/opt/heimdall/backend/logs/eventos.json`; con Docker,
  `./logs/eventos.json` al lado de `docker-compose.yml`). La ruta de `ossec-localfile.xml` se ajusta a la que corresponda.
- Se cambia con `HEIMDALL_EVENT_LOG` en el `.env`; con `off` se apaga.
- Rota solo por tamaño (`HEIMDALL_EVENT_LOG_MAX_MB`, 50 por defecto) y conserva
  `HEIMDALL_EVENT_LOG_KEEP` archivos (5 por defecto). No necesita logrotate.
- `HEIMDALL_SENSOR` le pone nombre al sensor (por defecto, el nombre del servidor). Con varios
  Heimdall en el mismo Wazuh, es lo que dice de dónde vino cada evento.

Ejemplo de línea:

```json
{"timestamp":"2026-10-24T15:00:00.000Z","srcip":"203.0.113.7","srcport":51515,"dstport":22,"protocol":"ssh","srcuser":"root","heimdall":{"id":4211,"event_uid":"6f1c…","sensor":"heimdall-prod","version":"2.8.0","type":"BRUTE","categoria":"autenticacion","mitre":"T1110","severidad":"alta","threat_score":80,"method":"SSH","username":"root","password":"toor123","client":"SSH-2.0-libssh_0.9.6","country":"NL","internal":false}}
```

Los campos `srcip`, `srcport`, `dstport`, `protocol` y `srcuser` usan los nombres propios de Wazuh,
así funcionan la geolocalización y la respuesta activa (por ejemplo `firewall-drop` sobre `srcip`)
sin configuración extra. El resto va bajo `heimdall.*`.

## Reglas

| Id | Nivel | Qué |
|---|---|---|
| 110100 | 0 | Base: cualquier evento de Heimdall |
| 110101 | 0 | Actividad desde una IP propia (allowlist): no alerta |
| 110110 | 3 | Reconocimiento (SCAN, RECON, CRAWLER, RESEARCH, BOT) |
| 110111 | 5 | Escaneo de puertos |
| 110120 | 5 | Intento de acceso con credenciales |
| 110121 | 10 | Fuerza bruta sostenida: 8 intentos de la misma IP en 2 minutos |
| 110130 | 12 | Intento de explotación |
| 110140 | 12 | Comando ejecutado en el shell señuelo (solo Pro: la Community no tiene shell) |
| 110141 | 8 | Interacción manual |
| 110150 | 13 | Cualquiera de las anteriores con puntaje crítico |

Las reglas llevan su técnica de MITRE ATT&CK.

## Verificar

En el manager, con una línea del registro:

```bash
/var/ossec/bin/wazuh-logtest
```

Pegar la línea: tiene que decodificarla como `json` y disparar la regla que corresponda.

## Con Gjallarhorn

Si Gjallarhorn está conectado a este Wazuh, las alertas de nivel 12 o más con IP externa entran a
su correlación automática y abren caso. Para traer los eventos de Heimdall sin pasar por Wazuh,
Gjallarhorn tiene además un conector directo por API (token de integración de Heimdall).
