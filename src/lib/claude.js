import { CFG } from './config'

export async function callClaude(messages, systemPrompt, options = {}) {
  const sys = systemPrompt || 'Tu es Aria, un assistant administratif IA professionnel. Réponds toujours en français sauf si l\'utilisateur écrit en anglais. Sois concis, précis et professionnel.'
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 1000,
      system: sys,
      messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
    })
  })
  if (!response.ok) throw new Error('Claude API error: ' + response.status)
  const data = await response.json()
  return data.content?.[0]?.text || ''
}

export async function analyzeEmail(email, lang) {
  const prompt = lang === 'fr'
    ? 'Analyse cet email et fournis:\n1. RÉSUMÉ (2-3 phrases)\n2. POINTS CLÉS (3 bullets max)\n3. ACTION REQUISE (oui/non + détail)\n4. PRIORITÉ (haute/moyenne/faible)\n5. BROUILLON DE RÉPONSE professionnelle\n\nEmail:\n' + JSON.stringify(email)
    : 'Analyze this email:\n1. SUMMARY\n2. KEY POINTS\n3. ACTION REQUIRED\n4. PRIORITY\n5. DRAFT REPLY\n\nEmail:\n' + JSON.stringify(email)
  return callClaude(prompt)
}

export async function analyzeExcelRequest(request, data, lang) {
  const prompt = lang === 'fr'
    ? 'Expert Excel. Analyse cette demande:\n1. TYPE (tableau/graphique/les deux)\n2. STRUCTURE des données\n3. CALCULS nécessaires\n4. RECOMMANDATIONS\n\nDemande: ' + request + (data ? '\nDonnées: ' + JSON.stringify(data) : '')
    : 'Excel expert. Analyze request:\n1. TYPE (table/chart/both)\n2. DATA structure\n3. CALCULATIONS\n4. RECOMMENDATIONS\n\nRequest: ' + request + (data ? '\nData: ' + JSON.stringify(data) : '')
  return callClaude(prompt, '', { maxTokens: 2000 })
}

export async function generateDailyBriefing(data, lang) {
  const prompt = lang === 'fr'
    ? 'Génère un briefing quotidien professionnel et motivant. Inclus: résumé, priorités, alertes, conseil du jour. Max 180 mots.\n\nDonnées: ' + JSON.stringify(data)
    : 'Generate a professional daily briefing. Include: summary, priorities, alerts, tip of the day. Max 180 words.\n\nData: ' + JSON.stringify(data)
  return callClaude(prompt)
}

export async function generateCEOReport(data, lang) {
  const prompt = lang === 'fr'
    ? 'Rapport exécutif pour directeur. Format: KPIs critiques, alertes, tendances, recommandations. Max 280 mots.\n\nDonnées: ' + JSON.stringify(data)
    : 'Executive report for CEO. Format: critical KPIs, alerts, trends, recommendations. Max 280 words.\n\nData: ' + JSON.stringify(data)
  return callClaude(prompt)
}
