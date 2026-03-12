import { useState } from 'react'

const TYPE_CONFIG = {
  info: { color: '#6470f1', icon: 'ℹ️' },
  success: { color: '#10b981', icon: '✅' },
  warning: { color: '#f59e0b', icon: '⚠️' },
  error: { color: '#ef4444', icon: '❌' },
}

export default function LogsView({ logs = [], setLogs, lang }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const isFr = lang === 'fr'

  const filtered = logs.filter(l => {
    const matchFilter = filter === 'all' || l.type === filter
    const matchSearch = !search || l.message.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
        <input className="input" style={{ maxWidth: 240 }} placeholder={isFr ? '🔍 Rechercher...' : '🔍 Search...'} value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'info', 'success', 'warning', 'error'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: filter === f ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.04)',
              color: filter === f ? '#a5b8fc' : 'rgba(255,255,255,0.4)',
            }}>{f === 'all' ? (isFr ? 'Tous' : 'All') : f}</button>
          ))}
        </div>
        <button className="btn-secondary" onClick={() => setLogs([])} style={{ marginLeft: 'auto', fontSize: 12 }}>
          🗑️ {isFr ? 'Effacer' : 'Clear'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', paddingTop: 80 }}>
            <div style={{ fontSize: 40 }}>📜</div>
            <p>{isFr ? 'Aucun log trouvé' : 'No logs found'}</p>
          </div>
        ) : filtered.map(log => {
          const tc = TYPE_CONFIG[log.type] || TYPE_CONFIG.info
          return (
            <div key={log.id} style={{
              background: 'var(--surface)',
              border: '1px solid ' + tc.color + '22',
              borderLeft: '3px solid ' + tc.color,
              borderRadius: 10, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              animation: 'fadeIn 0.2s ease',
            }}>
              <span style={{ fontSize: 14 }}>{tc.icon}</span>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)' }}>{log.message}</span>
              {log.section && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: 'var(--muted2)' }}>{log.section}</span>}
              <span style={{ fontSize: 10, color: 'var(--muted2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {new Date(log.timestamp).toLocaleTimeString(isFr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted2)', textAlign: 'center', flexShrink: 0 }}>
        {filtered.length} {isFr ? 'entrées' : 'entries'} {filter !== 'all' ? '(' + filter + ')' : ''}
      </div>
    </div>
  )
}
