import { useState } from 'react'
import { NAV_ITEMS } from '../../lib/roles'

export default function Header({ section, lang, setLang, user, onSearch, notifications = [] }) {
  const [searchVal, setSearchVal] = useState('')
  const navItem = NAV_ITEMS.find(n => n.id === section)
  const unread = notifications.filter(n => !n.read).length
  const label = navItem ? (lang === 'fr' ? navItem.labelFr : navItem.labelEn) : ''
  const icon = navItem?.icon || '🏠'

  return (
    <header style={{
      height: 60, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
      borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10,11,18,0.8)',
      backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 40,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h1 style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 600, fontSize: 18, color: 'white' }}>{label}</h1>
      </div>

      <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>🔍</span>
        <input className="input" style={{ paddingLeft: 36 }}
          placeholder={lang === 'fr' ? 'Rechercher...' : 'Search...'}
          value={searchVal}
          onChange={e => { setSearchVal(e.target.value); onSearch?.(e.target.value) }}
        />
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.7)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>🌐 {lang.toUpperCase()}</button>

        <button style={{
          position: 'relative', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
          padding: '6px 8px', color: 'rgba(255,255,255,0.7)', fontSize: 16, cursor: 'pointer',
        }}>
          🔔
          {unread > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', borderRadius: 9999, fontSize: 9, fontWeight: 700, padding: '1px 4px', minWidth: 16, textAlign: 'center' }}>{unread}</span>
          )}
        </button>
      </div>
    </header>
  )
}
