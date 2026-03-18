import { useState } from 'react'
import { useSupabaseTable } from '../../hooks/useSupabaseTable'
import { callClaude } from '../../lib/claude'

const SAMPLE_CONTACTS = [
  { id: 1, name: 'Marie Dupont', company: 'Dupont & Associés', email: 'marie.dupont@example.com', phone: '01 23 45 67 89', type: 'client', status: 'active', notes: 'Client premium, contrat depuis 2023', lastContact: '2026-03-10' },
  { id: 2, name: 'Jean-Pierre Martin', company: 'TechCorp SAS', email: 'jp.martin@techcorp.fr', phone: '06 11 22 33 44', type: 'prospect', status: 'warm', notes: 'Intéressé par nos services de conseil', lastContact: '2026-03-05' },
  { id: 3, name: 'Sophie Leblanc', company: 'Startup XYZ', email: 'sophie@xyz.io', phone: '07 55 66 77 88', type: 'client', status: 'active', notes: 'Nouvelle cliente, contrat formation', lastContact: '2026-03-08' },
  { id: 4, name: 'Michel Tremblay', company: 'Conseil & Co', email: 'michel@conseil.fr', phone: '06 99 88 77 66', type: 'prospect', status: 'cold', notes: 'Contact salon 2025', lastContact: '2026-01-15' },
  { id: 5, name: 'Isabelle Chen', company: 'Martin Industries', email: 'ichen@martin-ind.fr', phone: '01 44 55 66 77', type: 'partner', status: 'active', notes: 'Partenaire stratégique', lastContact: '2026-03-01' },
]

