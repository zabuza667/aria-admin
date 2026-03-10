import { useState } from 'react'
import { useLS } from '../../hooks/useStore'

const TYPE_CONFIG = {
  info: { color: '#6470f1', icon: 'ℹ️', bg: 'rgba(100,112,241,0.08)' },
  success: { color: '#10b981', icon: '✅', bg: 'rgba(16,185,129,0.08)' },
  warning: { color: '#f59e0b', icon: '⚠️', bg: 'rgba(245,158,11,0.08)' },
  error: { color: '#ef4444', icon: '🔴', bg: 'rgba(239,68,68,0.08)' },
}

const SAMPLE_NOTIFS = [
  { id: 's1', title: 'Facture en retard', message: 'FAC-2026-003 (Martin Industries, 7 200€) est en retard de 7 jours.', type: 'error', read: false, timestamp: new Date().toISOString() },
  { id: 's2', title: 'Réunion dans 30 min', message: 'Réunion de direction à 14h00 — Salle A.', type: 'warning', read: false, timestamp: new Date().toISOString() },
  { id: 's3', title: 'Email analysé', message: 'Email de Marie Dupont analysé. Brouillon disponible.', type: 'success', read: true, timestamp: new Date(Date.now() - 3600000).toISOString() },
]

export default function NotificationsView({ lang, notifications, setNotifications }) {
  const [rules, setRules] = useLS('notif_rules', [
    { id: 1, event: 'invoice_overdue', active: true, label: { fr: 'Facture en retard', en: 'Overdue invoice' } },
    { id: 2, event: 'meeting_reminder', active: true, label: { fr: 'Rappel réunion', en: 'Meeting reminder' } },
    { id: 3, event: 'email_received', active: false, label: { fr: 'Email reçu', en: 'Email received' } },
    { id: 4, event: 'task_due', active: true, label: { fr: 'Tâche échue', en: 'Task due' } },
  ])
  const [activeTab, setActiveTab] = useState('notifications')
  const isFr = lang === 'fr'

  const allNotifs = [...SAMPLE_NOTIFS, ...(notifications || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  function markAllRead() {
    setNotifications(prev => (prev || []).map(n => ({ ...n, read: true })))
  }

  function toggleRule(id) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  const unread = allNotifs.filter(n => !n.read).length

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {[['notifications', '🔔 ' + (isFr ? 'Notifications' : 'Notifications')], ['rules', '⚙️ ' + (isFr ? 'Règles' : 'Rules')]].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: activeTab === t ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.04)',
            color: activeTab === t ? '#a5b8fc' : 'rgba(255,255,255,0.5)',
          }}>{l}</button>
        ))}
        {unread > 0 && (
          <button className="btn-secondary" onClick={markAllRead} style={{ marginLeft: 'auto', fontSize: 12 }}>
            ✅ {isFr ? 'Tout lire' : 'Mark all read'}
          </button>
        )}
      </div>

      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allNotifs.map(notif => {
            const tc = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info
            return (
              <div key={notif.id} style={{
                background: notif.read ? '#12141f' : tc.bg,
                border: '1px solid ' + (notif.read ? 'rgba(255,255,255,0.05)' : tc.color + '33'),
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{ fontSize: 18 }}>{tc.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: notif.read ? 500 : 700, color: notif.read ? 'rgba(255,255,255,0.7)' : 'white', fontSize: 13 }}>{notif.title}</span>
                    {!notif.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: tc.color }} />}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{notif.message}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    {new Date(notif.timestamp).toLocaleString(isFr ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'rules' && (
        <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
          {rules.map(rule => (
            <div key={rule.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 500, color: 'white', fontSize: 13 }}>{rule.label[lang] || rule.label.fr}</span>
              <button onClick={() => toggleRule(rule.id)} style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: rule.active ? '#6470f1' : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, transition: 'left 0.2s', left: rule.active ? 22 : 3 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
