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
import { BarChart2, Zap, ClipboardList, Globe, Map, FileText, BookOpen } from 'lucide-react'

interface Props {
  token: string
  tab: string
  onTabChange: (tab: string) => void
  activeTemplate: string
  onTemplateChange: (tpl: string) => void
  role?: string
}

export function AppSidebar({ token, tab, onTabChange, activeTemplate, onTemplateChange, role }: Props) {
  const { collapsible, variant } = useLayout()
  const { t } = useTranslation()

  const NAV_MONITOR = [
    { id: 'overview', title: t('nav.overview'), icon: BarChart2     },
    { id: 'live',     title: t('nav.live'),     icon: Zap           },
    { id: 'table',    title: t('nav.table'),    icon: ClipboardList },
    { id: 'ips',      title: t('nav.ips'),      icon: Globe         },
    { id: 'map',      title: t('nav.map'),      icon: Map           },
  ]

  const NAV_ANALYSIS = [
    { id: 'reportes', title: t('nav.reports'),  icon: FileText      },
    { id: 'guia',     title: t('nav.guide'),    icon: BookOpen      },
  ]

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AppTitle token={token} onGoHome={() => onTabChange('overview')} />
      </SidebarHeader>

      <SidebarContent className='gap-1'>
        <NavGroup
          title={t('nav.monitor')}
          frente={1}
          items={NAV_MONITOR}
          activeId={tab}
          onSelect={onTabChange}
          role={role}
        />
        {/* Línea divisoria entre el frente de monitoreo y el de análisis. */}
        <div aria-hidden className='mx-4 my-2 h-0.5 shrink-0 rounded-full bg-gradient-to-r from-amber-500 dark:from-primary to-amber-500/30 dark:to-primary/40' />
        <NavGroup
          title={t('nav.analysis')}
          frente={2}
          items={NAV_ANALYSIS}
          activeId={tab}
          onSelect={onTabChange}
          role={role}
        />
        <NavSenualos
          tab={tab}
          activeTemplate={activeTemplate}
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
