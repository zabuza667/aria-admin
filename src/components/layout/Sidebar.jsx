import { useState } from 'react'
import { getNavItems, ROLES } from '../../lib/roles'

export default function Sidebar({ current, onNavigate, user, lang, onLogout, notifCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false)
  const role = user?.role || 'admin'
  const navItems = getNavItems(role, lang)
  const roleInfo = ROLES[role]

  return (
    <aside style={{
      width: collapsed ? 64 : 220, minHeight: '100vh',
      background: 'linear-gradient(180deg, #12141f 0%, #0e1019 100%)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease',
      flexShrink: 0, position: 'sticky', top: 0, overflow: 'hidden',
    }}>
      <div style={{ padding: collapsed ? '20px 0' : '20px 16px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #6470f1, #a5b8fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, fontFamily: 'Outfit', boxShadow: '0 0 12px rgba(100,112,241,0.4)' }}>A</div>
            <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 18, color: 'white' }}>Aria</span>
          </div>
        )}
        {collapsed && (
          <div onClick={() => setCollapsed(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #6470f1, #a5b8fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>A</div>
        )}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 18, padding: 4 }}>‹</button>
        )}
      </div>

      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {navItems.map(item => {
          const isActive = current === item.id
          const showBadge = item.id === 'notifications' && notifCount > 0
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} title={collapsed ? item.label : ''} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: collapsed ? '10px 0' : '9px 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 2,
              transition: 'all 0.15s',
              background: isActive ? 'rgba(100,112,241,0.15)' : 'transparent',
              color: isActive ? '#a5b8fc' : 'rgba(255,255,255,0.5)',
              fontFamily: 'DM Sans', fontSize: 13.5, fontWeight: isActive ? 600 : 400,
              position: 'relative',
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}}
            >
              {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 4px 4px 0', background: '#6470f1' }} />}
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
              {!collapsed && showBadge && <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', borderRadius: 9999, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{notifCount}</span>}
            </button>
          )
        })}
      </nav>

      <div style={{ padding: collapsed ? '12px 0' : '12px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: roleInfo?.color || '#6470f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || user?.email?.split('@')[0] || 'Utilisateur'}
              </div>
              <div style={{ fontSize: 10, color: roleInfo?.color || '#6470f1' }}>
                {roleInfo?.label?.[lang] || 'Admin'}
              </div>
            </div>
            <button onClick={onLogout} title="Déconnexion" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: 4, borderRadius: 6, flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >⏏</button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: roleInfo?.color || '#6470f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer' }} title={user?.name || 'Utilisateur'}>
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
