export type NavItem = {
  id: string
  title: string
  icon?: React.ElementType
}

export type NavGroup = {
  title: string
  items: NavItem[]
  adminOnly?: boolean
}
