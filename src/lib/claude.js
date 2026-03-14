// src/lib/claude.js — Client IA sécurisé via Vercel API Route
// N'appelle JAMAIS l'API Anthropic directement — passe toujours par /api/claude

const API_URL = '/api/claude'

// ── Fonction principale ──────────────────────────────────────
export async function callClaude(messages, systemPrompt, options = {}) {
  const sys = systemPrompt ||
    'Tu es Aria, un assistant administratif IA professionnel. Réponds toujours en français sauf si l\'utilisateur écrit en anglais. Sois concis, précis et professionnel.'

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 1000,
      system: sys,
      messages: Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: String(messages) }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error('Aria API error: ' + response.status + ' — ' + err)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

// ── Email ────────────────────────────────────────────────────
export async function analyzeEmail(email, lang) {
  const prompt = lang === 'fr'
    ? `Analyse cet email et fournis en JSON strict:
{
  "summary": "résumé en 2-3 phrases",
  "priority": "haute|moyenne|faible",
  "category": "Client|Facture|RDV|Administratif|Spam|Autre",
  "keyPoints": ["point1", "point2", "point3"],
  "actionRequired": true,
  "actionDetail": "détail de l'action si nécessaire",
  "suggestedReply": "réponse professionnelle complète rédigée",
  "detectedDate": "date détectée ou null",
  "detectedAmount": "montant détecté ou null",
  "detectedTask": "tâche détectée ou null"
}
Email: ${JSON.stringify(email)}`
    : `Analyze this email and return strict JSON:
{
  "summary": "2-3 sentence summary",
  "priority": "high|medium|low",
  "category": "Client|Invoice|Meeting|Administrative|Spam|Other",
  "keyPoints": ["point1", "point2"],
  "actionRequired": true,
  "actionDetail": "action detail if needed",
  "suggestedReply": "complete professional reply",
  "detectedDate": "detected date or null",
  "detectedAmount": "detected amount or null",
  "detectedTask": "detected task or null"
}
Email: ${JSON.stringify(email)}`

  const result = await callClaude(prompt, '', { maxTokens: 1500 })
  try {
    const clean = result.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { summary: result, priority: 'moyenne', category: 'Autre', keyPoints: [], actionRequired: false, suggestedReply: '' }
  }
}

// ── Briefing quotidien ───────────────────────────────────────
export async function generateDailyBriefing(data, lang) {
  const prompt = lang === 'fr'
    ? `Génère un briefing quotidien professionnel et motivant pour un dirigeant.
Inclus: résumé de la journée, priorités, alertes importantes, conseil du jour.
Sois direct, positif et actionnable. Max 180 mots.
Données: ${JSON.stringify(data)}`
    : `Generate a professional daily briefing for an executive.
Include: day summary, priorities, important alerts, tip of the day.
Be direct, positive and actionable. Max 180 words.
Data: ${JSON.stringify(data)}`
  return callClaude(prompt, '', { maxTokens: 400 })
}

// ── Rapport CEO ──────────────────────────────────────────────
export async function generateCEOReport(data, lang) {
  const prompt = lang === 'fr'
    ? `Rapport exécutif pour directeur/CEO.
Format: KPIs critiques, alertes, tendances, recommandations stratégiques.
Sois précis et orienté décision. Max 280 mots.
Données: ${JSON.stringify(data)}`
    : `Executive report for CEO/Director.
Format: critical KPIs, alerts, trends, strategic recommendations.
Be precise and decision-oriented. Max 280 words.
Data: ${JSON.stringify(data)}`
  return callClaude(prompt, '', { maxTokens: 600 })
}

// ── Excel ────────────────────────────────────────────────────
export async function analyzeExcelRequest(request, data, lang) {
  const prompt = lang === 'fr'
    ? `Expert Excel et analyste de données.
Demande: ${request}
Données (échantillon): ${JSON.stringify(data?.slice?.(0, 10) || data)}
Réponds de façon structurée. Si formule Excel demandée, donne la formule EXACTE avec explication.`
    : `Excel expert and data analyst.
Request: ${request}
Data (sample): ${JSON.stringify(data?.slice?.(0, 10) || data)}
Respond structured. If Excel formula requested, give EXACT formula with explanation.`
  return callClaude(prompt, '', { maxTokens: 2000 })
}

// ── Tâches ───────────────────────────────────────────────────
export async function suggestTaskPriority(task, context, lang) {
  const prompt = lang === 'fr'
    ? `Analyse cette tâche et donne une priorité (haute/moyenne/faible) avec une explication courte.
Tâche: ${JSON.stringify(task)}
Contexte: ${JSON.stringify(context)}`
    : `Analyze this task and give a priority (high/medium/low) with short explanation.
Task: ${JSON.stringify(task)}
Context: ${JSON.stringify(context)}`
  return callClaude(prompt, '', { maxTokens: 200 })
}

// ── CRM ──────────────────────────────────────────────────────
export async function analyzeCRMContact(contact, history, lang) {
  const prompt = lang === 'fr'
    ? `Analyse ce contact CRM et donne:
1. Potentiel commercial (1-10)
2. Prochaine action recommandée
3. Points d'attention
Contact: ${JSON.stringify(contact)}
Historique: ${JSON.stringify(history)}`
    : `Analyze this CRM contact and provide:
1. Commercial potential (1-10)
2. Recommended next action
3. Key points
Contact: ${JSON.stringify(contact)}
History: ${JSON.stringify(history)}`
  return callClaude(prompt, '', { maxTokens: 400 })
}

// ── Comptabilité ─────────────────────────────────────────────
export async function analyzeFinances(data, lang) {
  const prompt = lang === 'fr'
    ? `Analyse financière professionnelle. Donne:
1. Bilan rapide
2. Points d'alerte
3. Recommandations
4. Tendances
Données: ${JSON.stringify(data)}`
    : `Professional financial analysis. Provide:
1. Quick balance
2. Alert points
3. Recommendations
4. Trends
Data: ${JSON.stringify(data)}`
  return callClaude(prompt, '', { maxTokens: 600 })
}
