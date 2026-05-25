import { Target, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { TEMPLATE_MAP, type CustomTemplate } from '@/lib/templates'

interface Props {
  tab: string
  activeTemplate: string
  pinnedTemplates: string[]
  customTemplates: CustomTemplate[]
  onGoSenualos: () => void
  onTemplateChange: (id: string) => void
  role?: string
}

export function NavSenualos({ tab, activeTemplate, pinnedTemplates, customTemplates, onGoSenualos, onTemplateChange, role }: Props) {
  if (!['admin', 'analista'].includes(role ?? '')) return null
  const { t } = useTranslation()
  const customMap = Object.fromEntries(customTemplates.map(t => [t.id, t]))
  const pinned = pinnedTemplates.filter(id => TEMPLATE_MAP[id] || customMap[id])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('nav.decoys')}</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={tab === 'senualos'}
            tooltip={t('nav.manage_decoys')}
            onClick={onGoSenualos}
          >
            <Target />
            <span>{t('nav.manage_decoys')}</span>
          </SidebarMenuButton>

          {pinned.length > 0 && (
            <SidebarMenuSub>
              {pinned.map(id => {
                const staticTpl = TEMPLATE_MAP[id]
                const customTpl = customMap[id]
                const name = staticTpl?.name ?? customTpl?.name ?? id
                const Icon = staticTpl?.icon ?? Wand2
                const isActive = activeTemplate === id
                return (
                  <SidebarMenuSubItem key={id}>
                    <SidebarMenuSubButton
                      isActive={isActive}
                      onClick={() => onTemplateChange(id)}
                      className='gap-2'
                    >
                      <Icon className='size-3.5 shrink-0' />
                      <span className='truncate'>{name}</span>
                      {isActive && (
                        <span className='ml-auto w-1.5 h-1.5 rounded-full bg-green-500 shrink-0' />
                      )}
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )
              })}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
