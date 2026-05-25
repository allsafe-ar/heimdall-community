import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  username?: string
  nombre?: string
  role?: string
  onMiCuenta: () => void
  onLogout: () => void
}

export function ProfileDropdown({ username, nombre, role, onMiCuenta, onLogout }: Props) {
  const displayName = nombre || username || '—'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className='flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent transition-colors outline-none'>
          <Avatar className='h-8 w-8 rounded-lg'>
            <AvatarFallback className='rounded-lg bg-primary text-primary-foreground text-xs font-bold'>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className='hidden sm:grid text-start leading-tight'>
            <span className='text-sm font-semibold truncate max-w-32'>{displayName}</span>
            <span className='text-xs text-muted-foreground'>{role?.toUpperCase()}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-44' align='end' forceMount>
        <DropdownMenuItem onClick={onMiCuenta}>
          Mi cuenta
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant='destructive' onClick={onLogout}>
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
