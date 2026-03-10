import { useState } from 'react'
import { useLS } from '../../hooks/useStore'
import { callClaude } from '../../lib/claude'

const SAMPLE_INVOICES = [
  { id: 1, number: 'FAC-2026-001', client: 'Dupont & Associés', amount: 4500, status: 'paid', date: '2026-03-01', due: '2026-03-31', category: 'Service' },
  { id: 2, number: 'FAC-2026-002', client: 'TechCorp SAS', amount: 12800, status: 'pending', date: '2026-03-05', due: '2026-04-04', category: 'Conseil' },
  { id: 3, number: 'FAC-2026-003', client: 'Martin Industries', amount: 7200, status: 'overdue', date: '2026-02-01', due: '2026-03-03', category: 'Maintenance' },
  { id: 4, number: 'FAC-2026-004', client: 'Startup XYZ', amount: 3600, status: 'pending', date: '2026-03-08', due: '2026-04-07', category: 'Formation' },
]

const SAMPLE_EXPENSES = [
  { id: 1, desc: 'Fournitures bureau', amount: 847, date: '2026-03-05', category: 'Bureau', status: 'paid' },
  { id: 2, desc: 'Abonnement logiciels', amount: 320, date: '2026-03-01', category: 'IT', status: 'paid' },
  { id: 3, desc: 'Déjeuner client', amount: 156, date: '2026-03-08', category: 'Représentation', status: 'pending' },
  { id: 4, desc: 'Transport déplacement', amount: 89, date: '2026-03-07', category: 'Transport', status: 'paid' },
]

