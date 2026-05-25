import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ChevronsUpDown, UserCog, ClipboardList, Bug, Settings2 } from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

interface Props {
  role?: string
  onTabChange: (tab: string) => void
}

export function NavUser({ role, onTabChange }: Props) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 224 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const isAdmin   = role === 'admin'
  const isAuditor = role === 'auditor'

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node
      const menu = document.getElementById('heimdall-nav-menu')
      if (triggerRef.current?.contains(target)) return
      if (menu && menu.contains(target)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  function handleToggle() {
    if (!menuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom, left: rect.right + 8, width: Math.max(rect.width, 224) })
    }
    setMenuOpen(o => !o)
  }

  function navigate(tab: string) {
    setMenuOpen(false)
    onTabChange(tab)
  }

  const portalStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: `calc(100vh - ${menuPos.top}px)`,
    left: menuPos.left,
    zIndex: 9999,
    width: menuPos.width,
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div ref={triggerRef}>
          <SidebarMenuButton
            size='lg'
            onClick={handleToggle}
            className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
          >
            <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0'>
              <Settings2 className='size-4' />
            </div>
            <div className='grid flex-1 text-start text-sm leading-tight min-w-0'>
              <span className='truncate font-semibold'>{t('nav.config')}</span>
              <span className='truncate text-xs text-muted-foreground'>{t('nav.config_desc')}</span>
            </div>
            <ChevronsUpDown className='ml-auto size-4 shrink-0' />
          </SidebarMenuButton>
        </div>
      </SidebarMenuItem>

      {menuOpen && createPortal(
        <div id='heimdall-nav-menu' className='dark' style={portalStyle}>
          <div className='z-50 rounded-md border bg-popover p-1 text-popover-foreground shadow-md'>
            <div className='px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
              {t('nav.config')}
            </div>

            {isAdmin && (
              <button
                className='relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground'
                onClick={() => navigate('usuarios')}
              >
                <UserCog className='size-4 text-muted-foreground shrink-0' />
                {t('nav.users')}
              </button>
            )}

            {isAuditor && (
              <button
                className='relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground'
                onClick={() => navigate('usuarios')}
              >
                <UserCog className='size-4 text-muted-foreground shrink-0' />
                {t('nav.users')}
              </button>
            )}

            {(isAdmin || isAuditor) && (
              <button
                className='relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground'
                onClick={() => navigate('auditoria')}
              >
                <ClipboardList className='size-4 text-muted-foreground shrink-0' />
                {t('nav.audit')}
              </button>
            )}

            <div className='-mx-1 my-1 h-px bg-border' />

            <a
              href='mailto:info@allsafe.com.ar?subject=Reporte de problema - Heimdall'
              className='relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none text-muted-foreground hover:bg-accent hover:text-accent-foreground no-underline'
              onClick={() => setMenuOpen(false)}
            >
              <Bug className='size-4 shrink-0' />
              {t('nav.report_issue')}
            </a>
          </div>
        </div>,
        document.body
      )}
    </SidebarMenu>
  )
}
