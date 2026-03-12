import { useState, useRef } from 'react'
import { useLS } from '../../hooks/useStore'

const SAMPLE_FILES = [
  { id: 1, name: 'Rapport_Q1_2026.pdf', size: 2400000, type: 'pdf', category: 'Rapports', date: '2026-03-08', uploadedBy: 'Marie' },
  { id: 2, name: 'Budget_2026.xlsx', size: 156000, type: 'xlsx', category: 'Finance', date: '2026-03-05', uploadedBy: 'Thomas' },
  { id: 3, name: 'Contrat_TechCorp.docx', size: 89000, type: 'docx', category: 'Contrats', date: '2026-03-01', uploadedBy: 'Direction' },
  { id: 4, name: 'Logo_Aria.png', size: 45000, type: 'image', category: 'Marketing', date: '2026-02-20', uploadedBy: 'Julie' },
  { id: 5, name: 'Facture_4521.pdf', size: 120000, type: 'pdf', category: 'Finance', date: '2026-03-09', uploadedBy: 'Comptabilité' },
]

const EXT_CONFIG = {
  pdf: { icon: '📄', color: '#ef4444' },
  xlsx: { icon: '📊', color: '#10b981' },
  docx: { icon: '📝', color: '#6470f1' },
  image: { icon: '🖼️', color: '#f59e0b' },
  default: { icon: '📁', color: '#6b7280' },
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function FilesView({ lang, addLog, triggerSave }) {
  const [files, setFiles] = useLS('files', SAMPLE_FILES, triggerSave)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()
  const isFr = lang === 'fr'

  const categories = ['all', ...new Set(files.map(f => f.category))]
  const filtered = files.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'all' || f.category === category
    return matchSearch && matchCat
  })

  function handleFiles(fileList) {
    const newFiles = Array.from(fileList).map(f => ({
      id: Date.now() + Math.random(),
      name: f.name,
      size: f.size,
      type: f.name.split('.').pop().toLowerCase(),
      category: 'Général',
      date: new Date().toISOString().split('T')[0],
      uploadedBy: 'Moi',
      localFile: f,
    }))
    setFiles(prev => [...prev, ...newFiles])
    addLog?.('📁 ' + newFiles.length + (isFr ? ' fichier(s) ajouté(s)' : ' file(s) added'), 'success', 'files')
  }

  function deleteFile(id) {
    setFiles(prev => prev.filter(f => f.id !== id))
    addLog?.('🗑️ ' + (isFr ? 'Fichier supprimé' : 'File deleted'), 'info', 'files')
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: '2px dashed ' + (dragOver ? '#6470f1' : 'rgba(255,255,255,0.1)'),
          borderRadius: 16, padding: 28, textAlign: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
          background: dragOver ? 'rgba(100,112,241,0.05)' : 'transparent',
        }}
      >
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
        <div style={{ color: dragOver ? '#a5b8fc' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 500 }}>
          {isFr ? 'Glissez vos fichiers ici ou cliquez pour importer' : 'Drag files here or click to import'}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 4 }}>
          PDF, XLSX, DOCX, images...
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ maxWidth: 240 }} placeholder={isFr ? '🔍 Rechercher...' : '🔍 Search...'} value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: category === cat ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.04)',
              color: category === cat ? '#a5b8fc' : 'rgba(255,255,255,0.4)',
            }}>{cat === 'all' ? (isFr ? 'Tous' : 'All') : cat}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted2)' }}>
          {filtered.length} {isFr ? 'fichiers' : 'files'}
        </div>
      </div>

      {/* File list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(file => {
          const ext = EXT_CONFIG[file.type] || EXT_CONFIG.default
          return (
            <div key={file.id} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(100,112,241,0.2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: ext.color + '22', border: '1px solid ' + ext.color + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {ext.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {formatSize(file.size)} · {file.category} · {file.date} · {isFr ? 'par ' : 'by '}{file.uploadedBy}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {file.localFile && (
                  <button onClick={() => {
                    const url = URL.createObjectURL(file.localFile)
                    const a = document.createElement('a')
                    a.href = url; a.download = file.name; a.click()
                    URL.revokeObjectURL(url)
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: 14 }} title={isFr ? 'Télécharger' : 'Download'}>⬇️</button>
                )}
                <button onClick={() => deleteFile(file.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: 14 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                >🗑️</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
