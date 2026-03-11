import { useState, useRef } from 'react'
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
]

const STATUS_CONFIG = {
  paid:    { labelFr: 'Payée',    labelEn: 'Paid',    color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  pending: { labelFr: 'En attente', labelEn: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  overdue: { labelFr: 'En retard', labelEn: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

export default function AccountingView({ lang, addLog }) {
  const [invoices, setInvoices] = useLS('invoices', SAMPLE_INVOICES)
  const [expenses, setExpenses] = useLS('expenses', SAMPLE_EXPENSES)
  const [activeTab, setActiveTab] = useState('invoices')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [aiReport, setAiReport] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
  const [showOcr, setShowOcr] = useState(false)
  const fileRef = useRef()
  const isFr = lang === 'fr'

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  async function generateReport() {
    setAiLoading(true)
    try {
      const prompt = isFr
        ? `Analyse financière: ${invoices.length} factures, CA encaissé: ${totalRevenue}€, en attente: ${totalPending}€, retard: ${totalOverdue}€, dépenses: ${totalExpenses}€. Génère un rapport concis avec recommandations.`
        : `Financial analysis: ${invoices.length} invoices, collected: €${totalRevenue}, pending: €${totalPending}, overdue: €${totalOverdue}, expenses: €${totalExpenses}. Generate a concise report with recommendations.`
      const result = await callClaude(prompt)
      setAiReport(result)
    } catch { setAiReport(isFr ? 'Erreur génération rapport' : 'Report generation error') }
    setAiLoading(false)
  }

  async function handleOCR(file) {
    if (!file) return
    setOcrLoading(true)
    setShowOcr(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1]
        const prompt = isFr
          ? `Tu es un expert OCR. Analyse cette image de facture et extrais les informations suivantes en JSON: { "number": "numéro facture", "client": "nom client", "amount": montant_numerique, "date": "date YYYY-MM-DD", "due": "date échéance YYYY-MM-DD", "category": "catégorie", "items": [{"desc": "description", "qty": quantité, "price": prix}] }. Réponds UNIQUEMENT avec le JSON, rien d'autre.`
          : `You are an OCR expert. Analyze this invoice image and extract: { "number": "invoice number", "client": "client name", "amount": numeric_amount, "date": "date YYYY-MM-DD", "due": "due date YYYY-MM-DD", "category": "category", "items": [{"desc": "description", "qty": quantity, "price": price}] }. Respond ONLY with JSON.`

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
                { type: 'text', text: prompt }
              ]
            }]
          })
        })
        const data = await response.json()
        const text = data.content?.[0]?.text || '{}'
        try {
          const clean = text.replace(/```json|```/g, '').trim()
          const parsed = JSON.parse(clean)
          setOcrResult(parsed)
          addLog?.('📄 ' + (isFr ? 'Facture scannée via OCR' : 'Invoice scanned via OCR'), 'success', 'accounting')
        } catch {
          setOcrResult({ raw: text })
        }
        setOcrLoading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setOcrResult({ error: isFr ? 'Erreur OCR' : 'OCR Error' })
      setOcrLoading(false)
    }
  }

  function importOcrInvoice() {
    if (!ocrResult || ocrResult.error) return
    const newInvoice = {
      id: Date.now(),
      number: ocrResult.number || 'FAC-' + Date.now(),
      client: ocrResult.client || 'Client inconnu',
      amount: ocrResult.amount || 0,
      status: 'pending',
      date: ocrResult.date || new Date().toISOString().split('T')[0],
      due: ocrResult.due || '',
      category: ocrResult.category || 'Autre',
    }
    setInvoices(prev => [newInvoice, ...prev])
    setShowOcr(false)
    setOcrResult(null)
    addLog?.('✅ ' + (isFr ? 'Facture importée depuis OCR' : 'Invoice imported from OCR'), 'success', 'accounting')
  }

  function deleteItem(id) {
    if (activeTab === 'invoices') setInvoices(prev => prev.filter(i => i.id !== id))
    else setExpenses(prev => prev.filter(e => e.id !== id))
  }

  function saveItem(item) {
    if (activeTab === 'invoices') {
      if (editItem?.id) setInvoices(prev => prev.map(i => i.id === editItem.id ? { ...i, ...item } : i))
      else setInvoices(prev => [{ ...item, id: Date.now() }, ...prev])
    } else {
      if (editItem?.id) setExpenses(prev => prev.map(e => e.id === editItem.id ? { ...e, ...item } : e))
      else setExpenses(prev => [{ ...item, id: Date.now() }, ...prev])
    }
    setShowModal(false)
    setEditItem(null)
  }

  const tabs = [
    ['invoices', '🧾 ' + (isFr ? 'Factures' : 'Invoices')],
    ['expenses', '💸 ' + (isFr ? 'Dépenses' : 'Expenses')],
    ['report', '📊 ' + (isFr ? 'Rapport IA' : 'AI Report')],
  ]

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* OCR MODAL */}
      {showOcr && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: '#12141f', border: '1px solid rgba(100,112,241,0.3)', borderRadius: 20, padding: 28, maxWidth: 520, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>📄</span>
              <h3 style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, color: 'white', fontSize: 18 }}>
                {isFr ? 'Scan OCR — Extraction automatique' : 'OCR Scan — Auto extraction'}
              </h3>
            </div>
            {ocrLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <p style={{ color: 'rgba(255,255,255,0.6)' }}>{isFr ? 'Analyse de la facture en cours...' : 'Analyzing invoice...'}</p>
              </div>
            ) : ocrResult ? (
              <div>
                {ocrResult.error ? (
                  <p style={{ color: '#ef4444' }}>{ocrResult.error}</p>
                ) : ocrResult.raw ? (
                  <pre style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, whiteSpace: 'pre-wrap' }}>{ocrResult.raw}</pre>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: isFr ? 'Numéro' : 'Number', value: ocrResult.number },
                      { label: isFr ? 'Client' : 'Client', value: ocrResult.client },
                      { label: isFr ? 'Montant' : 'Amount', value: ocrResult.amount ? ocrResult.amount + '€' : '' },
                      { label: isFr ? 'Date' : 'Date', value: ocrResult.date },
                      { label: isFr ? 'Échéance' : 'Due date', value: ocrResult.due },
                      { label: isFr ? 'Catégorie' : 'Category', value: ocrResult.category },
                    ].map(f => f.value ? (
                      <div key={f.label} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', minWidth: 80 }}>{f.label}</span>
                        <span style={{ fontSize: 14, color: 'white', fontWeight: 500 }}>{f.value}</span>
                      </div>
                    ) : null)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  {!ocrResult.error && !ocrResult.raw && (
                    <button className="btn-primary" onClick={importOcrInvoice}>
                      ✅ {isFr ? 'Importer cette facture' : 'Import invoice'}
                    </button>
                  )}
                  <button className="btn-secondary" onClick={() => { setShowOcr(false); setOcrResult(null) }}>
                    {isFr ? 'Fermer' : 'Close'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: isFr ? 'CA encaissé' : 'Revenue', value: totalRevenue.toLocaleString('fr-FR') + '€', color: '#10b981' },
          { label: isFr ? 'En attente' : 'Pending', value: totalPending.toLocaleString('fr-FR') + '€', color: '#f59e0b' },
          { label: isFr ? 'En retard' : 'Overdue', value: totalOverdue.toLocaleString('fr-FR') + '€', color: '#ef4444' },
          { label: isFr ? 'Dépenses' : 'Expenses', value: totalExpenses.toLocaleString('fr-FR') + '€', color: '#6470f1' },
        ].map(s => (
          <div key={s.label} style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontFamily: 'Outfit', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        {tabs.map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: activeTab === t ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.04)',
            color: activeTab === t ? '#a5b8fc' : 'rgba(255,255,255,0.5)',
          }}>{l}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8' }}>
          {(activeTab === 'invoices' || activeTab === 'expenses') && (
            <>
              {/* OCR BUTTON */}
              {activeTab === 'invoices' && (
                <>
                  <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleOCR(e.target.files[0])} />
                  <button className="btn-secondary" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }}>
                    📄 {isFr ? 'Scanner facture (OCR)' : 'Scan invoice (OCR)'}
                  </button>
                </>
              )}
              <button className="btn-primary" onClick={() => { setEditItem({}); setShowModal(true) }} style={{ fontSize: 12 }}>
                + {isFr ? 'Ajouter' : 'Add'}
              </button>
            </>
          )}
          {activeTab === 'report' && (
            <button className="btn-primary" onClick={generateReport} disabled={aiLoading} style={{ fontSize: 12 }}>
              🤖 {aiLoading ? '...' : (isFr ? 'Générer rapport' : 'Generate report')}
            </button>
          )}
        </div>
      </div>

      {/* INVOICES */}
      {activeTab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {invoices.map(inv => {
            const sc = STATUS_CONFIG[inv.status]
            return (
              <div key={inv.id} style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>{inv.client}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{inv.number} · {inv.category} · {inv.date}</div>
                </div>
                <div style={{ fontSize: 18, fontFamily: 'Outfit', fontWeight: 700, color: 'white' }}>{inv.amount.toLocaleString('fr-FR')}€</div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: sc.bg, color: sc.color, border: '1px solid ' + sc.color + '40' }}>
                  {isFr ? sc.labelFr : sc.labelEn}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { setEditItem(inv); setShowModal(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>✏️</button>
                  <button onClick={() => deleteItem(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                  >🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* EXPENSES */}
      {activeTab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {expenses.map(exp => (
            <div key={exp.id} style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>{exp.desc}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{exp.category} · {exp.date}</div>
              </div>
              <div style={{ fontSize: 18, fontFamily: 'Outfit', fontWeight: 700, color: '#ef4444' }}>-{exp.amount.toLocaleString('fr-FR')}€</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { setEditItem(exp); setShowModal(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>✏️</button>
                <button onClick={() => deleteItem(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                >🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REPORT */}
      {activeTab === 'report' && (
        <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, minHeight: 200 }}>
          {aiReport ? (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{aiReport}</div>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', paddingTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <p>{isFr ? 'Cliquez sur "Générer rapport" pour une analyse IA' : 'Click "Generate report" for AI analysis'}</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL ADD/EDIT */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, maxWidth: 440, width: '100%' }}>
            <h3 style={{ margin: '0 0 20px', fontFamily: 'Outfit', fontWeight: 700, color: 'white', fontSize: 18 }}>
              {editItem?.id ? (isFr ? 'Modifier' : 'Edit') : (isFr ? 'Ajouter' : 'Add')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeTab === 'invoices' ? (
                <>
                  <input className="input" placeholder={isFr ? 'Client' : 'Client'} defaultValue={editItem?.client} id="m-client" />
                  <input className="input" placeholder={isFr ? 'Numéro facture' : 'Invoice number'} defaultValue={editItem?.number} id="m-number" />
                  <input className="input" type="number" placeholder={isFr ? 'Montant €' : 'Amount €'} defaultValue={editItem?.amount} id="m-amount" />
                  <input className="input" type="date" defaultValue={editItem?.date} id="m-date" />
                  <select className="input" id="m-status" defaultValue={editItem?.status || 'pending'}>
                    <option value="pending">{isFr ? 'En attente' : 'Pending'}</option>
                    <option value="paid">{isFr ? 'Payée' : 'Paid'}</option>
                    <option value="overdue">{isFr ? 'En retard' : 'Overdue'}</option>
                  </select>
                  <input className="input" placeholder={isFr ? 'Catégorie' : 'Category'} defaultValue={editItem?.category} id="m-category" />
                </>
              ) : (
                <>
                  <input className="input" placeholder={isFr ? 'Description' : 'Description'} defaultValue={editItem?.desc} id="m-desc" />
                  <input className="input" type="number" placeholder={isFr ? 'Montant €' : 'Amount €'} defaultValue={editItem?.amount} id="m-amount" />
                  <input className="input" type="date" defaultValue={editItem?.date} id="m-date" />
                  <input className="input" placeholder={isFr ? 'Catégorie' : 'Category'} defaultValue={editItem?.category} id="m-category" />
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn-primary" onClick={() => {
                const g = id => document.getElementById(id)?.value
                if (activeTab === 'invoices') saveItem({ client: g('m-client'), number: g('m-number'), amount: parseFloat(g('m-amount')) || 0, date: g('m-date'), status: g('m-status'), category: g('m-category') })
                else saveItem({ desc: g('m-desc'), amount: parseFloat(g('m-amount')) || 0, date: g('m-date'), category: g('m-category'), status: 'pending' })
              }}>
                {isFr ? 'Sauvegarder' : 'Save'}
              </button>
              <button className="btn-secondary" onClick={() => { setShowModal(false); setEditItem(null) }}>
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
