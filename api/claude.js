// api/claude.js — Route Vercel sécurisée

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  try {
    const body = req.body
    const messages = body.messages
    const system = body.system
    const model = body.model || 'claude-sonnet-4-20250514'
    const max_tokens = body.max_tokens || 1000

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens,
        system: system || 'Tu es Aria, un assistant IA professionnel.',
        messages: Array.isArray(messages)
          ? messages
          : [{ role: 'user', content: String(messages || '') }],
      }),
    })

    const text = await response.text()

    if (!response.ok) {
      return res.status(response.status).json({ error: text })
    }

    const data = JSON.parse(text)
    return res.status(200).json(data)

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
