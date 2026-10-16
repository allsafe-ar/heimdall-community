import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { type NavGroup as NavGroupProps } from './types'

interface Props extends NavGroupProps {
  activeId: string
  onSelect: (id: string) => void
  role?: string
  frente?: 1 | 2
}

// Títulos de grupo en dos tonos del acento de Heimdall, según el frente (1 intenso, 2 apagado).
// El amarillo sobre fondo claro no se lee: en modo claro va un ámbar más oscuro.
export const COLOR_FRENTE = {
  1: 'font-semibold text-amber-600 dark:text-primary',
  2: 'font-semibold text-amber-700/70 dark:text-primary/70',
} as const

export function NavGroup({ title, items, adminOnly, activeId, onSelect, role, frente }: Props) {
  if (adminOnly && role !== 'admin') return null
  return (
    <SidebarGroup className='py-0.5'>
      <SidebarGroupLabel className={frente ? COLOR_FRENTE[frente] : undefined}>{title}</SidebarGroupLabel>
      <SidebarMenu className='gap-0'>
        {items.map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              isActive={activeId === item.id}
              tooltip={item.title}
              onClick={() => onSelect(item.id)}
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
