import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Loader2, Pencil, Trash2, ShieldOff, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''

const ROLE_LABELS = { admin: 'Admin', viewer: 'Viewer' }

const EMPTY_FORM = { username: '', nombre: '', password: '', role: 'viewer' }

function isEnabled(u) {
  return u.enabled !== 0 && u.enabled !== false
}

export default function Usuarios({ token, role }) {
  const isReadOnly = false
  const { t } = useTranslation()
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [formErr, setFormErr]   = useState(null)

  const currentId = useMemo(() => {
    try { return JSON.parse(atob(token.split('.')[1])).id }
    catch { return null }
  }, [token])

  const authH = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const fetchUsers = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/users`, { headers: authH })
      if (!r.ok) return
      const d = await r.json()
      setUsers(d.users || [])
    } catch {}
    finally { setLoading(false) }
  }, [authH])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function openCreate() { setForm(EMPTY_FORM); setFormErr(null); setModal('create') }
  function openEdit(u) {
    setForm({ username: u.username, nombre: u.nombre || '', password: '', role: u.role })
    setFormErr(null)
    setModal(u)
  }

  async function handleSave() {
    setFormErr(null)
    setSaving(true)
    try {
      const isCreate = modal === 'create'
      const r = await fetch(
        `${BACKEND}/heimdall/api/users${isCreate ? '' : `/${modal.id}`}`,
        {
          method: isCreate ? 'POST' : 'PUT',
          headers: { ...authH, 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      const d = await r.json()
      if (r.ok) { setModal(null); fetchUsers() }
      else setFormErr(d.error || 'Error')
    } catch {
      setFormErr(t('usuarios.conn_error'))
    }
    setSaving(false)
  }

  async function handleToggle(u) {
    try {
      await fetch(`${BACKEND}/heimdall/api/users/${u.id}/toggle`, {
        method: 'PUT',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      fetchUsers()
    } catch {}
  }

  async function handleDelete(u) {
    if (!confirm(t('usuarios.delete_confirm', { name: u.username }))) return
    try {
      await fetch(`${BACKEND}/heimdall/api/users/${u.id}`, { method: 'DELETE', headers: authH })
      fetchUsers()
    } catch {}
  }

  async function handleReset2FA(u) {
    if (!confirm(t('usuarios.reset_2fa_confirm', { name: u.username }))) return
    try {
      await fetch(`${BACKEND}/heimdall/api/users/${u.id}/totp`, { method: 'DELETE', headers: authH })
      fetchUsers()
    } catch {}
  }

  return (
    <div className='max-w-5xl mx-auto space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-semibold text-foreground'>{t('usuarios.title')}</h1>
          <p className='text-sm text-muted-foreground mt-0.5'>{t('usuarios.desc')}</p>
        </div>
        {!isReadOnly && (
          <Button size='sm' onClick={openCreate}>
            <Plus className='h-4 w-4 mr-1' /> {t('usuarios.new')}
          </Button>
        )}
      </div>

      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('usuarios.col_name')}</TableHead>
              <TableHead>{t('usuarios.col_user')}</TableHead>
              <TableHead>{t('usuarios.col_role')}</TableHead>
              <TableHead>{t('usuarios.col_2fa')}</TableHead>
              <TableHead>{t('usuarios.col_status')}</TableHead>
              <TableHead>{t('usuarios.col_created')}</TableHead>
              <TableHead className='w-28'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className='text-center text-muted-foreground py-8'>
                  <Loader2 className='h-4 w-4 animate-spin inline mr-2' />{t('usuarios.loading')}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className='text-center text-muted-foreground py-8'>
                  {t('usuarios.no_users')}
                </TableCell>
              </TableRow>
            ) : users.map(u => (
              <TableRow key={u.id}>
                <TableCell className='font-medium'>{u.nombre || '—'}</TableCell>
                <TableCell className='font-mono text-sm'>{u.username}</TableCell>
                <TableCell>
                  <Badge variant='outline' className='text-xs'>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                </TableCell>
                <TableCell>
                  {u.has2FA
                    ? <ShieldCheck className='size-4 text-green-500' />
                    : <span className='flex items-center gap-1 text-xs text-muted-foreground'><ShieldOff className='size-4' />—</span>
                  }
                </TableCell>
                <TableCell>
                  {isEnabled(u) ? (
                    <Badge variant='default' className='text-xs bg-green-600'>{t('usuarios.status_enabled')}</Badge>
                  ) : (
                    <Badge variant='secondary' className='text-xs'>{t('usuarios.status_disabled')}</Badge>
                  )}
                </TableCell>
                <TableCell className='text-xs text-muted-foreground'>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('es-AR') : '—'}
                </TableCell>
                {!isReadOnly && (
                  <TableCell>
                    {u.id !== currentId && (
                      <div className='flex items-center gap-1'>
                        <Button
                          variant='ghost' size='icon' className='h-7 w-7'
                          title={t('usuarios.edit')}
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className='size-3.5' />
                        </Button>
                        <Button
                          variant='ghost' size='icon' className='h-7 w-7 text-muted-foreground hover:text-foreground'
                          title={isEnabled(u) ? t('usuarios.block') : t('usuarios.enable')}
                          onClick={() => handleToggle(u)}
                        >
                          {isEnabled(u) ? <ToggleRight className='size-4' /> : <ToggleLeft className='size-4' />}
                        </Button>
                        {u.has2FA && (
                          <Button
                            variant='ghost' size='icon' className='h-7 w-7 text-amber-500 hover:text-amber-600'
                            title={t('usuarios.reset_2fa')}
                            onClick={() => handleReset2FA(u)}
                          >
                            <ShieldOff className='size-3.5' />
                          </Button>
                        )}
                        <Button
                          variant='ghost' size='icon' className='h-7 w-7 text-destructive hover:text-destructive'
                          title={t('usuarios.delete')}
                          onClick={() => handleDelete(u)}
                        >
                          <Trash2 className='size-3.5' />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modal !== null} onOpenChange={open => !open && setModal(null)}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>
              {modal === 'create' ? t('usuarios.modal_create') : t('usuarios.modal_edit', { name: modal?.username })}
            </DialogTitle>
          </DialogHeader>
          {formErr && (
            <div className='rounded-lg px-3 py-2.5 text-sm border bg-red-500/10 border-red-500/20 text-red-400'>
              {formErr}
            </div>
          )}
          <div className='space-y-4 py-2'>
            <div className='space-y-1.5'>
              <Label>{t('usuarios.modal_name')}</Label>
              <Input
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder='Nombre completo'
              />
            </div>
            <div className='space-y-1.5'>
              <Label>{t('usuarios.modal_username')}{modal === 'create' ? ' *' : ''}</Label>
              <Input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder='usuario'
                disabled={modal !== 'create'}
              />
            </div>
            <div className='space-y-1.5'>
              <Label>
                {modal === 'create' ? `${t('usuarios.modal_password')} *` : t('usuarios.modal_new_password')}
              </Label>
              <Input
                type='password'
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete='new-password'
                placeholder={modal === 'create' ? t('usuarios.modal_min_chars') : '••••••'}
              />
            </div>
            <div className='space-y-1.5'>
              <Label>{t('usuarios.modal_role')}</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='viewer'>Viewer</SelectItem>
                  <SelectItem value='admin'>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setModal(null)}>{t('usuarios.modal_cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className='size-3.5 animate-spin mr-1' />}
              {modal === 'create' ? t('usuarios.modal_create_btn') : t('usuarios.modal_save_btn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
