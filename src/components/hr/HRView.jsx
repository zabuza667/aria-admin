import { useState } from 'react'
import { useLS } from '../../hooks/useStore'
import { callClaude } from '../../lib/claude'

const SAMPLE_EMPLOYEES = [
  { id: 1, name: 'Marie Dupont', role: 'Office Manager', email: 'marie@company.com', phone: '06 12 34 56 78', contract: 'CDI', startDate: '2022-03-15', leaveBalance: 12, status: 'active' },
  { id: 2, name: 'Thomas Martin', role: 'Comptable', email: 'thomas@company.com', phone: '06 98 76 54 32', contract: 'CDI', startDate: '2021-09-01', leaveBalance: 8, status: 'active' },
  { id: 3, name: 'Julie Rousseau', role: 'Assistante RH', email: 'julie@company.com', phone: '07 11 22 33 44', contract: 'CDD', startDate: '2025-06-01', leaveBalance: 15, status: 'active' },
]

const SAMPLE_LEAVES = [
  { id: 1, employee: 'Thomas Martin', type: 'Congés payés', from: '2026-03-20', to: '2026-03-27', days: 6, status: 'pending', reason: 'Vacances familiales' },
  { id: 2, employee: 'Marie Dupont', type: 'RTT', from: '2026-03-13', to: '2026-03-13', days: 1, status: 'approved', reason: 'RTT' },
  { id: 3, employee: 'Julie Rousseau', type: 'Maladie', from: '2026-03-04', to: '2026-03-05', days: 2, status: 'approved', reason: 'Arrêt maladie' },
]

