import { useState } from 'react'
import { ROLES } from '../../lib/roles'
import { useLS } from '../../hooks/useStore'

const ROLE_ICONS = {
  admin: '🛡️', director: '👔', assistant: '🤝', officeManager: '🏢',
  hrManager: '👤', accountant: '📊', secretary: '📋', reader: '👁️'
}

const ROLE_DESCRIPTIONS = {
  admin: { fr: 'Accès total à toutes les sections. Gestion des membres, paramètres et logs.', en: 'Full access to all sections. Manages members, settings and logs.' },
  director: { fr: 'Vue stratégique complète. Accès CEO, analytics, comptabilité et toutes les opérations.', en: 'Full strategic view. CEO dashboard, analytics, accounting and all operations.' },
  assistant: { fr: 'Gestion emails, calendrier, tâches et CRM. Support de direction au quotidien.', en: 'Manages emails, calendar, tasks and CRM. Daily executive support.' },
  officeManager: { fr: 'Coordination bureau, RH, comptabilité et suivi des équipes.', en: 'Office coordination, HR, accounting and team follow-up.' },
  hrManager: { fr: 'Gestion RH complète : congés, contrats, recrutement et suivi collaborateurs.', en: 'Full HR management: leaves, contracts, recruitment and staff tracking.' },
  accountant: { fr: 'Accès comptabilité, Excel et reporting financier. Gestion des factures.', en: 'Accounting, Excel and financial reporting. Invoice management.' },
  secretary: { fr: 'Emails, calendrier et gestion des tâches administratives quotidiennes.', en: 'Emails, calendar and daily administrative task management.' },
  reader: { fr: 'Accès lecture seule au tableau de bord et aux journaux.', en: 'Read-only access to dashboard and logs.' },
}

export default function TeamView({ lang, user }) {
  const [members, setMembers] = useLS('team_members', [])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('assistant')
  const [inviting, setInviting] = useState(false)
  const [msg, setMsg] = useState('')
  const [selectedRole, setSelectedRole] = useState(null)
  const isFr = lang === 'fr'

  async function inviteMember() {
    if (!inviteEmail) return
    setInviting(true)
    const newMember = { id: Date.now(), email: inviteEmail, role: inviteRole, status: 'invited', invitedAt: new Date().toISOString() }
    setMembers(prev => [...prev, newMember])
    setMsg((isFr ? '✅ Invitation envoyée à ' : '✅ Invitation sent to ') + inviteEmail)
    setInviteEmail('')
    setTimeout(() => setMsg(''), 3000)
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

  const roleEntries = Object.entries(ROLES)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ROLE DETAIL MODAL */}
      {selectedRole && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}
          onClick={() => setSelectedRole(null)}>
          <div style={{ background: 'var(--surface)', border: '1px solid ' + ROLES[selectedRole].color + '44', borderRadius: 20, padding: 32, maxWidth: 500, width: '100%', boxShadow: '0 0 40px ' + ROLES[selectedRole].color + '22' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: ROLES[selectedRole].color + '22', border: '2px solid ' + ROLES[selectedRole].color + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                {ROLE_ICONS[selectedRole]}
              </div>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, color: 'var(--text)', fontSize: 20 }}>
                  {ROLES[selectedRole].label[lang] || ROLES[selectedRole].label.fr}
                </h3>
                <div style={{ fontSize: 12, color: ROLES[selectedRole].color, fontWeight: 600, marginTop: 2 }}>
                  {isFr ? 'Niveau' : 'Level'} {ROLES[selectedRole].level}/10
                </div>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>
              {ROLE_DESCRIPTIONS[selectedRole]?.[lang] || ROLE_DESCRIPTIONS[selectedRole]?.fr}
            </p>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                {isFr ? 'Sections accessibles' : 'Accessible sections'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ROLES[selectedRole].sections.map(s => (
                  <span key={s} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: ROLES[selectedRole].color + '18', color: ROLES[selectedRole].color, border: '1px solid ' + ROLES[selectedRole].color + '33', fontWeight: 600 }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <button className="btn-secondary" onClick={() => setSelectedRole(null)} style={{ width: '100%', justifyContent: 'center' }}>
              {isFr ? 'Fermer' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* INVITE */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontFamily: 'Outfit', fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>
          ➕ {isFr ? 'Inviter un membre' : 'Invite a member'}
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} type="email"
            placeholder={isFr ? 'Email du collaborateur' : 'Collaborator email'}
            value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && inviteMember()} />
          <select className="input" style={{ width: 200 }} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
            {roleEntries.filter(([k]) => k !== 'admin').map(([k, v]) => (
              <option key={k} value={k}>{ROLE_ICONS[k]} {v.label[lang] || v.label.fr}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={inviteMember} disabled={inviting || !inviteEmail}>
            {inviting ? '...' : (isFr ? 'Inviter' : 'Invite')}
          </button>
        </div>
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{msg}</div>}
      </div>

      {/* MEMBERS LIST */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {allMembers.length} {isFr ? 'membres' : 'members'}
        </div>
        {allMembers.map(member => {
          const roleInfo = ROLES[member.role]
          return (
            <div key={member.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: roleInfo?.color + '22', border: '2px solid ' + (roleInfo?.color + '55'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: roleInfo?.color, flexShrink: 0 }}>
                {ROLE_ICONS[member.role] || (member.name || member.email || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>
                  {member.name || member.email}
                  {member.isCurrentUser && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'rgba(100,112,241,0.2)', color: '#a5b8fc' }}>{isFr ? 'Vous' : 'You'}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{member.email}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: member.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: member.status === 'active' ? '#10b981' : '#f59e0b', border: '1px solid ' + (member.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)') }}>
                {member.status === 'active' ? (isFr ? 'Actif' : 'Active') : (isFr ? 'Invité' : 'Invited')}
              </span>
              {!member.isCurrentUser ? (
                <>
                  <select className="input" style={{ padding: '4px 8px', fontSize: 11, width: 170 }} value={member.role} onChange={e => changeRole(member.id, e.target.value)}>
                    {roleEntries.map(([k, v]) => (
                      <option key={k} value={k}>{ROLE_ICONS[k]} {v.label[lang] || v.label.fr}</option>
                    ))}
                  </select>
                  <button onClick={() => removeMember(member.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                  >🗑️</button>
                </>
              ) : (
                <span style={{ fontSize: 12, color: roleInfo?.color, fontWeight: 700 }}>
                  {ROLE_ICONS[member.role]} {roleInfo?.label?.[lang] || 'Admin'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* ROLES CLIQUABLES */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          🔑 {isFr ? 'Rôles disponibles — cliquez pour voir le détail' : 'Available roles — click to see details'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {roleEntries.map(([k, v]) => (
            <button key={k} onClick={() => setSelectedRole(k)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
              background: v.color + '0f', border: '1px solid ' + v.color + '30',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = v.color + '20'; e.currentTarget.style.borderColor = v.color + '60'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = v.color + '0f'; e.currentTarget.style.borderColor = v.color + '30'; e.currentTarget.style.transform = 'none' }}
            >
              <span style={{ fontSize: 22 }}>{ROLE_ICONS[k]}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: v.color }}>{v.label[lang] || v.label.fr}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{isFr ? 'Niveau' : 'Level'} {v.level}/10 · {v.sections.length} {isFr ? 'sections' : 'sections'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
