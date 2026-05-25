import {
  FileCode, Settings, Building2, AppWindow,
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
  { id: 'generic',   name: 'CorpNet Portal', group: 'templates', icon: Building2, description: 'Corporate employee portal' },
  { id: 'wordpress', name: 'WordPress',      group: 'templates', icon: FileCode,  description: 'WordPress wp-admin login' },
  { id: 'cpanel',    name: 'cPanel',         group: 'templates', icon: Settings,  description: 'cPanel hosting panel' },
  { id: 'microsoft', name: 'Microsoft',      group: 'templates', icon: AppWindow, description: 'Microsoft account login' },
]

export const TEMPLATE_MAP = Object.fromEntries(ALL_TEMPLATES.map(t => [t.id, t])) as Record<string, TemplateItem>

export const PINNED_KEY = 'heimdall_pinned_templates'

export function loadPinned(): string[] {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) ?? '[]') } catch { return [] }
}

export function savePinned(ids: string[]): void {
  try { localStorage.setItem(PINNED_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
}