export default function CRMView({ lang, addLog, triggerSave }) {
  const { data: contacts, add: addContact, update: updateContact, remove: removeContact } = useSupabaseTable('contacts', user?.id, SAMPLE_CONTACTS)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [aiNote, setAiNote] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const isFr = lang === 'fr'

  const filtered = contacts.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.type === filter
    return matchSearch && matchFilter
  })

  const typeColor = t => t === 'client' ? '#10b981' : t === 'prospect' ? '#f59e0b' : '#6470f1'
  const typeLabel = t => isFr ? (t === 'client' ? 'Client' : t === 'prospect' ? 'Prospect' : 'Partenaire') : (t === 'client' ? 'Client' : t === 'prospect' ? 'Prospect' : 'Partner')
  const statusColor = s => s === 'active' ? '#10b981' : s === 'warm' ? '#f59e0b' : '#6b7280'
  const statusLabel = s => isFr ? (s === 'active' ? 'Actif' : s === 'warm' ? 'Tiède' : 'Froid') : (s === 'active' ? 'Active' : s === 'warm' ? 'Warm' : 'Cold')

  async function aiAnalyzeContact(contact) {
    setAiLoading(true)
    try {
      const result = await callClaude(
        (isFr ? 'Analyse ce contact CRM et suggère des actions commerciales:\n' : 'Analyze this CRM contact and suggest commercial actions:\n') + JSON.stringify(contact),
        '', { maxTokens: 400 }
      )
      setAiNote(result)
    } catch {}
    setAiLoading(false)
  }

  async function saveContact() {
    if (!editContact?.name) return
    try {
      if (editContact.id) {
        const { id, user_id, created_at, ...updates } = editContact
        await updateContact(editContact.id, updates)
      } else {
        await addContact({ ...editContact, lastContact: new Date().toISOString().split('T')[0] })
      }
    } catch(err) { console.error('saveContact:', err) }
    addLog?.('🤝 ' + (isFr ? 'Contact sauvegardé: ' : 'Contact saved: ') + editContact.name, 'success', 'crm')
    setShowModal(false); setEditContact(null)
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {[
          { label: isFr ? '🤝 Total contacts' : '🤝 Total contacts', value: contacts.length, color: '#6470f1' },
          { label: isFr ? '✅ Clients actifs' : '✅ Active clients', value: contacts.filter(c => c.type === 'client').length, color: '#10b981' },
          { label: isFr ? '🎯 Prospects' : '🎯 Prospects', value: contacts.filter(c => c.type === 'prospect').length, color: '#f59e0b' },
          { label: isFr ? '🤝 Partenaires' : '🤝 Partners', value: contacts.filter(c => c.type === 'partner').length, color: '#ec4899' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: 28, fontFamily: 'Outfit', fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ maxWidth: 260 }} placeholder={isFr ? '🔍 Rechercher...' : '🔍 Search...'} value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: 4 }}>
          {[['all', isFr ? 'Tous' : 'All'], ['client', isFr ? 'Clients' : 'Clients'], ['prospect', isFr ? 'Prospects' : 'Prospects'], ['partner', isFr ? 'Partenaires' : 'Partners']].map(([f, l]) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: filter === f ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.04)',
              color: filter === f ? '#a5b8fc' : 'rgba(255,255,255,0.4)',
            }}>{l}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => { setEditContact({ name: '', company: '', email: '', phone: '', type: 'prospect', status: 'warm', notes: '', lastContact: new Date().toISOString().split('T')[0] }); setShowModal(true) }} style={{ marginLeft: 'auto' }}>
          ➕ {isFr ? 'Contact' : 'Contact'}
        </button>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(contact => (
          <div key={contact.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(100,112,241,0.2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
          >
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: typeColor(contact.type) + '33', border: '2px solid ' + typeColor(contact.type) + '66', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: typeColor(contact.type), flexShrink: 0 }}>
              {contact.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{contact.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{contact.company} · {contact.email}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: typeColor(contact.type) + '22', color: typeColor(contact.type), border: '1px solid ' + typeColor(contact.type) + '44' }}>
                {typeLabel(contact.type)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: statusColor(contact.status) + '22', color: statusColor(contact.status), border: '1px solid ' + statusColor(contact.status) + '44' }}>
                {statusLabel(contact.status)}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted2)' }}>📅 {contact.lastContact}</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => aiAnalyzeContact(contact)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: 14 }} title="AI analyze">🤖</button>
              <button onClick={() => { setEditContact({ ...contact }); setShowModal(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: 14 }}>✏️</button>
              <button onClick={() => { removeContact(contact.id); addLog?.('🗑️ Contact supprimé', 'info', 'crm') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* AI note */}
      {(aiNote || aiLoading) && (
        <div style={{ background: 'rgba(100,112,241,0.05)', border: '1px solid rgba(100,112,241,0.15)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b8fc', marginBottom: 8 }}>🤖 {isFr ? 'Analyse IA' : 'AI Analysis'}</div>
          {aiLoading ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>{isFr ? 'Analyse en cours...' : 'Analyzing...'}</div> : <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiNote}</div>}
        </div>
      )}

      {/* Modal */}
      {showModal && editContact && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460 }}>
            <h3 style={{ margin: '0 0 20px', fontFamily: 'Outfit', fontWeight: 600, color: 'var(--text)' }}>
              {editContact.id ? '✏️ ' + (isFr ? 'Modifier contact' : 'Edit contact') : '➕ ' + (isFr ? 'Nouveau contact' : 'New contact')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="input" placeholder={isFr ? 'Nom complet *' : 'Full name *'} value={editContact.name} onChange={e => setEditContact(p => ({ ...p, name: e.target.value }))} />
              <input className="input" placeholder={isFr ? 'Entreprise' : 'Company'} value={editContact.company} onChange={e => setEditContact(p => ({ ...p, company: e.target.value }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input className="input" placeholder="Email" type="email" value={editContact.email} onChange={e => setEditContact(p => ({ ...p, email: e.target.value }))} />
                <input className="input" placeholder={isFr ? 'Téléphone' : 'Phone'} value={editContact.phone} onChange={e => setEditContact(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select className="input" value={editContact.type} onChange={e => setEditContact(p => ({ ...p, type: e.target.value }))}>
                  <option value="client">{isFr ? 'Client' : 'Client'}</option>
                  <option value="prospect">{isFr ? 'Prospect' : 'Prospect'}</option>
                  <option value="partner">{isFr ? 'Partenaire' : 'Partner'}</option>
                </select>
                <select className="input" value={editContact.status} onChange={e => setEditContact(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">{isFr ? 'Actif' : 'Active'}</option>
                  <option value="warm">{isFr ? 'Tiède' : 'Warm'}</option>
                  <option value="cold">{isFr ? 'Froid' : 'Cold'}</option>
                </select>
              </div>
              <textarea className="input" rows={3} placeholder={isFr ? 'Notes...' : 'Notes...'} value={editContact.notes} onChange={e => setEditContact(p => ({ ...p, notes: e.target.value }))} style={{ resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={saveContact}>✅ {isFr ? 'Enregistrer' : 'Save'}</button>
                <button className="btn-secondary" onClick={() => { setShowModal(false); setEditContact(null) }}>🚫</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
