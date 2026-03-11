import { useState, useEffect, useRef } from 'react'
import { callClaude, generateDailyBriefing } from '../../lib/claude'
import { useLS } from '../../hooks/useStore'

const STAT_CARDS = [
  { id: 'emails', icon: '✉️', colorFrom: '#6470f1', colorTo: '#a5b8fc', labelFr: 'Emails non lus', labelEn: 'Unread emails', key: 'unreadEmails' },
  { id: 'tasks', icon: '✔️', colorFrom: '#10b981', colorTo: '#6ee7b7', labelFr: 'Tâches en cours', labelEn: 'Active tasks', key: 'activeTasks' },
  { id: 'calendar', icon: '📅', colorFrom: '#f59e0b', colorTo: '#fcd34d', labelFr: "Réunions aujourd'hui", labelEn: "Today's meetings", key: 'todayMeetings' },
  { id: 'accounting', icon: '💳', colorFrom: '#ec4899', colorTo: '#f9a8d4', labelFr: 'Factures en attente', labelEn: 'Pending invoices', key: 'pendingInvoices' },
]

const ONBOARDING_STEPS = [
  { icon: '👋', titleFr: 'Bienvenue sur Aria !', titleEn: 'Welcome to Aria!', descFr: 'Votre assistant administratif IA. Laissez-nous vous faire visiter l\'application.', descEn: 'Your AI administrative assistant. Let us show you around.' },
  { icon: '✉️', titleFr: 'Emails intelligents', titleEn: 'Smart Emails', descFr: 'Aria analyse vos emails, génère des résumés et rédige des réponses automatiquement.', descEn: 'Aria analyzes emails, generates summaries and drafts replies automatically.' },
  { icon: '✔️', titleFr: 'Gestion des tâches', titleEn: 'Task Management', descFr: 'Kanban complet — organisez votre travail en colonnes : À faire, En cours, Terminé.', descEn: 'Full Kanban — organize work in columns: Todo, In Progress, Done.' },
  { icon: '💳', titleFr: 'Comptabilité & OCR', titleEn: 'Accounting & OCR', descFr: 'Gérez vos factures et scannez-les avec l\'OCR intégré pour extraction automatique.', descEn: 'Manage invoices and scan them with built-in OCR for automatic extraction.' },
  { icon: '🎙️', titleFr: 'Dictée vocale', titleEn: 'Voice Input', descFr: 'Utilisez votre voix pour dicter des messages à Aria. Cliquez sur le micro et parlez !', descEn: 'Use your voice to dictate messages to Aria. Click the mic and speak!' },
  { icon: '🚀', titleFr: 'Tout est prêt !', titleEn: 'All set!', descFr: 'Aria est prête à vous aider. Explorez les sections depuis le menu de gauche.', descEn: 'Aria is ready to help. Explore sections from the left menu.' },
]