export default function AccountingView({ lang, addLog }) {
  const [invoices, setInvoices] = useLS('invoices', SAMPLE_INVOICES)
  const [expenses, setExpenses] = useLS('expenses', SAMPLE_EXPENSES)
  const [activeTab, setActiveTab] = useState('invoices')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [aiReport, setAiReport] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const isFr = lang === 'fr'

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  const totalExpenses = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0)

  const statusColor = s => s === 'paid' ? '#10b981' : s === 'pending' ? '#f59e0b' : '#ef4444'
  const statusLabel = s => isFr ? (s === 'paid' ? 'Payé' : s === 'pending' ? 'En attente' : 'En retard') : (s === 'paid' ? 'Paid' : s === 'pending' ? 'Pending' : 'Overdue')

  async function generateReport() {
    setAiLoading(true)
    try {
      const result = await callClaude(
        (isFr ? 'Génère un rapport financier synthétique avec ces données. Inclus: bilan, analyse, recommandations:\n' : 'Generate a financial summary report with this data. Include: summary, analysis, recommendations:\n') + JSON.stringify({ invoices, expenses, totalRevenue, totalPending, totalOverdue, totalExpenses }),
        '', { maxTokens: 800 }
      )
      setAiReport(result)
      addLog?.('📊 ' + (isFr ? 'Rapport financier généré' : 'Financial report generated'), 'success', 'accounting')
    } catch {}
    setAiLoading(false)
  }

  function saveItem() {
    if (!editItem) return
    if (activeTab === 'invoices') {
      if (editItem.id) setInvoices(prev => prev.map(i => i.id === editItem.id ? editItem : i))
      else setInvoices(prev => [...prev, { ...editItem, id: Date.now(), number: 'FAC-2026-00' + (invoices.length + 1) }])
    } else {
      if (editItem.id) setExpenses(prev => prev.map(e => e.id === editItem.id ? editItem : e))
      else setExpenses(prev => [...prev, { ...editItem, id: Date.now() }])
    }
    setShowModal(false); setEditItem(null)
  }

  const items = activeTab === 'invoices' ? invoices : expenses

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: isFr ? '💰 Revenus encaissés' : '💰 Collected revenue', value: totalRevenue, color: '#10b981' },
          { label: isFr ? '⏳ En attente' : '⏳ Pending', value: totalPending, color: '#f59e0b' },
          { label: isFr ? '🔴 En retard' : '🔴 Overdue', value: totalOverdue, color: '#ef4444' },
          { label: isFr ? '📉 Dépenses' : '📉 Expenses', value: totalExpenses, color: '#6470f1' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontFamily: 'Outfit', fontWeight: 700, color: stat.color }}>
              {stat.value.toLocaleString(isFr ? 'fr-FR' : 'en-US')} €
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['invoices', '🧾 ' + (isFr ? 'Factures' : 'Invoices')], ['expenses', '📉 ' + (isFr ? 'Dépenses' : 'Expenses')], ['report', '📊 ' + (isFr ? 'Rapport IA' : 'AI Report')]].map(([t, l]) => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeTab === t ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTab === t ? '#a5b8fc' : 'rgba(255,255,255,0.5)',
            }}>{l}</button>
          ))}
        </div>
        {activeTab !== 'report' && (
          <button className="btn-primary" onClick={() => { setEditItem({ amount: 0, status: 'pending', date: new Date().toISOString().split('T')[0], ...(activeTab === 'invoices' ? { client: '', category: 'Service', due: '' } : { desc: '', category: 'Bureau' }) }); setShowModal(true) }}>
            ➕ {isFr ? 'Ajouter' : 'Add'}
          </button>
        )}
        {activeTab === 'report' && (
          <button className="btn-primary" onClick={generateReport} disabled={aiLoading}>
            🤖 {aiLoading ? '...' : (isFr ? 'Générer rapport' : 'Generate report')}
          </button>
        )}
      </div>

      {/* List */}
      {activeTab !== 'report' && (
        <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0e1019' }}>
                {(activeTab === 'invoices'
                  ? [isFr ? 'N°' : '#', isFr ? 'Client' : 'Client', isFr ? 'Catégorie' : 'Category', isFr ? 'Date' : 'Date', isFr ? 'Échéance' : 'Due', isFr ? 'Montant' : 'Amount', isFr ? 'Statut' : 'Status']
                  : [isFr ? 'Description' : 'Description', isFr ? 'Catégorie' : 'Category', isFr ? 'Date' : 'Date', isFr ? 'Montant' : 'Amount', isFr ? 'Statut' : 'Status']
                ).map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                ))}
                <th style={{ padding: '10px 14px', background: '#0e1019', borderBottom: '1px solid rgba(255,255,255,0.05)' }} />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {activeTab === 'invoices' ? (
                    <>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{item.number}</td>
                      <td style={{ padding: '10px 14px', color: 'white', fontWeight: 500 }}>{item.client}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)' }}>{item.category}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)' }}>{item.date}</td>
                      <td style={{ padding: '10px 14px', color: item.status === 'overdue' ? '#ef4444' : 'rgba(255,255,255,0.5)' }}>{item.due}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '10px 14px', color: 'white', fontWeight: 500 }}>{item.desc}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)' }}>{item.category}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)' }}>{item.date}</td>
                    </>
                  )}
                  <td style={{ padding: '10px 14px', fontFamily: 'Outfit', fontWeight: 700, color: '#a5b8fc' }}>
                    {item.amount.toLocaleString(isFr ? 'fr-FR' : 'en-US')} €
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: statusColor(item.status) + '22', color: statusColor(item.status), border: '1px solid ' + statusColor(item.status) + '44' }}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => { setEditItem({ ...item }); setShowModal(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Report */}
      {activeTab === 'report' && (
        <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, minHeight: 300 }}>
          {aiReport ? (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{aiReport}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'rgba(255,255,255,0.3)', gap: 12 }}>
              <span style={{ fontSize: 40 }}>📊</span>
              <p style={{ margin: 0 }}>{isFr ? 'Cliquez sur "Générer rapport" pour obtenir une analyse IA' : 'Click "Generate report" for AI analysis'}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && editItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }}>
            <h3 style={{ margin: '0 0 20px', fontFamily: 'Outfit', fontWeight: 600, color: 'white' }}>
              {editItem.id ? '✏️ ' + (isFr ? 'Modifier' : 'Edit') : '➕ ' + (isFr ? 'Ajouter' : 'Add')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeTab === 'invoices' ? (
                <>
                  <input className="input" placeholder={isFr ? 'Client *' : 'Client *'} value={editItem.client || ''} onChange={e => setEditItem(p => ({ ...p, client: e.target.value }))} />
                  <input className="input" placeholder={isFr ? 'Catégorie' : 'Category'} value={editItem.category || ''} onChange={e => setEditItem(p => ({ ...p, category: e.target.value }))} />
                  <input className="input" placeholder={isFr ? 'Échéance' : 'Due date'} type="date" value={editItem.due || ''} onChange={e => setEditItem(p => ({ ...p, due: e.target.value }))} />
                </>
              ) : (
                <>
                  <input className="input" placeholder={isFr ? 'Description *' : 'Description *'} value={editItem.desc || ''} onChange={e => setEditItem(p => ({ ...p, desc: e.target.value }))} />
                  <input className="input" placeholder={isFr ? 'Catégorie' : 'Category'} value={editItem.category || ''} onChange={e => setEditItem(p => ({ ...p, category: e.target.value }))} />
                </>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{isFr ? 'Montant (€)' : 'Amount (€)'}</label>
                  <input className="input" type="number" value={editItem.amount || 0} onChange={e => setEditItem(p => ({ ...p, amount: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{isFr ? 'Statut' : 'Status'}</label>
                  <select className="input" value={editItem.status || 'pending'} onChange={e => setEditItem(p => ({ ...p, status: e.target.value }))}>
                    <option value="paid">{isFr ? 'Payé' : 'Paid'}</option>
                    <option value="pending">{isFr ? 'En attente' : 'Pending'}</option>
                    <option value="overdue">{isFr ? 'En retard' : 'Overdue'}</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={saveItem}>✅ {isFr ? 'Enregistrer' : 'Save'}</button>
                <button className="btn-secondary" onClick={() => { setShowModal(false); setEditItem(null) }}>🚫 {isFr ? 'Annuler' : 'Cancel'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
