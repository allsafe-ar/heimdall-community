import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, Search } from 'lucide-react'

// Contenido bilingüe. pro:true => feature de Pro (se marca con badge).
const SECTIONS = [
  {
    id: 'event-types',
    es: 'Tipos de evento', en: 'Event types',
    terms: [
      { k: 'EXPLOIT', pro: true, color: 'text-pink-400',
        es: { t: 'EXPLOIT', d: 'Intento de explotación real: SQL injection, path traversal, Log4Shell, ejecución remota de comandos (RCE) o subida de webshell. Es lo más serio: alguien no solo está mirando, está intentando romper algo. Si ves EXPLOIT desde una IP, conviene revisarla.' },
        en: { t: 'EXPLOIT', d: 'A real exploitation attempt: SQL injection, path traversal, Log4Shell, remote command execution (RCE) or webshell upload. This is the most serious one: someone is not just looking, they are trying to break in. If you see EXPLOIT from an IP, it is worth reviewing.' } },
      { k: 'BRUTE', color: 'text-red-400',
        es: { t: 'BRUTE (fuerza bruta)', d: 'Intentos repetidos de inicio de sesión probando usuarios y contraseñas. Suele ser un bot o herramienta automática (hydra, medusa) probando credenciales comunes. Las credenciales que prueban quedan capturadas.' },
        en: { t: 'BRUTE (brute force)', d: 'Repeated login attempts trying usernames and passwords. Usually a bot or automated tool (hydra, medusa) testing common credentials. The credentials they try are captured.' } },
      { k: 'PORTSCAN', pro: true, color: 'text-purple-400',
        es: { t: 'PORTSCAN', d: 'Alguien escaneó varios puertos de tu servidor en poco tiempo buscando qué servicios tenés expuestos (nmap, masscan). Es el paso previo a elegir un objetivo.' },
        en: { t: 'PORTSCAN', d: 'Someone scanned several ports of your server in a short time to find which services you expose (nmap, masscan). It is the step before picking a target.' } },
      { k: 'SCAN', color: 'text-orange-400',
        es: { t: 'SCAN (escaneo)', d: 'Sondeo de rutas y archivos buscando vulnerabilidades conocidas: archivos .env expuestos, repos .git, paneles de WordPress, phpMyAdmin, etc. Es masivo y automático: le pegan a millones de IPs por día.' },
        en: { t: 'SCAN', d: 'Probing of paths and files looking for known vulnerabilities: exposed .env files, .git repos, WordPress panels, phpMyAdmin, etc. It is massive and automated: they hit millions of IPs per day.' } },
      { k: 'BOT', color: 'text-yellow-400',
        es: { t: 'BOT', d: 'Tráfico de un bot automatizado (scraper, crawler o herramienta identificada por su User-Agent). No es necesariamente malicioso, pero no es una persona real.' },
        en: { t: 'BOT', d: 'Traffic from an automated bot (scraper, crawler or a tool identified by its User-Agent). Not necessarily malicious, but not a real person.' } },
      { k: 'RECON', color: 'text-blue-400',
        es: { t: 'RECON (reconocimiento)', d: 'Recopilación de información sobre el servidor sin atacar todavía: ver qué responde, qué tecnología usa. Es la fase de "estudiar el terreno".' },
        en: { t: 'RECON', d: 'Information gathering about the server without attacking yet: seeing what responds, what technology it runs. The "study the terrain" phase.' } },
      { k: 'HUMAN', color: 'text-green-400',
        es: { t: 'HUMAN (humano)', d: 'Interacción que parece de un navegador real (con sus cabeceras típicas). Puede ser una persona curioseando o un bot bien disfrazado. No implica peligro por sí solo.' },
        en: { t: 'HUMAN', d: 'Interaction that looks like a real browser (with its typical headers). Could be a person poking around or a well-disguised bot. Not dangerous by itself.' } },
    ],
  },
  {
    id: 'concepts',
    es: 'Cómo funciona Heimdall', en: 'How Heimdall works',
    terms: [
      { k: 'honeypot',
        es: { t: 'Honeypot', d: 'Un señuelo: un sistema falso diseñado para que los atacantes lo ataquen a él en vez de a tus servicios reales. Todo lo que llega a un honeypot es, por definición, sospechoso: nadie legítimo tiene por qué entrar ahí. Sirve para ver quién te está sondeando y cómo, sin riesgo.' },
        en: { t: 'Honeypot', d: 'A decoy: a fake system designed so attackers go after it instead of your real services. Everything that reaches a honeypot is, by definition, suspicious: no legitimate user has any reason to be there. It lets you see who is probing you and how, with no risk.' } },
      { k: 'decoy',
        es: { t: 'Señuelo / Template', d: 'La página falsa que ve el atacante (un login de WordPress, cPanel, etc.). Parece real para mantenerlo enganchado mientras registramos todo lo que hace.' },
        en: { t: 'Decoy / Template', d: 'The fake page the attacker sees (a WordPress login, cPanel, etc.). It looks real to keep them engaged while we log everything they do.' } },
      { k: 'decoy-ports', pro: true,
        es: { t: 'Puertos cebo', d: 'Además de la web, Heimdall abre puertos falsos de servicios comunes (SSH, FTP, bases de datos) para detectar escaneos y capturar intentos de ataque a esos servicios.' },
        en: { t: 'Decoy ports', d: 'Beyond the web, Heimdall opens fake ports for common services (SSH, FTP, databases) to detect scans and capture attack attempts against those services.' } },
      { k: 'proto-traps', pro: true,
        es: { t: 'Trampas de protocolo', d: 'Servicios FTP / SMTP / SSH emulados que mantienen una conversación falsa con el atacante para capturar las credenciales que prueba, sin ejecutar nada real (sandbox total).' },
        en: { t: 'Protocol traps', d: 'Emulated FTP / SMTP / SSH services that hold a fake conversation with the attacker to capture the credentials they try, without executing anything real (fully sandboxed).' } },
    ],
  },
  {
    id: 'detection',
    es: 'Detección avanzada', en: 'Advanced detection',
    terms: [
      { k: 'cred-stuffing', pro: true,
        es: { t: 'Credential stuffing', d: 'Cuando la MISMA credencial (usuario:contraseña) se prueba desde VARIAS IPs distintas. Es la huella de un ataque con listas de credenciales filtradas en brechas, rociadas por una botnet. Distinto de la fuerza bruta normal (una sola IP insistiendo).' },
        en: { t: 'Credential stuffing', d: 'When the SAME credential (username:password) is tried from SEVERAL different IPs. It is the fingerprint of an attack using credential lists leaked in breaches, sprayed by a botnet. Different from normal brute force (a single IP insisting).' } },
      { k: 'distributed', pro: true,
        es: { t: 'Ataque distribuido', d: 'El mismo objetivo (un path, un login) atacado desde muchas IPs a la vez. Indica una campaña coordinada o una botnet, no un atacante suelto.' },
        en: { t: 'Distributed attack', d: 'The same target (a path, a login) attacked from many IPs at once. Indicates a coordinated campaign or a botnet, not a lone attacker.' } },
      { k: 'behavior', pro: true,
        es: { t: 'Score conductual', d: 'Un puntaje de riesgo (0-100) acumulado por IP, según su volumen, variedad, persistencia, intentos de explotación y reputación. Te dice de un vistazo qué IPs merecen atención (alto/crítico) y cuáles son ruido (bajo).' },
        en: { t: 'Behavioral score', d: 'A risk score (0-100) accumulated per IP based on volume, variety, persistence, exploit attempts and reputation. It tells you at a glance which IPs deserve attention (high/critical) and which are noise (low).' } },
      { k: 'campaign', pro: true,
        es: { t: 'Campaña / kill-chain', d: 'Una IP que hizo reconocimiento Y además atacó (recon → escaneo → fuerza bruta → explotación). Esa secuencia delata a un atacante con intención, no a un escáner que pasó de largo.' },
        en: { t: 'Campaign / kill-chain', d: 'An IP that did reconnaissance AND attacked (recon → scan → brute → exploit). That sequence reveals an attacker with intent, not a scanner passing by.' } },
    ],
  },
  {
    id: 'intel',
    es: 'Inteligencia de amenazas', en: 'Threat intelligence', pro: true,
    terms: [
      { k: 'reputation', pro: true,
        es: { t: 'Reputación', d: 'Clasificación de una IP según fuentes externas: limpia, sospechosa, maliciosa o Tor. Se calcula consultando bases de datos de abuso conocidas.' },
        en: { t: 'Reputation', d: 'Classification of an IP according to external sources: clean, suspicious, malicious or Tor. Computed by querying known abuse databases.' } },
      { k: 'asn', pro: true,
        es: { t: 'ASN', d: 'El "número de sistema autónomo": identifica a qué red/proveedor pertenece una IP (ej. AS15169 = Google). Útil para saber si un atacante viene de un datacenter, un ISP o un servicio de hosting.' },
        en: { t: 'ASN', d: 'The "autonomous system number": identifies which network/provider an IP belongs to (e.g. AS15169 = Google). Useful to know if an attacker comes from a datacenter, an ISP or a hosting service.' } },
      { k: 'abuseipdb', pro: true,
        es: { t: 'AbuseIPDB / Shodan', d: 'Servicios externos de inteligencia: AbuseIPDB da un score de cuántas veces fue reportada una IP por abuso; Shodan dice qué puertos y servicios tiene expuestos esa IP.' },
        en: { t: 'AbuseIPDB / Shodan', d: 'External intelligence services: AbuseIPDB gives a score of how often an IP was reported for abuse; Shodan tells which ports and services that IP exposes.' } },
      { k: 'tor-c2', pro: true,
        es: { t: 'Tor / C2 / Botnet', d: 'Tor: red de anonimato (una IP de salida Tor oculta al atacante real). C2: servidor de "comando y control" de malware. Botnet: red de equipos infectados. Heimdall cruza tu tráfico contra listas de estas IPs.' },
        en: { t: 'Tor / C2 / Botnet', d: 'Tor: anonymity network (a Tor exit IP hides the real attacker). C2: malware "command and control" server. Botnet: network of infected machines. Heimdall cross-checks your traffic against lists of these IPs.' } },
    ],
  },
]

