import { useState } from 'react'
import { callClaude, analyzeEmail } from '../../lib/claude'
import { useLS } from '../../hooks/useStore'

const SAMPLE_EMAILS = [
  { id: 1, from: 'client@example.com', fromName: 'Marie Dupont', subject: 'Devis projet Q2 2026', body: "Bonjour, suite à notre réunion d'hier, pourriez-vous m'envoyer le devis détaillé pour le projet Q2? Nous avons besoin de valider le budget avant la fin de semaine. Merci d'avance.", date: '2026-03-10T09:15:00', read: false, priority: 'haute', labels: ['client', 'urgent'] },
  { id: 2, from: 'direction@company.com', fromName: 'Direction Générale', subject: 'Réunion de direction - Vendredi 14h', body: "Rappel: réunion de direction vendredi à 14h en salle de conférence A. Ordre du jour: bilan Q1, projections Q2, RH. Merci de confirmer votre présence.", date: '2026-03-10T08:30:00', read: false, priority: 'haute', labels: ['réunion', 'interne'] },
  { id: 3, from: 'fournisseur@supplies.fr', fromName: 'Supplies Pro', subject: 'Livraison fournitures - Confirmation', body: "Votre commande #4521 est confirmée. Livraison prévue le 12 mars entre 9h et 12h. Montant: 847€ TTC.", date: '2026-03-09T16:45:00', read: true, priority: 'moyenne', labels: ['fournisseur'] },
  { id: 4, from: 'rh@company.com', fromName: 'Service RH', subject: "Demande de congé - Thomas Martin", body: "Thomas Martin a soumis une demande de congé du 20 au 27 mars 2026. Merci de valider ou refuser dans les 48h.", date: '2026-03-09T11:00:00', read: true, priority: 'moyenne', labels: ['rh'] },
  { id: 5, from: 'newsletter@tech.com', fromName: 'Tech Weekly', subject: 'Les dernières tendances IA en entreprise', body: "Cette semaine dans Tech Weekly: l'IA générative transforme les PME, les nouveaux modèles Claude 4, Microsoft Copilot dans Office 365...", date: '2026-03-08T07:00:00', read: true, priority: 'faible', labels: ['newsletter'] },
]

