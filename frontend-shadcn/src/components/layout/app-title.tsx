import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, LayoutGrid, Activity } from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar'
import allsafeLogo from '@/assets/allsafe-logo.png'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''

const ALLSAFE_SYSTEMS = [
  { label: 'Skuld',       url: 'https://skuld.allsafe.com.ar' },
  { label: 'Gjallarhorn', url: 'https://gjallarhorn.allsafe.com.ar' },
  { label: 'CRM',         url: 'https://crm.allsafe.com.ar' },
  { label: 'ARP',         url: 'https://arp.allsafe.com.ar' },
  { label: 'Gungnir',     url: 'https://gungnir.allsafe.com.ar' },
  { label: 'Web',         url: 'https://allsafe.com.ar' },
]

interface Props {
  token: string
  onGoHome: () => void
}

export function AppTitle({ token, onGoHome }: Props) {
  const { setOpenMobile } = useSidebar()
  const [logoSetting, setLogoSetting] = useState<{ show: boolean; logoData: string | null } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!token) return
    fetch(`${BACKEND}/heimdall/api/settings/logo`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setLogoSetting(d) })
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node
      const menu = document.getElementById('heimdall-app-menu')
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
      setMenuPos({ top: rect.bottom + 4, left: rect.left })
    }
    setMenuOpen(o => !o)
  }

  const showLogo = logoSetting?.show ?? true
  const logoSrc = logoSetting?.logoData || allsafeLogo

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className='flex items-start'>
          <SidebarMenuButton
            className='hover:bg-transparent active:bg-transparent flex-1 min-w-0 h-auto'
            onClick={() => { onGoHome(); setOpenMobile(false) }}
          >
            <div className='flex flex-col items-start gap-2 py-1 w-full'>
              {showLogo && (
                <img
                  src={logoSrc}
                  alt='AllSafe'
                  className='w-full h-auto max-h-12 object-contain object-left rounded-lg border border-border'
                />
              )}
              <div className='flex items-center gap-2 w-full'>
                {!showLogo && (
                  <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0'>
                    <Activity className='size-4' />
                  </div>
                )}
                <div className='grid text-start leading-tight min-w-0 flex-1'>
                  <span className='font-bold text-base text-primary'>Heimdall</span>
                  <span className='text-sm text-muted-foreground'>Honeypot Monitor</span>
                </div>
              </div>
            </div>
          </SidebarMenuButton>

          <button
            ref={triggerRef}
            onClick={handleToggle}
            className='h-8 w-8 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors mt-1'
          >
            <LayoutGrid className='size-4' />
          </button>
        </div>
      </SidebarMenuItem>

      {menuOpen && createPortal(
        <div
          id='heimdall-app-menu'
          className='dark'
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 9999,
            width: 192,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {/* Exact same structure as Gjallarhorn's DropdownMenuContent */}
          <div style={{
            background: 'oklch(0.14 0.025 264)',
            border: '1px solid oklch(1 0 0 / 9%)',
            borderRadius: 6,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3)',
            padding: '4px',
            minWidth: 128,
          }}>
            {/* DropdownMenuLabel equivalent */}
            <div style={{
              padding: '6px 8px',
              fontSize: 12,
              fontWeight: 600,
              color: 'oklch(0.58 0.035 260)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Sistemas AllSafe
            </div>
            {/* DropdownMenuItem equivalents */}
            {ALLSAFE_SYSTEMS.map(({ label, url }) => (
              <a
                key={url}
                href={url}
                target='_blank'
                rel='noreferrer'
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  fontSize: 14,
                  color: 'oklch(0.96 0.005 250)',
                  textDecoration: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  outline: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'oklch(0.19 0.028 264)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ExternalLink size={16} style={{ flexShrink: 0, color: 'oklch(0.58 0.035 260)' }} />
                {label}
              </a>
            ))}
          </div>
        </div>,
        document.body
      )}
    </SidebarMenu>
  )
}