export default function Dashboard({ lang, user, stats = {}, onNavigate, addLog, darkMode, setDarkMode }) {
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHistory, setAiHistory] = useLS('ai_history', [])
  const [briefing, setBriefing] = useLS('daily_briefing', null)
  const [briefingDate, setBriefingDate] = useLS('briefing_date', '')
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [showBriefing, setShowBriefing] = useState(false)
  const [onboardingDone, setOnboardingDone] = useLS('onboarding_done', false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [listening, setListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef(null)
  const chatEndRef = useRef(null)
  const isFr = lang === 'fr'

  const greeting = () => {
    const h = new Date().getHours()
    const name = user?.name?.split(' ')[0] || ''
    if (h < 12) return (isFr ? 'Bonjour' : 'Good morning') + (name ? ', ' + name : '') + ' 👋'
    if (h < 18) return (isFr ? 'Bon après-midi' : 'Good afternoon') + (name ? ', ' + name : '') + ' ☀️'
    return (isFr ? 'Bonsoir' : 'Good evening') + (name ? ', ' + name : '') + ' 🌙'
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiHistory, aiLoading])

  async function loadBriefing(force = false) {
    const today = new Date().toDateString()
    const seenKey = 'briefing_seen_' + today
    if (!force && briefingDate === today && briefing && localStorage.getItem(seenKey)) { return }
    if (!force && briefingDate === today && briefing) { setShowBriefing(true); localStorage.setItem(seenKey, '1'); return }
    setBriefingLoading(true)
    try {
      const text = await generateDailyBriefing({ stats, user, date: today }, lang)
      setBriefing(text); setBriefingDate(today); setShowBriefing(true)
      localStorage.setItem('briefing_seen_' + today, '1')
    } catch {
      setBriefing(isFr ? 'Bienvenue sur Aria ! Bonne journée productive. 🚀' : 'Welcome to Aria! Have a productive day. 🚀')
      setShowBriefing(true)
    }
    setBriefingLoading(false)
  }

  useEffect(() => {
    const today = new Date().toDateString()
    const alreadySeen = localStorage.getItem('briefing_seen_' + today)
    if (!alreadySeen) loadBriefing()
  }, [])

  async function sendMessage() {
    if (!aiInput.trim() || aiLoading) return
    const userMsg = aiInput.trim()
    setAiInput('')
    setAiLoading(true)
    const newHistory = [...aiHistory, { role: 'user', content: userMsg }]
    setAiHistory(newHistory)
    try {
      const system = isFr
        ? 'Tu es Aria, assistant administratif IA professionnel. Sois concis et utile. Contexte: ' + JSON.stringify({ name: user?.name, role: user?.role })
        : 'You are Aria, a professional AI admin assistant. Be concise and helpful. Context: ' + JSON.stringify({ name: user?.name, role: user?.role })
      const reply = await callClaude(newHistory.slice(-10), system)
      setAiHistory(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setAiHistory(prev => [...prev, { role: 'assistant', content: isFr ? "Erreur IA. Réessayez." : 'AI error. Please retry.' }])
    }
    setAiLoading(false)
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      setInterimTranscript('')
      return
    }
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(isFr ? 'Dictée vocale non supportée. Utilisez Chrome.' : 'Voice input not supported. Use Chrome.')
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = isFr ? 'fr-FR' : 'en-US'
    rec.continuous = true
    rec.interimResults = true
    rec.onstart = () => setListening(true)
    rec.onend = () => { setListening(false); setInterimTranscript('') }
    rec.onerror = () => { setListening(false); setInterimTranscript('') }
    rec.onresult = e => {
      let final = ''
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      if (final) setAiInput(prev => prev + final)
      setInterimTranscript(interim)
    }
    recognitionRef.current = rec
    rec.start()
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ONBOARDING */}
      {!onboardingDone && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}>
          <div style={{ background: '#12141f', border: '1px solid rgba(100,112,241,0.3)', borderRadius: 24, padding: 40, maxWidth: 480, width: '100%', boxShadow: '0 0 60px rgba(100,112,241,0.15)', textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 20 }}>{ONBOARDING_STEPS[onboardingStep].icon}</div>
            <h2 style={{ margin: '0 0 12px', fontFamily: 'Outfit', fontWeight: 700, fontSize: 22, color: 'white' }}>
              {isFr ? ONBOARDING_STEPS[onboardingStep].titleFr : ONBOARDING_STEPS[onboardingStep].titleEn}
            </h2>
            <p style={{ margin: '0 0 28px', color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7 }}>
              {isFr ? ONBOARDING_STEPS[onboardingStep].descFr : ONBOARDING_STEPS[onboardingStep].descEn}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
              {ONBOARDING_STEPS.map((_, i) => (
                <div key={i} style={{ width: i === onboardingStep ? 28 : 8, height: 8, borderRadius: 99, background: i === onboardingStep ? '#6470f1' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {onboardingStep > 0 && (
                <button className="btn-secondary" onClick={() => setOnboardingStep(s => s - 1)} style={{ flex: 1 }}>← {isFr ? 'Précédent' : 'Back'}</button>
              )}
              {onboardingStep < ONBOARDING_STEPS.length - 1 ? (
                <button className="btn-primary" onClick={() => setOnboardingStep(s => s + 1)} style={{ flex: 1, justifyContent: 'center' }}>
                  {isFr ? 'Suivant' : 'Next'} →
                </button>
              ) : (
                <button className="btn-primary" onClick={() => setOnboardingDone(true)} style={{ flex: 1, justifyContent: 'center' }}>
                  {isFr ? "C'est parti ! 🚀" : "Let's go! 🚀"}
                </button>
              )}
            </div>
            <button onClick={() => setOnboardingDone(true)} style={{ marginTop: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
              {isFr ? 'Passer le guide' : 'Skip guide'}
            </button>
          </div>
        </div>
      )}

      {/* BRIEFING MODAL */}
      {showBriefing && briefing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: '#12141f', border: '1px solid rgba(100,112,241,0.3)', borderRadius: 20, padding: 32, maxWidth: 540, width: '100%', boxShadow: '0 0 40px rgba(100,112,241,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 32 }}>🌅</span>
              <h2 style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, fontSize: 20, color: 'white' }}>
                {isFr ? 'Briefing du jour' : "Today's briefing"}
              </h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, margin: '0 0 24px', whiteSpace: 'pre-wrap' }}>{briefing}</p>
            <button className="btn-primary" onClick={() => setShowBriefing(false)} style={{ width: '100%', justifyContent: 'center' }}>
              {isFr ? "C'est parti ! 🚀" : "Let's go! 🚀"}
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, fontSize: 22, color: 'white' }}>{greeting()}</h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            {new Date().toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setDarkMode?.(!darkMode)} title={darkMode ? 'Mode clair' : 'Mode sombre'}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button className="btn-secondary" onClick={() => loadBriefing(true)} disabled={briefingLoading}>
            {briefingLoading ? '⏳' : '🌅'} {isFr ? 'Briefing' : 'Briefing'}
          </button>
          <button className="btn-secondary" onClick={() => { setOnboardingStep(0); setOnboardingDone(false) }}>
            ❓ {isFr ? 'Guide' : 'Guide'}
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {STAT_CARDS.map(card => (
          <button key={card.id} onClick={() => onNavigate(card.id)} style={{
            background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 18,
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(100,112,241,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,' + card.colorFrom + '22,' + card.colorTo + '11)', border: '1px solid ' + card.colorFrom + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{card.icon}</div>
              <span style={{ fontSize: 28, fontFamily: 'Outfit', fontWeight: 700, color: 'white' }}>{stats[card.key] ?? 0}</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{isFr ? card.labelFr : card.labelEn}</div>
          </button>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {isFr ? '⚡ Actions rapides' : '⚡ Quick actions'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { icon: '✉️', label: 'Emails', nav: 'emails' },
            { icon: '📅', label: isFr ? 'Calendrier' : 'Calendar', nav: 'calendar' },
            { icon: '✔️', label: isFr ? 'Tâches' : 'Tasks', nav: 'tasks' },
            { icon: '📊', label: 'Excel', nav: 'excel' },
            { icon: '💳', label: isFr ? 'Comptabilité' : 'Accounting', nav: 'accounting' },
            { icon: '🤝', label: 'CRM', nav: 'crm' },
            { icon: '👤', label: 'RH', nav: 'hr' },
            { icon: '📈', label: 'Analytics', nav: 'analytics' },
          ].map(action => (
            <button key={action.nav} className="btn-secondary" onClick={() => onNavigate(action.nav)}>
              {action.icon} {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI CHAT */}
      <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: 14, color: 'white' }}>🤖 Aria AI</span>
          </div>
          <button onClick={() => setAiHistory([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
            {isFr ? 'Effacer' : 'Clear'}
          </button>
        </div>

        <div style={{ height: 300, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {aiHistory.slice(-30).length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13, marginTop: 80 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
              {isFr ? 'Bonjour ! Comment puis-je vous aider ?' : 'Hello! How can I help you?'}
            </div>
          )}
          {aiHistory.slice(-30).map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '82%', padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.05)',
                border: '1px solid ' + (msg.role === 'user' ? 'rgba(100,112,241,0.3)' : 'rgba(255,255,255,0.07)'),
                fontSize: 13.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.65, whiteSpace: 'pre-wrap',
              }}>{msg.content}</div>
            </div>
          ))}
          {aiLoading && (
            <div style={{ display: 'flex', gap: 5, padding: '8px 14px' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#6470f1', opacity: 0.5 + i * 0.25 }} />)}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {listening && interimTranscript && (
          <div style={{ padding: '6px 16px', background: 'rgba(239,68,68,0.08)', borderTop: '1px solid rgba(239,68,68,0.15)', fontSize: 12, color: 'rgba(255,120,120,0.9)', fontStyle: 'italic' }}>
            🎙️ {interimTranscript}
          </div>
        )}

        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8 }}>
          <input className="input" value={aiInput} onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={listening ? (isFr ? '🎙️ Dictée en cours... (cliquez stop pour terminer)' : '🎙️ Listening... (click stop to finish)') : (isFr ? 'Demandez quelque chose à Aria...' : 'Ask Aria something...')}
            disabled={aiLoading}
          />
          <button onClick={toggleVoice} style={{
            background: listening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (listening ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'),
            borderRadius: 10, padding: '0 14px', fontSize: 18, cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: listening ? '0 0 14px rgba(239,68,68,0.4)' : 'none',
          }} title={listening ? (isFr ? 'Arrêter la dictée' : 'Stop recording') : (isFr ? 'Démarrer la dictée' : 'Start recording')}>
            {listening ? '⏹️' : '🎙️'}
          </button>
          <button className="btn-primary" onClick={sendMessage} disabled={aiLoading || !aiInput.trim()} style={{ whiteSpace: 'nowrap' }}>
            {isFr ? 'Envoyer' : 'Send'} →
          </button>
        </div>
      </div>
    </div>
  )
}