export default function HRView({ lang, addLog, triggerSave }) {
  const [employees, setEmployees] = useLS('hr_employees', SAMPLE_EMPLOYEES, triggerSave)
  const [leaves, setLeaves] = useLS('hr_leaves', SAMPLE_LEAVES, triggerSave)
  const [activeTab, setActiveTab] = useState('employees')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const isFr = lang === 'fr'

  function approveLeave(id) {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'approved' } : l))
    addLog?.('✅ ' + (isFr ? 'Congé approuvé' : 'Leave approved'), 'success', 'hr')
  }

  function rejectLeave(id) {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'rejected' } : l))
    addLog?.('🚫 ' + (isFr ? 'Congé refusé' : 'Leave rejected'), 'info', 'hr')
  }

  async function analyzeHR() {
    setAiLoading(true)
    try {
      const result = await callClaude(
        (isFr ? 'Analyse ces données RH et donne des recommandations:\n' : 'Analyze this HR data and give recommendations:\n') + JSON.stringify({ employees, leaves }),
        '', { maxTokens: 600 }
      )
      setAiAnalysis(result)
    } catch {}
    setAiLoading(false)
  }

  const statusColor = s => s === 'approved' ? '#10b981' : s === 'pending' ? '#f59e0b' : '#ef4444'
  const statusLabel = s => isFr ? (s === 'approved' ? 'Approuvé' : s === 'pending' ? 'En attente' : 'Refusé') : (s === 'approved' ? 'Approved' : s === 'pending' ? 'Pending' : 'Rejected')

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: isFr ? '👥 Employés' : '👥 Employees', value: employees.filter(e => e.status === 'active').length, color: '#6470f1' },
          { label: isFr ? '⏳ Congés en attente' : '⏳ Pending leaves', value: leaves.filter(l => l.status === 'pending').length, color: '#f59e0b' },
          { label: isFr ? '📄 CDI' : '📄 Permanent', value: employees.filter(e => e.contract === 'CDI').length, color: '#10b981' },
          { label: isFr ? '📋 CDD' : '📋 Contract', value: employees.filter(e => e.contract === 'CDD').length, color: '#ec4899' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontSize: 28, fontFamily: 'Outfit', fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['employees', '👥 ' + (isFr ? 'Employés' : 'Employees')], ['leaves', '🌴 ' + (isFr ? 'Congés' : 'Leaves')], ['ai', '🤖 IA RH']].map(([t, l]) => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeTab === t ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTab === t ? '#a5b8fc' : 'rgba(255,255,255,0.5)',
            }}>{l}</button>
          ))}
        </div>
        {activeTab === 'employees' && <button className="btn-primary" onClick={() => { setEditItem({ name: '', role: '', email: '', phone: '', contract: 'CDI', startDate: '', leaveBalance: 25, status: 'active' }); setShowModal(true) }}>➕ {isFr ? 'Employé' : 'Employee'}</button>}
        {activeTab === 'leaves' && <button className="btn-primary" onClick={() => { setEditItem({ employee: '', type: 'Congés payés', from: '', to: '', days: 1, status: 'pending', reason: '' }); setShowModal(true) }}>➕ {isFr ? 'Congé' : 'Leave'}</button>}
        {activeTab === 'ai' && <button className="btn-primary" onClick={analyzeHR} disabled={aiLoading}>🤖 {aiLoading ? '...' : (isFr ? 'Analyser' : 'Analyze')}</button>}
      </div>

      {/* Employees */}
      {activeTab === 'employees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {employees.map(emp => (
            <div key={emp.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #6470f1, #a5b8fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
                {emp.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{emp.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{emp.role} · {emp.email}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{isFr ? 'Contrat' : 'Contract'}</div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: emp.contract === 'CDI' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: emp.contract === 'CDI' ? '#10b981' : '#f59e0b' }}>{emp.contract}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{isFr ? 'Congés' : 'Leave'}</div>
                <div style={{ fontSize: 20, fontFamily: 'Outfit', fontWeight: 700, color: '#a5b8fc' }}>{emp.leaveBalance}j</div>
              </div>
              <button onClick={() => { setEditItem({ ...emp }); setShowModal(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: 16 }}>✏️</button>
            </div>
          ))}
        </div>
      )}

      {/* Leaves */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leaves.map(leave => (
            <div key={leave.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{leave.employee}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{leave.type} · {leave.from} → {leave.to} ({leave.days}j)</div>
                {leave.reason && <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2 }}>{leave.reason}</div>}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: statusColor(leave.status) + '22', color: statusColor(leave.status), border: '1px solid ' + statusColor(leave.status) + '44' }}>
                {statusLabel(leave.status)}
              </span>
              {leave.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-primary" onClick={() => approveLeave(leave.id)} style={{ fontSize: 11, padding: '4px 12px' }}>✅ {isFr ? 'Approuver' : 'Approve'}</button>
                  <button className="btn-secondary" onClick={() => rejectLeave(leave.id)} style={{ fontSize: 11, padding: '4px 12px', color: '#ef4444' }}>🚫 {isFr ? 'Refuser' : 'Reject'}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI */}
      {activeTab === 'ai' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, minHeight: 200 }}>
          {aiAnalysis ? (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{aiAnalysis}</div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted2)', paddingTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <p>{isFr ? 'Cliquez sur Analyser pour obtenir des insights RH' : 'Click Analyze for HR insights'}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && editItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }}>
            <h3 style={{ margin: '0 0 20px', fontFamily: 'Outfit', fontWeight: 600, color: 'var(--text)' }}>
              {editItem.id ? '✏️ ' + (isFr ? 'Modifier' : 'Edit') : '➕ ' + (isFr ? 'Ajouter' : 'Add')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeTab === 'employees' ? (
                <>
                  <input className="input" placeholder={isFr ? 'Nom complet *' : 'Full name *'} value={editItem.name || ''} onChange={e => setEditItem(p => ({ ...p, name: e.target.value }))} />
                  <input className="input" placeholder={isFr ? 'Poste' : 'Role'} value={editItem.role || ''} onChange={e => setEditItem(p => ({ ...p, role: e.target.value }))} />
                  <input className="input" placeholder="Email" type="email" value={editItem.email || ''} onChange={e => setEditItem(p => ({ ...p, email: e.target.value }))} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{isFr ? 'Contrat' : 'Contract'}</label>
                      <select className="input" value={editItem.contract || 'CDI'} onChange={e => setEditItem(p => ({ ...p, contract: e.target.value }))}>
                        <option>CDI</option><option>CDD</option><option>Stage</option><option>Freelance</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{isFr ? 'Solde congés' : 'Leave balance'}</label>
                      <input className="input" type="number" value={editItem.leaveBalance || 0} onChange={e => setEditItem(p => ({ ...p, leaveBalance: Number(e.target.value) }))} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <input className="input" placeholder={isFr ? 'Employé *' : 'Employee *'} value={editItem.employee || ''} onChange={e => setEditItem(p => ({ ...p, employee: e.target.value }))} />
                  <select className="input" value={editItem.type || 'Congés payés'} onChange={e => setEditItem(p => ({ ...p, type: e.target.value }))}>
                    <option>Congés payés</option><option>RTT</option><option>Maladie</option><option>Maternité</option><option>Sans solde</option>
                  </select>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{isFr ? 'Du' : 'From'}</label>
                      <input className="input" type="date" value={editItem.from || ''} onChange={e => setEditItem(p => ({ ...p, from: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{isFr ? 'Au' : 'To'}</label>
                      <input className="input" type="date" value={editItem.to || ''} onChange={e => setEditItem(p => ({ ...p, to: e.target.value }))} />
                    </div>
                  </div>
                  <input className="input" placeholder={isFr ? 'Motif' : 'Reason'} value={editItem.reason || ''} onChange={e => setEditItem(p => ({ ...p, reason: e.target.value }))} />
                </>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn-primary" onClick={() => {
                  if (activeTab === 'employees') {
                    if (editItem.id) setEmployees(prev => prev.map(e => e.id === editItem.id ? editItem : e))
                    else setEmployees(prev => [...prev, { ...editItem, id: Date.now() }])
                  } else {
                    if (editItem.id) setLeaves(prev => prev.map(l => l.id === editItem.id ? editItem : l))
                    else setLeaves(prev => [...prev, { ...editItem, id: Date.now(), days: 1 }])
                  }
                  setShowModal(false); setEditItem(null)
                }}>✅ {isFr ? 'Enregistrer' : 'Save'}</button>
                <button className="btn-secondary" onClick={() => { setShowModal(false); setEditItem(null) }}>🚫</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
