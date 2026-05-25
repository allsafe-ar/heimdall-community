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
}

export function NavGroup({ title, items, adminOnly, activeId, onSelect, role }: Props) {
  if (adminOnly && role !== 'admin') return null
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
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