export default function Guia({ proOnly = false }) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language || 'es').startsWith('en') ? 'en' : 'es'
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  const sections = SECTIONS
    .map(s => ({
      ...s,
      terms: s.terms.filter(term => {
        // En Community, los términos Pro se muestran con badge pero igual (educativo + upsell)
        if (!query) return true
        const c = term[lang]
        return c.t.toLowerCase().includes(query) || c.d.toLowerCase().includes(query)
      }),
    }))
    .filter(s => s.terms.length > 0)

  return (
    <div className='space-y-5 max-w-4xl'>
      <div>
        <h2 className='text-lg font-semibold text-foreground flex items-center gap-2'>
          <BookOpen className='size-5 text-muted-foreground' />
          {t('guide.title')}
        </h2>
        <p className='text-sm text-muted-foreground'>{t('guide.subtitle')}</p>
      </div>

      <div className='relative max-w-sm'>
        <Search className='size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2' />
        <input
          type='text' value={q} onChange={e => setQ(e.target.value)}
          placeholder={t('guide.search')}
          className='w-full bg-card border border-border rounded-md pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary'
        />
      </div>

      {sections.map(s => (
        <div key={s.id}>
          <h3 className='text-sm font-semibold text-foreground mb-2 flex items-center gap-2'>
            {s[lang]}
            {s.pro && <span className='text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-400/50 text-amber-400'>PRO</span>}
          </h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {s.terms.map(term => {
              const c = term[lang]
              return (
                <div key={term.k} className='bg-card border border-border rounded-xl p-4'>
                  <div className='flex items-center gap-2 mb-1.5'>
                    <span className={`font-semibold ${term.color || 'text-foreground'}`}>{c.t}</span>
                    {term.pro && <span className='text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-400/50 text-amber-400'>PRO</span>}
                  </div>
                  <p className='text-xs text-muted-foreground leading-relaxed'>{c.d}</p>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {sections.length === 0 && (
        <p className='text-sm text-muted-foreground'>{t('guide.no_results')}</p>
      )}
    </div>
  )
}
