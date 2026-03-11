import { useState } from 'react'
import { NAV_ITEMS } from '../../lib/roles'

export default function Header({ section, lang, setLang, user, notifications = [], unreadNotifs = 0, onOpenSearch, darkMode, setDarkMode, onNavigate, onRefresh }) {
  const [copied, setCopied] = useState(false)
  const navItem = NAV_ITEMS.find(n => n.id === section)
  const label = navItem ? (lang === 'fr' ? navItem.labelFr : navItem.labelEn) : ''
  const icon = navItem?.icon || '🏠'
  const isFr = lang === 'fr'

  function handleCopy() {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <header style={{
      height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: darkMode ? 'rgba(10,11,18,0.85)' : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 40, transition: 'background 0.3s',
    }}>
      {/* Section title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h1 style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 600, fontSize: 17, color: darkMode ? 'white' : '#1a1d2e' }}>{label}</h1>
      </div>

      {/* Search bar - opens Ctrl+K */}
      <button onClick={onOpenSearch} style={{
        flex: 1, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 10,
        background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
        border: '1px solid ' + (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'),
        borderRadius: 10, padding: '7px 14px', cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(100,112,241,0.4)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}
      >
        <span style={{ fontSize: 13, color: 'rgba(150,150,180,0.7)' }}>🔍</span>
        <span style={{ fontSize: 13, color: 'rgba(150,150,180,0.6)', flex: 1 }}>{isFr ? 'Rechercher...' : 'Search...'}</span>
        <span style={{ fontSize: 10, color: 'rgba(150,150,180,0.4)', background: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>Ctrl K</span>
      </button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Refresh */}
        <button onClick={() => onRefresh?.()} title={isFr ? 'Rafraîchir' : 'Refresh'} style={{
          background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
          border: '1px solid ' + (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'),
          borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 14,
        }}>🔄</button>

        {/* Copy link */}
        <button onClick={handleCopy} title={isFr ? 'Copier le lien' : 'Copy link'} style={{
          background: copied ? 'rgba(16,185,129,0.15)' : (darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'),
          border: '1px solid ' + (copied ? 'rgba(16,185,129,0.4)' : (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)')),
          borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 14, transition: 'all 0.2s',
        }}>{copied ? '✅' : '📋'}</button>
        {/* Dark/light toggle */}
        <button onClick={() => setDarkMode?.(!darkMode)} style={{
          background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
          border: '1px solid ' + (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'),
          borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 14,
        }} title={darkMode ? (isFr ? 'Mode clair' : 'Light mode') : (isFr ? 'Mode sombre' : 'Dark mode')}>
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Lang */}
        <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} style={{
          background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
          border: '1px solid ' + (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'),
          borderRadius: 8, padding: '5px 10px', color: darkMode ? 'rgba(255,255,255,0.7)' : '#444',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>🌐 {lang.toUpperCase()}</button>

        {/* Notifications bell with animated badge */}
        <button onClick={() => onNavigate?.('notifications')} style={{
          position: 'relative',
          background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
          border: '1px solid ' + (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'),
          borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 16,
        }}>
          🔔
          {unreadNotifs > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -5,
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              color: 'white', borderRadius: 99, fontSize: 9, fontWeight: 700,
              padding: '1px 5px', minWidth: 16, textAlign: 'center',
              boxShadow: '0 0 8px rgba(239,68,68,0.6)',
              animation: 'pulse 2s infinite',
            }}>{unreadNotifs}</span>
          )}
        </button>

        {/* User avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6470f1, #a5b8fc)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {(user?.name || user?.email || 'A')[0].toUpperCase()}
        </div>
      </div>
    </header>
  )
}
