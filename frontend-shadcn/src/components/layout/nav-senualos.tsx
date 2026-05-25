import { useTranslation } from 'react-i18next'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { ALL_TEMPLATES } from '@/lib/templates'

interface Props {
  tab: string
  activeTemplate: string
  onTemplateChange: (id: string) => void
  role?: string
}

export function NavSenualos({ activeTemplate, onTemplateChange, role }: Props) {
  if (!['admin'].includes(role ?? '')) return null
  const { t } = useTranslation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('nav.decoys')}</SidebarGroupLabel>
      <SidebarMenu>
        {ALL_TEMPLATES.map(tpl => {
          const Icon = tpl.icon
          const isActive = activeTemplate === tpl.id
          return (
            <SidebarMenuItem key={tpl.id}>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={tpl.description}
                onClick={() => onTemplateChange(tpl.id)}
                className='gap-2'
              >
                <Icon className='size-4 shrink-0' />
                <span className='truncate'>{tpl.name}</span>
                {isActive && (
                  <span className='ml-auto w-1.5 h-1.5 rounded-full bg-green-500 shrink-0' />
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
