import { createClient } from '@supabase/supabase-js'
import type { Client, Status } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Если ключи Supabase заданы — работаем с реальной БД, иначе демо на localStorage.
export const usingSupabase = Boolean(url && anon)
const supabase = usingSupabase ? createClient(url!, anon!) : null

const LS_KEY = 'lawyer-crm-clients'

function lsRead(): Client[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as Client[]
  } catch {
    return []
  }
}

function lsWrite(items: Client[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

export async function listClients(): Promise<Client[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Client[]
  }
  return lsRead().sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function addClient(input: {
  name: string
  phone: string
  status: Status
}): Promise<Client> {
  if (supabase) {
    const { data, error } = await supabase.from('clients').insert(input).select().single()
    if (error) throw error
    return data as Client
  }
  const client: Client = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...input,
  }
  const items = lsRead()
  items.push(client)
  lsWrite(items)
  return client
}

export async function updateStatus(id: string, status: Status): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('clients').update({ status }).eq('id', id)
    if (error) throw error
    return
  }
  lsWrite(lsRead().map((c) => (c.id === id ? { ...c, status } : c)))
}

export async function deleteClient(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsWrite(lsRead().filter((c) => c.id !== id))
}

// Уведомление в Telegram через serverless-функцию. Возвращает true, если сообщение
// действительно отправлено. Ошибки не ломают основной сценарий.
export async function notifyNewClient(client: {
  name: string
  phone: string
  status: string
}): Promise<boolean> {
  try {
    const r = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    })
    const data = (await r.json().catch(() => ({}))) as { ok?: boolean }
    return Boolean(data.ok)
  } catch {
    return false
  }
}
