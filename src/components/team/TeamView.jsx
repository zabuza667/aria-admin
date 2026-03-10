import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ROLES } from '../../lib/roles'
import { useLS } from '../../hooks/useStore'

export default function TeamView({ lang, user }) {
  const [members, setMembers] = useLS('team_members', [])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('assistant')
  const [inviting, setInviting] = useState(false)
  const [msg, setMsg] = useState('')
  const isFr = lang === 'fr'

  async function inviteMember() {
    if (!inviteEmail) return
    setInviting(true)
    try {
      const newMember = { id: Date.now(), email: inviteEmail, role: inviteRole, status: 'invited', invitedAt: new Date().toISOString() }
      setMembers(prev => [...prev, newMember])
      setMsg(isFr ? '✅ Invitation envoyée à ' + inviteEmail : '✅ Invitation sent to ' + inviteEmail)
      setInviteEmail('')
      setTimeout(() => setMsg(''), 3000)
    } catch { setMsg(isFr ? '❌ Erreur' : '❌ Error') }
    setInviting(false)
  }

  function changeRole(id, role) {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m))
  }

  function removeMember(id) {
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  const allMembers = [
    { id: 'current', email: user?.email || '', name: user?.name || '', role: user?.role || 'admin', status: 'active', isCurrentUser: true },
    ...members,
  ]

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Invite */}
      <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontFamily: 'Outfit', fontWeight: 600, color: 'white', fontSize: 15 }}>
          ➕ {isFr ? 'Inviter un membre' : 'Invite a member'}
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} type="email" placeholder={isFr ? 'Email du collaborateur' : 'Collaborator email'} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && inviteMember()} />
          <select className="input" style={{ width: 200 }} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
            {Object.entries(ROLES).filter(([k]) => k !== 'admin').map(([k, v]) => (
              <option key={k} value={k}>{v.label[lang] || v.label.fr}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={inviteMember} disabled={inviting || !inviteEmail}>
            {inviting ? '...' : (isFr ? 'Inviter' : 'Invite')}
          </button>
        </div>
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{msg}</div>}
      </div>

      {/* Members list */}
      <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {allMembers.length} {isFr ? 'membres' : 'members'}
        </div>
        {allMembers.map(member => {
          const roleInfo = ROLES[member.role]
          return (
            <div key={member.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: roleInfo?.color + '33' || 'rgba(100,112,241,0.2)', border: '2px solid ' + (roleInfo?.color + '66' || '#6470f1'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: roleInfo?.color || '#a5b8fc', flexShrink: 0 }}>
                {(member.name || member.email || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>
                  {member.name || member.email}
                  {member.isCurrentUser && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'rgba(100,112,241,0.2)', color: '#a5b8fc' }}>{isFr ? 'Vous' : 'You'}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{member.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: member.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: member.status === 'active' ? '#10b981' : '#f59e0b', border: '1px solid ' + (member.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)') }}>
                  {member.status === 'active' ? (isFr ? 'Actif' : 'Active') : (isFr ? 'Invité' : 'Invited')}
                </span>
                {!member.isCurrentUser ? (
                  <>
                    <select className="input" style={{ padding: '4px 8px', fontSize: 11, width: 160 }} value={member.role} onChange={e => changeRole(member.id, e.target.value)}>
                      {Object.entries(ROLES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label[lang] || v.label.fr}</option>
                      ))}
                    </select>
                    <button onClick={() => removeMember(member.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: 14 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                    >🗑️</button>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: roleInfo?.color || '#a5b8fc', fontWeight: 600 }}>
                    {roleInfo?.label?.[lang] || 'Admin'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Role legend */}
      <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          {isFr ? '🔑 Rôles disponibles' : '🔑 Available roles'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(ROLES).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: v.color + '11', border: '1px solid ' + v.color + '33' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: v.color }}>{v.label[lang] || v.label.fr}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
