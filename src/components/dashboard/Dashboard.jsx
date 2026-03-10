import { useState, useEffect } from 'react'
import { callClaude, generateDailyBriefing } from '../../lib/claude'
import { useLS } from '../../hooks/useStore'

const STAT_CARDS = [
  { id: 'emails', icon: '📧', colorFrom: '#6470f1', colorTo: '#a5b8fc', labelFr: 'Emails non lus', labelEn: 'Unread emails', key: 'unreadEmails' },
  { id: 'tasks', icon: '✅', colorFrom: '#10b981', colorTo: '#6ee7b7', labelFr: 'Tâches en cours', labelEn: 'Active tasks', key: 'activeTasks' },
  { id: 'meetings', icon: '🗓️', colorFrom: '#f59e0b', colorTo: '#fcd34d', labelFr: "Réunions aujourd'hui", labelEn: "Today's meetings", key: 'todayMeetings' },
  { id: 'invoices', icon: '💰', colorFrom: '#ec4899', colorTo: '#f9a8d4', labelFr: 'Factures en attente', labelEn: 'Pending invoices', key: 'pendingInvoices' },
]

export default function Dashboard({ lang, user, stats = {}, onNavigate, addLog }) {
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHistory, setAiHistory] = useLS('ai_history', [])
  const [briefing, setBriefing] = useLS('daily_briefing', null)
  const [briefingDate, setBriefingDate] = useLS('briefing_date', '')
  const [showBriefing, setShowBriefing] = useState(false)
  const [listening, setListening] = useState(false)
  const isFr = lang === 'fr'

  const greeting = () => {
    const h = new Date().getHours()
    const name = user?.name?.split(' ')[0] || ''
    if (h < 12) return (isFr ? 'Bonjour' : 'Good morning') + (name ? ', ' + name : '') + ' 👋'
    if (h < 18) return (isFr ? 'Bon après-midi' : 'Good afternoon') + (name ? ', ' + name : '') + ' ☀️'
    return (isFr ? 'Bonsoir' : 'Good evening') + (name ? ', ' + name : '') + ' 🌙'
  }

  useEffect(() => {
    const today = new Date().toDateString()
    if (briefingDate !== today) {
      generateDailyBriefing({ stats, user, date: today }, lang).then(text => {
        setBriefing(text)
        setBriefingDate(today)
        setShowBriefing(true)
      }).catch(() => {})
    }
  }, [])

  async function sendMessage() {
    if (!aiInput.trim() || aiLoading) return
    const userMsg = aiInput.trim()
    setAiInput('')
    setAiLoading(true)
    const newHistory = [...aiHistory, { role: 'user', content: userMsg }]
    setAiHistory(newHistory)
    addLog?.('💬 ' + (isFr ? 'Question IA: ' : 'AI Question: ') + userMsg, 'info', 'dashboard')
    try {
      const system = isFr
        ? 'Tu es Aria, assistant administratif IA. Tu aides avec les tâches administratives. Contexte: ' + JSON.stringify({ name: user?.name, role: user?.role, stats })
        : 'You are Aria, an AI administrative assistant. Context: ' + JSON.stringify({ name: user?.name, role: user?.role, stats })
      const reply = await callClaude(newHistory.slice(-10), system)
      setAiHistory(prev => [...prev, { role: 'assistant', content: reply }])
      addLog?.('✅ ' + (isFr ? 'Réponse IA générée' : 'AI reply generated'), 'success', 'dashboard')
    } catch {
      setAiHistory(prev => [...prev, { role: 'assistant', content: isFr ? "Erreur de connexion à l'IA" : 'AI connection error' }])
    }
    setAiLoading(false)
  }

  function startVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(isFr ? 'Dictée vocale non supportée sur ce navigateur (utilisez Chrome)' : 'Voice input not supported (use Chrome)')
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = isFr ? 'fr-FR' : 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onresult = e => setAiInput(prev => prev + (prev ? ' ' : '') + e.results[0][0].transcript)
    rec.start()
  }

  const displayHistory = aiHistory.slice(-20)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {showBriefing && briefing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: '#12141f', border: '1px solid rgba(100,112,241,0.3)', borderRadius: 20, padding: 32, maxWidth: 540, width: '100%', boxShadow: '0 0 40px rgba(100,112,241,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>🌅</span>
              <h2 style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, fontSize: 20, color: 'white' }}>
                {isFr ? 'Résumé du jour' : "Today's briefing"}
              </h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>{briefing}</p>
            <button className="btn-primary" onClick={() => setShowBriefing(false)} style={{ width: '100%', justifyContent: 'center' }}>
              {isFr ? "C'est parti ! 🚀" : "Let's go! 🚀"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, fontSize: 22, color: 'white' }}>{greeting()}</h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            {new Date().toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => setShowBriefing(true)}>
          🌅 {isFr ? 'Briefing du jour' : "Today's briefing"}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {STAT_CARDS.map((card, i) => (
          <button key={card.id} onClick={() => onNavigate(card.id)} style={{
            background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 18,
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(100,112,241,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,' + card.colorFrom + '22,' + card.colorTo + '11)', border: '1px solid ' + card.colorFrom + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{card.icon}</div>
              <span style={{ fontSize: 24, fontFamily: 'Outfit', fontWeight: 700, color: 'white' }}>{stats[card.key] ?? 0}</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{isFr ? card.labelFr : card.labelEn}</div>
          </button>
        ))}
      </div>

      <div>
        <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isFr ? '⚡ Actions rapides' : '⚡ Quick actions'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { icon: '📧', label: isFr ? 'Nouveau message' : 'Compose', nav: 'emails' },
            { icon: '📋', label: isFr ? 'Nouveau tableau' : 'New table', nav: 'excel' },
            { icon: '🗓️', label: isFr ? 'Planifier' : 'Schedule', nav: 'calendar' },
            { icon: '✅', label: isFr ? 'Nouvelle tâche' : 'New task', nav: 'tasks' },
            { icon: '💰', label: isFr ? 'Facture' : 'Invoice', nav: 'accounting' },
            { icon: '🤝', label: 'CRM', nav: 'crm' },
            { icon: '👥', label: isFr ? 'Congé RH' : 'HR Leave', nav: 'hr' },
            { icon: '📈', label: isFr ? 'Analytiques' : 'Analytics', nav: 'analytics' },
          ].map(action => (
            <button key={action.nav + action.icon} className="btn-secondary" onClick={() => onNavigate(action.nav)}>
              {action.icon} {action.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: 14, color: 'white' }}>
            🤖 Aria AI — {isFr ? 'Assistant intelligent' : 'Smart assistant'}
          </span>
        </div>
        <div style={{ height: 280, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayHistory.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 60 }}>
              {isFr ? 'Posez-moi une question administrative...' : 'Ask me an administrative question...'}
            </div>
          )}
          {displayHistory.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: msg.role === 'user' ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.05)',
                border: '1px solid ' + (msg.role === 'user' ? 'rgba(100,112,241,0.3)' : 'rgba(255,255,255,0.08)'),
                fontSize: 13.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>{msg.content}</div>
            </div>
          ))}
          {aiLoading && (
            <div style={{ display: 'flex', gap: 4, padding: '8px 14px' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6470f1', opacity: 0.6 + i * 0.2 }} />)}
            </div>
          )}
        </div>
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8 }}>
          <input className="input" value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder={isFr ? 'Demandez quelque chose à Aria...' : 'Ask Aria something...'} disabled={aiLoading} />
          <button onClick={startVoice} style={{ background: listening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid ' + (listening ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'), borderRadius: 10, padding: '0 12px', fontSize: 16, cursor: 'pointer' }}>
            {listening ? '🔴' : '🎙️'}
          </button>
          <button className="btn-primary" onClick={sendMessage} disabled={aiLoading || !aiInput.trim()} style={{ whiteSpace: 'nowrap' }}>
            {isFr ? 'Envoyer' : 'Send'} →
          </button>
        </div>
      </div>
    </div>
  )
}
