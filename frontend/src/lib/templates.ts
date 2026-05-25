import {
  Shield, ShieldAlert, Users, FileBarChart2, Eye, Globe2,
  FileText, FileCode, Settings, Building2, Chrome, AppWindow, Crosshair,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TemplateGroup = 'allsafe' | 'templates'

export interface TemplateItem {
  id: string
  name: string
  group: TemplateGroup
  icon: LucideIcon
  description: string
}

export interface CustomTemplate {
  id: string
  name: string
  subtitle: string
  userLabel?: string
  btnText?: string
  footerText?: string
  color: string
}

export const ALL_TEMPLATES: TemplateItem[] = [
  { id: 'sgsi',        name: 'AllSafe SGSI',       group: 'allsafe',   icon: Shield,        description: 'Sistema de Gestión ISO 27001' },
  { id: 'gjallarhorn', name: 'AllSafe Gjallarhorn', group: 'allsafe',   icon: ShieldAlert,   description: 'Plataforma SOC Blue Team' },
  { id: 'crm',         name: 'AllSafe CRM',         group: 'allsafe',   icon: Users,         description: 'Sistema de Gestión de Clientes' },
  { id: 'arp',         name: 'AllSafe ARP',         group: 'allsafe',   icon: FileBarChart2, description: 'Plataforma de Análisis de Riesgo' },
  { id: 'gungnir',     name: 'AllSafe Gungnir',     group: 'allsafe',   icon: Crosshair,     description: 'Offensive Security Manager' },
  { id: 'heimdall',    name: 'AllSafe Heimdall',    group: 'allsafe',   icon: Eye,           description: 'Monitor de Honeypot Web' },
  { id: 'allsafe-wp',  name: 'AllSafe Web',         group: 'allsafe',   icon: Globe2,        description: 'Portal WordPress AllSafe' },
  { id: 'anzuelo',     name: 'AllSafe Ansuelo',     group: 'allsafe',   icon: FileText,      description: 'Panel de Control · Llavero de Credenciales' },
  { id: 'wordpress',   name: 'WordPress',           group: 'templates', icon: FileCode,      description: 'Login wp-admin genérico' },
  { id: 'cpanel',      name: 'cPanel',              group: 'templates', icon: Settings,      description: 'Panel de hosting cPanel' },
  { id: 'generic',     name: 'CorpNet Portal',      group: 'templates', icon: Building2,     description: 'Portal de empleados corporativo' },
  { id: 'google',      name: 'Google',              group: 'templates', icon: Chrome,        description: 'Inicio de sesión con cuenta Google' },
  { id: 'microsoft',   name: 'Microsoft',           group: 'templates', icon: AppWindow,     description: 'Inicio de sesión con cuenta Microsoft' },
]

export const TEMPLATE_MAP = Object.fromEntries(ALL_TEMPLATES.map(t => [t.id, t])) as Record<string, TemplateItem>

export const PINNED_KEY = 'heimdall_pinned_templates'

export function loadPinned(): string[] {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) ?? '[]') } catch { return [] }
}

export function savePinned(ids: string[]): void {
  try { localStorage.setItem(PINNED_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
}
