import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Client, Status } from './types'
import { STATUSES } from './types'
import {
  addClient,
  deleteClient,
  listClients,
  notifyNewClient,
  updateStatus,
  usingSupabase,
} from './lib/store'

const STATUS_COLOR: Record<Status, string> = {
  'Новый': '#2563eb',
  'В работе': '#d97706',
  'Закрыт': '#16a34a',
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="tile">
      <div className="tile-value" style={{ color }}>
        {value}
      </div>
      <div className="tile-label">{label}</div>
    </div>
  )
}

export default function App() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<Status>('Новый')
  const [saving, setSaving] = useState(false)

  const [toast, setToast] = useState<{ text: string; kind: 'info' | 'success' } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  function showToast(text: string, kind: 'info' | 'success') {
    setToast({ text, kind })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }

  async function refresh() {
    try {
      setClients(await listClients())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    return () => window.clearTimeout(toastTimer.current)
  }, [])

  const counts = useMemo(() => {
    const c: Record<Status, number> = { 'Новый': 0, 'В работе': 0, 'Закрыт': 0 }
    for (const cl of clients) c[cl.status] += 1
    return c
  }, [clients])

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setSaving(true)
    try {
      const created = await addClient({ name: name.trim(), phone: phone.trim(), status })
      setClients((prev) => [created, ...prev])
      setName('')
      setPhone('')
      setStatus('Новый')
      setError(null)
      showToast('Клиент добавлен', 'info')
      const sent = await notifyNewClient({
        name: created.name,
        phone: created.phone,
        status: created.status,
      })
      if (sent) {
        showToast('✓ Клиент добавлен · уведомление отправлено юристу в Telegram', 'success')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось добавить клиента')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm('Удалить клиента?')) return
    const snapshot = clients
    setClients((cs) => cs.filter((c) => c.id !== id))
    try {
      await deleteClient(id)
    } catch (e) {
      setClients(snapshot)
      setError(e instanceof Error ? e.message : 'Не удалось удалить клиента')
    }
  }

  async function onChangeStatus(id: string, next: Status) {
    const snapshot = clients
    setClients((cs) => cs.map((c) => (c.id === id ? { ...c, status: next } : c)))
    try {
      await updateStatus(id, next)
    } catch (e) {
      setClients(snapshot)
      setError(e instanceof Error ? e.message : 'Не удалось обновить статус')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="logo">ДП</div>
          <div>
            <h1>Доступное Право</h1>
            <p className="muted">CRM юриста — клиенты и статусы дел</p>
          </div>
        </div>
        <span className={`env-badge ${usingSupabase ? 'live' : 'local'}`}>
          {usingSupabase ? 'Supabase' : 'Демо · localStorage'}
        </span>
      </header>

      <section className="stats">
        <StatTile label="Всего" value={clients.length} color="#0f172a" />
        {STATUSES.map((s) => (
          <StatTile key={s} label={s} value={counts[s]} color={STATUS_COLOR[s]} />
        ))}
      </section>

      <section className="card">
        <h2>Добавить клиента</h2>
        <form className="form" onSubmit={onAdd}>
          <input
            placeholder="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            placeholder="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" disabled={saving}>
            {saving ? 'Сохраняю…' : 'Добавить'}
          </button>
        </form>
      </section>

      {error && <div className="error">{error}</div>}

      <section className="card">
        <h2>Клиенты</h2>
        {loading ? (
          <p className="muted">Загрузка…</p>
        ) : clients.length === 0 ? (
          <p className="muted">Пока нет клиентов. Добавьте первого выше.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Телефон</th>
                  <th>Статус</th>
                  <th>Добавлен</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td className="strong">{c.name}</td>
                    <td>{c.phone}</td>
                    <td>
                      <span className="status-cell">
                        <span className="dot" style={{ background: STATUS_COLOR[c.status] }} />
                        <select
                          className="status-select"
                          value={c.status}
                          onChange={(e) => onChangeStatus(c.id, e.target.value as Status)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </span>
                    </td>
                    <td className="muted">
                      {new Date(c.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="col-action">
                      <button
                        type="button"
                        className="btn-del"
                        onClick={() => onDelete(c.id)}
                        title="Удалить клиента"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="footer muted">
        Прототип для «Доступное Право» · статусы: Новый -&gt; В работе -&gt; Закрыт
      </footer>

      {toast && <div className={`toast ${toast.kind}`}>{toast.text}</div>}
    </div>
  )
}
