import { useLayout } from '@/context/layout-provider'
import { useTranslation } from 'react-i18next'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppTitle } from './app-title'
import { NavGroup } from './nav-group'
import { NavSenualos } from './nav-senualos'
import { NavUser } from './nav-user'
import { BarChart2, Zap, ClipboardList, Globe } from 'lucide-react'
import type { CustomTemplate } from '@/lib/templates'

interface Props {
  token: string
  tab: string
  onTabChange: (tab: string) => void
  activeTemplate: string
  onTemplateChange: (tpl: string) => void
  pinnedTemplates: string[]
  customTemplates: CustomTemplate[]
  role?: string
}

export function AppSidebar({ token, tab, onTabChange, activeTemplate, onTemplateChange, pinnedTemplates, customTemplates, role }: Props) {
  const { collapsible, variant } = useLayout()
  const { t } = useTranslation()

  const NAV_MONITOR = [
    { id: 'overview', title: t('nav.overview'), icon: BarChart2     },
    { id: 'live',     title: t('nav.live'),     icon: Zap           },
    { id: 'table',    title: t('nav.table'),    icon: ClipboardList },
    { id: 'ips',      title: t('nav.ips'),      icon: Globe         },
  ]

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AppTitle token={token} onGoHome={() => onTabChange('overview')} />
      </SidebarHeader>

      <SidebarContent>
        <NavGroup
          title={t('nav.monitor')}
          items={NAV_MONITOR}
          activeId={tab}
          onSelect={onTabChange}
          role={role}
        />
        <NavSenualos
          tab={tab}
          activeTemplate={activeTemplate}
          pinnedTemplates={pinnedTemplates}
          customTemplates={customTemplates}
          onGoSenualos={() => onTabChange('senualos')}
          onTemplateChange={onTemplateChange}
          role={role}
        />
      </SidebarContent>

      <SidebarFooter>
        <NavUser role={role} onTabChange={onTabChange} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
