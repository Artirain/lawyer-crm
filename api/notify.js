// Vercel serverless function: уведомление в Telegram при добавлении клиента.
// Токен и chat_id хранятся в переменных окружения Vercel и в бандл фронтенда не попадают.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    res.status(200).json({ ok: false, skipped: 'no_config' })
    return
  }

  const { name, phone, status } = req.body || {}
  const text = [
    '🆕 Новый клиент в CRM',
    `Имя: ${name || '-'}`,
    `Телефон: ${phone || '-'}`,
    `Статус: ${status || '-'}`,
  ].join('\n')

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    const data = await r.json()
    res.status(r.ok ? 200 : 502).json(data)
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
}