export default function EmailView({ lang, user, addLog }) {
  const [emails, setEmails] = useLS('emails', SAMPLE_EMAILS)
  const [selected, setSelected] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [draftReply, setDraftReply] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' })
  const [filter, setFilter] = useState('all')
  const isFr = lang === 'fr'

  const filtered = emails.filter(e => {
    if (filter === 'unread') return !e.read
    if (filter === 'urgent') return e.priority === 'haute'
    return true
  })

  async function analyzeSelectedEmail(email) {
    setAnalyzing(true)
    setAnalysis(null)
    try {
      addLog?.('📧 ' + (isFr ? 'Analyse email: ' : 'Analyzing email: ') + email.subject, 'info', 'emails')
      const result = await analyzeEmail(email, lang)
      setAnalysis(result)
      const draftMatch = result.match(/BROUILLON[^:]*:([\s\S]+?)(?:\n\n[A-Z]|$)/i) ||
                         result.match(/DRAFT[^:]*:([\s\S]+?)(?:\n\n[A-Z]|$)/i) ||
                         result.match(/RÉPONSE[^:]*:([\s\S]+?)(?:\n\n[A-Z]|$)/i)
      if (draftMatch) setDraftReply(draftMatch[1].trim())
      addLog?.('✅ ' + (isFr ? 'Email analysé avec succès' : 'Email analyzed successfully'), 'success', 'emails')
    } catch {
      setAnalysis(isFr ? 'Erreur lors de l\'analyse' : 'Analysis error')
    }
    setAnalyzing(false)
  }

  function markRead(email) {
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e))
  }

  function archiveEmail(email) {
    setEmails(prev => prev.filter(e => e.id !== email.id))
    setSelected(null)
    setAnalysis(null)
    addLog?.('📦 ' + (isFr ? 'Email archivé: ' : 'Email archived: ') + email.subject, 'info', 'emails')
  }

  async function sendReply() {
    if (!draftReply.trim()) return
    addLog?.('📤 ' + (isFr ? 'Email envoyé à ' : 'Email sent to ') + selected?.from, 'success', 'emails')
    alert(isFr ? 'Email envoyé !\n(Connectez Gmail pour l\'envoi réel)' : 'Email sent!\n(Connect Gmail for real sending)')
    setDraftReply('')
    setAnalysis(null)
    setSelected(null)
  }

  const priorityColor = p => p === 'haute' ? '#ef4444' : p === 'moyenne' ? '#f59e0b' : '#6b7280'
  const priorityLabel = p => isFr ? (p === 'haute' ? 'Urgente' : p === 'moyenne' ? 'Moyenne' : 'Faible') : (p === 'haute' ? 'High' : p === 'moyenne' ? 'Medium' : 'Low')

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* Email list */}
      <div style={{ width: 320, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button className="btn-primary" onClick={() => setShowCompose(true)} style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>
              ➕ {isFr ? 'Nouveau' : 'Compose'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['all', isFr ? 'Tous' : 'All'], ['unread', isFr ? 'Non lus' : 'Unread'], ['urgent', isFr ? 'Urgents' : 'Urgent']].map(([f, l]) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: '5px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: filter === f ? 'rgba(100,112,241,0.2)' : 'transparent',
                color: filter === f ? '#a5b8fc' : 'rgba(255,255,255,0.4)',
              }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(email => (
            <button key={email.id} onClick={() => { setSelected(email); markRead(email); setAnalysis(null); setDraftReply('') }} style={{
              width: '100%', textAlign: 'left', padding: '14px 16px',
              background: selected?.id === email.id ? 'rgba(100,112,241,0.1)' : 'transparent',
              border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (selected?.id !== email.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
            onMouseLeave={e => { if (selected?.id !== email.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: email.read ? 400 : 700, color: email.read ? 'rgba(255,255,255,0.5)' : 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                  {email.fromName}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                  {new Date(email.date).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: email.read ? 400 : 600, color: email.read ? 'rgba(255,255,255,0.6)' : 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                {!email.read && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#6470f1', marginRight: 6, verticalAlign: 'middle' }} />}
                {email.subject}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                  background: priorityColor(email.priority) + '22',
                  color: priorityColor(email.priority),
                  border: '1px solid ' + priorityColor(email.priority) + '40',
                }}>{priorityLabel(email.priority)}</span>
                {email.labels?.map(l => (
                  <span key={l} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{l}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Email detail */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 48 }}>📧</span>
            <p style={{ margin: 0, fontSize: 14 }}>{isFr ? 'Sélectionnez un email' : 'Select an email'}</p>
          </div>
        ) : (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header */}
            <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: '0 0 6px', fontFamily: 'Outfit', fontWeight: 600, fontSize: 18, color: 'white' }}>{selected.subject}</h3>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{selected.fromName}</strong> &lt;{selected.from}&gt;
                    <span style={{ marginLeft: 12 }}>{new Date(selected.date).toLocaleString(isFr ? 'fr-FR' : 'en-US')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-secondary" onClick={() => analyzeSelectedEmail(selected)} style={{ fontSize: 12 }}>
                    🤖 {isFr ? 'Analyser IA' : 'AI Analyze'}
                  </button>
                  <button className="btn-secondary" onClick={() => archiveEmail(selected)} style={{ fontSize: 12 }}>
                    📦 {isFr ? 'Archiver' : 'Archive'}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {selected.body}
              </div>
            </div>

            {/* Analysis */}
            {analyzing && (
              <div style={{ background: '#12141f', border: '1px solid rgba(100,112,241,0.2)', borderRadius: 16, padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🤖</div>
                {isFr ? "L'IA analyse l'email..." : 'AI is analyzing...'}
              </div>
            )}

            {analysis && (
              <div style={{ background: '#12141f', border: '1px solid rgba(100,112,241,0.2)', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 16 }}>🤖</span>
                  <span style={{ fontFamily: 'Outfit', fontWeight: 600, color: '#a5b8fc' }}>
                    {isFr ? 'Analyse IA' : 'AI Analysis'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 16 }}>{analysis}</div>

                {draftReply && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      {isFr ? '✉️ Brouillon de réponse' : '✉️ Reply draft'}
                    </div>
                    <textarea
                      value={draftReply}
                      onChange={e => setDraftReply(e.target.value)}
                      rows={6}
                      className="input"
                      style={{ resize: 'vertical', fontFamily: 'DM Sans', lineHeight: 1.6 }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button className="btn-primary" onClick={sendReply}>✅ {isFr ? 'Approuver et envoyer' : 'Approve & send'}</button>
                      <button className="btn-secondary" onClick={() => setDraftReply('')}>🚫 {isFr ? 'Annuler' : 'Cancel'}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 520 }}>
            <h3 style={{ margin: '0 0 20px', fontFamily: 'Outfit', fontWeight: 600, color: 'white' }}>
              ➕ {isFr ? 'Nouveau message' : 'New message'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input" placeholder={isFr ? 'À (email)' : 'To (email)'} value={composeData.to} onChange={e => setComposeData(p => ({ ...p, to: e.target.value }))} />
              <input className="input" placeholder={isFr ? 'Objet' : 'Subject'} value={composeData.subject} onChange={e => setComposeData(p => ({ ...p, subject: e.target.value }))} />
              <textarea className="input" rows={6} placeholder={isFr ? 'Message...' : 'Message...'} value={composeData.body} onChange={e => setComposeData(p => ({ ...p, body: e.target.value }))} style={{ resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={() => { addLog?.('📤 Email envoyé à ' + composeData.to, 'success', 'emails'); setShowCompose(false); setComposeData({ to: '', subject: '', body: '' }) }}>
                  ✅ {isFr ? 'Envoyer' : 'Send'}
                </button>
                <button className="btn-secondary" onClick={() => setShowCompose(false)}>🚫 {isFr ? 'Annuler' : 'Cancel'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
