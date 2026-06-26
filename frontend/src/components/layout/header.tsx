import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { TEMPLATE_MAP } from '@/lib/templates'

interface Props {
  tab: string
  username?: string
  nombre?: string
  role?: string
  onMiCuenta: () => void
  onLogout: () => void
  connected?: boolean
  activeTemplate?: string
  extraRight?: React.ReactNode
}

export function Header({ tab, username, nombre, role, onMiCuenta, onLogout, connected, activeTemplate, extraRight }: Props) {
  const { t } = useTranslation()
  const PAGE_LABELS: Record<string, string> = {
    overview: t('page.overview'),
    live:     t('page.live'),
    table:    t('page.table'),
    ips:      t('page.ips'),
    map:      t('page.map'),
    senualos: t('page.senualos'),
  }
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const onScroll = () => setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    document.addEventListener('scroll', onScroll, { passive: true })
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'z-50 h-14 border-b sticky top-0 w-[inherit]',
        offset > 10 ? 'shadow' : 'shadow-none'
      )}
    >
      <div className={cn(
        'relative flex h-full items-center gap-3 px-4',
        offset > 10 && 'after:absolute after:inset-0 after:-z-10 after:bg-background/20 after:backdrop-blur-lg'
      )}>
        <SidebarTrigger variant='outline' className='max-md:scale-125' />
        <Separator orientation='vertical' className='h-6' />
        <div className='flex-1 min-w-0'>
          <h1 className='text-sm font-semibold text-foreground truncate'>
            {PAGE_LABELS[tab] ?? ''}
          </h1>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          {!['mi_cuenta', 'usuarios', 'auditoria'].includes(tab) && activeTemplate && (
            <div className='hidden sm:flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border font-terminal border-green-500/30 bg-green-500/10 text-green-400'>
              <span className='w-1.5 h-1.5 rounded-full bg-green-400' />
              {TEMPLATE_MAP[activeTemplate]?.name ?? activeTemplate}
            </div>
          )}
          {!['mi_cuenta', 'usuarios', 'auditoria'].includes(tab) && connected !== undefined && (
            <div className={cn(
              'hidden sm:flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border font-terminal mr-1',
              connected
                ? 'border-green-500/30 bg-green-500/10 text-green-500'
                : 'border-red-500/30 bg-red-500/10 text-red-500'
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-green-500 animate-pulse' : 'bg-red-500')} />
              {connected ? t('header.live') : t('header.disconnected')}
            </div>
          )}
          {!['mi_cuenta', 'usuarios', 'auditoria'].includes(tab) && extraRight}
          <ThemeSwitch />
          <ProfileDropdown
              username={username}
              nombre={nombre}
              role={role}
              onMiCuenta={onMiCuenta}
              onLogout={onLogout}
            />
        </div>
      </div>
    </header>
  )
}
