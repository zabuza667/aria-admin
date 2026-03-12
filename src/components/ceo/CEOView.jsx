import { useState } from 'react'
import { generateCEOReport } from '../../lib/claude'

export default function CEOView({ lang, user }) {
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const isFr = lang === 'fr'

  const kpis = [
    { label: isFr ? 'Score productivité' : 'Productivity score', value: 78, max: 100, color: '#6470f1', icon: '⚡' },
    { label: isFr ? 'Emails traités' : 'Emails processed', value: 94, max: 100, color: '#10b981', icon: '📧' },
    { label: isFr ? 'Tâches complétées' : 'Tasks completed', value: 67, max: 100, color: '#f59e0b', icon: '✅' },
    { label: isFr ? 'Satisfaction équipe' : 'Team satisfaction', value: 82, max: 100, color: '#ec4899', icon: '👥' },
    { label: isFr ? 'CA mensuel' : 'Monthly revenue', value: 67000, max: 80000, color: '#06b6d4', icon: '💰', isCurrency: true },
    { label: isFr ? 'Factures en retard' : 'Overdue invoices', value: 1, max: 10, color: '#ef4444', icon: '🔴', isAlert: true },
  ]

  const alerts = [
    { type: 'warning', msg: isFr ? '⚠️ 1 facture en retard — Martin Industries 7 200€' : '⚠️ 1 overdue invoice — Martin Industries €7,200' },
    { type: 'info', msg: isFr ? 'ℹ️ Demande de congé en attente — Thomas Martin (6 jours)' : 'ℹ️ Pending leave request — Thomas Martin (6 days)' },
    { type: 'success', msg: isFr ? '✅ CA en hausse de +15% vs mois précédent' : '✅ Revenue up +15% vs previous month' },
  ]

  async function generateReport() {
    setLoading(true)
    try {
      const data = { kpis, alerts, date: new Date().toLocaleDateString(isFr ? 'fr-FR' : 'en-US') }
      const result = await generateCEOReport(data, lang)
      setReport(result)
    } catch { setReport(isFr ? 'Erreur génération rapport' : 'Report generation error') }
    setLoading(false)
  }

  const score = 78
  const circumference = 2 * Math.PI * 54
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, fontSize: 20, color: 'var(--text)' }}>
            👔 {isFr ? 'Vue Directeur' : 'Director View'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
            {new Date().toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button className="btn-primary" onClick={generateReport} disabled={loading}>
          🤖 {loading ? '...' : (isFr ? 'Rapport exécutif' : 'Executive report')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'start' }}>
        {/* Score circulaire */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 180 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isFr ? 'Score global' : 'Global score'}
          </div>
          <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
            <circle cx="64" cy="64" r="54" fill="none" stroke="#6470f1" strokeWidth="10"
              strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease', filter: 'drop-shadow(0 0 6px rgba(100,112,241,0.5))' }}
            />
            <text x="64" y="68" textAnchor="middle" dominantBaseline="middle" fill="white"
              fontSize="26" fontWeight="800" fontFamily="Outfit" style={{ transform: 'rotate(90deg)', transformOrigin: '64px 64px' }}>
              {score}
            </text>
          </svg>
          <div style={{ fontSize: 12, color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
            {score >= 80 ? (isFr ? 'Excellent' : 'Excellent') : score >= 60 ? (isFr ? 'Bon' : 'Good') : (isFr ? 'À améliorer' : 'Needs work')}
          </div>
        </div>

        {/* KPIs grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {kpis.map(kpi => (
            <div key={kpi.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{kpi.icon}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{kpi.label}</span>
              </div>
              <div style={{ fontSize: 20, fontFamily: 'Outfit', fontWeight: 700, color: kpi.color, marginBottom: 8 }}>
                {kpi.isCurrency ? kpi.value.toLocaleString(isFr ? 'fr-FR' : 'en-US') + '€' : kpi.value + (kpi.isAlert ? '' : '/' + kpi.max)}
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: Math.min((kpi.value / kpi.max) * 100, 100) + '%', background: kpi.color, borderRadius: 9999, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          {isFr ? '🚨 Alertes & Points d\'attention' : '🚨 Alerts & Action items'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map((alert, i) => (
            <div key={i} style={{
              padding: '10px 14px', borderRadius: 10,
              background: alert.type === 'warning' ? 'rgba(245,158,11,0.08)' : alert.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(100,112,241,0.08)',
              border: '1px solid ' + (alert.type === 'warning' ? 'rgba(245,158,11,0.2)' : alert.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(100,112,241,0.2)'),
              fontSize: 13, color: 'var(--text2)',
            }}>{alert.msg}</div>
          ))}
        </div>
      </div>

      {/* AI Report */}
      {report && (
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(100,112,241,0.2)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b8fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            🤖 {isFr ? 'Rapport exécutif IA' : 'AI Executive Report'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{report}</div>
        </div>
      )}
    </div>
  )
}
