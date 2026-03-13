import { useState, useRef, useCallback } from 'react'
import { useLS } from '../../hooks/useStore'
import * as XLSX from 'xlsx'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const SAMPLE_DATA = [
  { Mois: 'Jan', Revenus: 45000, Dépenses: 32000, Bénéfice: 13000 },
  { Mois: 'Fév', Revenus: 52000, Dépenses: 35000, Bénéfice: 17000 },
  { Mois: 'Mar', Revenus: 48000, Dépenses: 31000, Bénéfice: 17000 },
  { Mois: 'Avr', Revenus: 61000, Dépenses: 38000, Bénéfice: 23000 },
  { Mois: 'Mai', Revenus: 55000, Dépenses: 36000, Bénéfice: 19000 },
  { Mois: 'Jun', Revenus: 67000, Dépenses: 41000, Bénéfice: 26000 },
]

const COLORS = ['#6470f1','#10b981','#f59e0b','#ec4899','#06b6d4','#84cc16','#f97316','#8b5cf6']

const QUICK_ACTIONS = {
  fr: [
    { label: '🔢 Supprimer doublons', action: 'removeDuplicates' },
    { label: '🔼 Trier A→Z', action: 'sortAsc' },
    { label: '🔽 Trier Z→A', action: 'sortDesc' },
    { label: '📊 Stats complètes', action: 'stats' },
    { label: '🔍 Détecter anomalies', action: 'anomalies' },
    { label: '📈 Tendances', action: 'trends' },
    { label: '🧹 Nettoyer données', action: 'clean' },
    { label: '📋 Résumé IA', action: 'summary' },
  ],
  en: [
    { label: '🔢 Remove duplicates', action: 'removeDuplicates' },
    { label: '🔼 Sort A→Z', action: 'sortAsc' },
    { label: '🔽 Sort Z→A', action: 'sortDesc' },
    { label: '📊 Full stats', action: 'stats' },
    { label: '🔍 Detect anomalies', action: 'anomalies' },
    { label: '📈 Trends', action: 'trends' },
    { label: '🧹 Clean data', action: 'clean' },
    { label: '📋 AI Summary', action: 'summary' },
  ]
}

export default function ExcelView({ lang, addLog, triggerSave }) {
  const [tables, setTables] = useLS('excel_tables', [{ id: 1, name: 'Rapport financier Q1', data: SAMPLE_DATA, created: new Date().toISOString() }], triggerSave)
  const [activeTable, setActiveTable] = useState(0)
  const [chartType, setChartType] = useState('bar')
  const [chartKeys, setChartKeys] = useState(['Revenus', 'Dépenses', 'Bénéfice'])
  const [aiRequest, setAiRequest] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [activeTab, setActiveTab] = useState('table')
  const [editCell, setEditCell] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [filterCol, setFilterCol] = useState('all')
  const [filterVal, setFilterVal] = useState('')
  const [showFormulas, setShowFormulas] = useState(false)
  const fileRef = useRef()
  const isFr = lang === 'fr'

  const table = tables[activeTable]
  const rawData = table?.data || []
  const headers = rawData.length > 0 ? Object.keys(rawData[0]) : []
  const numericKeys = headers.filter(h => typeof rawData[0]?.[h] === 'number')
  const xKey = headers.find(h => typeof rawData[0]?.[h] === 'string') || headers[0]

  // Filtrage + recherche + tri
  const filteredData = rawData
    .filter(row => {
      if (!searchQuery) return true
      return Object.values(row).some(v => String(v).toLowerCase().includes(searchQuery.toLowerCase()))
    })
    .filter(row => {
      if (filterCol === 'all' || !filterVal) return true
      return String(row[filterCol]).toLowerCase().includes(filterVal.toLowerCase())
    })
    .sort((a, b) => {
      if (!sortCol) return 0
      const va = a[sortCol], vb = b[sortCol]
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })

  // Stats
  const stats = {}
  numericKeys.forEach(k => {
    const vals = rawData.map(r => Number(r[k])).filter(v => !isNaN(v))
    const sum = vals.reduce((a, b) => a + b, 0)
    const avg = sum / vals.length
    const sorted = [...vals].sort((a, b) => a - b)
    stats[k] = {
      sum, avg: avg.toFixed(2),
      min: Math.min(...vals), max: Math.max(...vals),
      median: sorted[Math.floor(sorted.length / 2)],
      count: vals.length,
    }
  })

  function updateCell(rowIndex, key, value) {
    const newData = rawData.map((row, i) => i === rowIndex ? { ...row, [key]: isNaN(Number(value)) || value === '' ? value : Number(value) } : row)
    setTables(prev => prev.map((t, i) => i === activeTable ? { ...t, data: newData } : t))
    setEditCell(null)
  }

  function addRow() {
    const newRow = {}
    headers.forEach(h => newRow[h] = typeof rawData[0]?.[h] === 'number' ? 0 : '')
    setTables(prev => prev.map((t, i) => i === activeTable ? { ...t, data: [...t.data, newRow] } : t))
  }

  function addColumn() {
    const name = prompt(isFr ? 'Nom de la colonne :' : 'Column name:')
    if (!name) return
    setTables(prev => prev.map((t, i) => i === activeTable ? { ...t, data: t.data.map(row => ({ ...row, [name]: '' })) } : t))
  }

  function deleteRow(idx) {
    setTables(prev => prev.map((t, i) => i === activeTable ? { ...t, data: t.data.filter((_, ri) => ri !== idx) } : t))
  }

  function deleteSelected() {
    setTables(prev => prev.map((t, i) => i === activeTable ? { ...t, data: t.data.filter((_, ri) => !selectedRows.has(ri)) } : t))
    setSelectedRows(new Set())
  }

  function removeDuplicates() {
    const seen = new Set()
    const deduped = rawData.filter(row => {
      const key = JSON.stringify(row)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    const removed = rawData.length - deduped.length
    setTables(prev => prev.map((t, i) => i === activeTable ? { ...t, data: deduped } : t))
    setAiResult({ type: 'action', message: isFr ? `✅ ${removed} doublon(s) supprimé(s)` : `✅ ${removed} duplicate(s) removed` })
  }

  function sortData(dir) {
    if (!sortCol && headers.length > 0) setSortCol(headers[0])
    setSortDir(dir)
  }

  function cleanData() {
    const cleaned = rawData.map(row => {
      const newRow = {}
      Object.entries(row).forEach(([k, v]) => {
        newRow[k] = typeof v === 'string' ? v.trim() : v
      })
      return newRow
    })
    setTables(prev => prev.map((t, i) => i === activeTable ? { ...t, data: cleaned } : t))
    setAiResult({ type: 'action', message: isFr ? '✅ Données nettoyées (espaces supprimés)' : '✅ Data cleaned (whitespace removed)' })
  }

  function detectAnomalies() {
    const anomalies = []
    numericKeys.forEach(k => {
      const vals = rawData.map(r => Number(r[k]))
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      const std = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / vals.length)
      vals.forEach((v, i) => {
        if (Math.abs(v - avg) > 2 * std) {
          anomalies.push({ row: i + 1, col: k, value: v, avg: avg.toFixed(0) })
        }
      })
    })
    if (anomalies.length === 0) {
      setAiResult({ type: 'action', message: isFr ? '✅ Aucune anomalie détectée' : '✅ No anomalies detected' })
    } else {
      setAiResult({ type: 'anomalies', data: anomalies })
    }
  }

  function showStats() {
    setAiResult({ type: 'stats', data: stats })
    setActiveTab('ai')
  }

  function showTrends() {
    const trends = numericKeys.map(k => {
      const vals = rawData.map(r => Number(r[k]))
      const first = vals[0], last = vals[vals.length - 1]
      const change = ((last - first) / first * 100).toFixed(1)
      return { col: k, change: Number(change), trend: Number(change) > 0 ? '📈' : '📉' }
    })
    setAiResult({ type: 'trends', data: trends })
    setActiveTab('ai')
  }

  async function handleQuickAction(action) {
    if (action === 'removeDuplicates') removeDuplicates()
    else if (action === 'sortAsc') { setSortDir('asc'); if (!sortCol) setSortCol(headers[0]) }
    else if (action === 'sortDesc') { setSortDir('desc'); if (!sortCol) setSortCol(headers[0]) }
    else if (action === 'stats') showStats()
    else if (action === 'anomalies') { detectAnomalies(); setActiveTab('ai') }
    else if (action === 'trends') showTrends()
    else if (action === 'clean') cleanData()
    else if (action === 'summary') {
      setAiRequest(isFr ? 'Fais un résumé complet de ces données avec les points clés' : 'Make a complete summary of this data with key points')
      setActiveTab('ai')
    }
  }

  async function analyzeWithAI() {
    if (!aiRequest.trim() || rawData.length === 0) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const prompt = isFr
        ? `Tu es un expert Excel et analyste de données. Voici des données tabulaires:\n\nColonnes: ${headers.join(', ')}\nDonnées (${rawData.length} lignes): ${JSON.stringify(rawData.slice(0, 20))}\n\nStatistiques: ${JSON.stringify(stats)}\n\nDemande: ${aiRequest}\n\nRéponds de façon structurée et pratique. Si l'utilisateur demande une formule Excel, fournis la formule exacte avec explications.`
        : `You are an Excel expert and data analyst. Here is tabular data:\n\nColumns: ${headers.join(', ')}\nData (${rawData.length} rows): ${JSON.stringify(rawData.slice(0, 20))}\n\nStatistics: ${JSON.stringify(stats)}\n\nRequest: ${aiRequest}\n\nRespond in a structured and practical way. If the user asks for an Excel formula, provide the exact formula with explanations.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      const text = data.content?.find(c => c.type === 'text')?.text || ''
      setAiResult({ type: 'ai', message: text })
      addLog?.('✅ Analyse IA Excel', 'success', 'excel')
    } catch {
      setAiResult({ type: 'error', message: isFr ? 'Erreur analyse IA' : 'AI analysis error' })
    }
    setAiLoading(false)
  }

  function importFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' })
        const newTables = wb.SheetNames.map(sheetName => ({
          id: Date.now() + Math.random(),
          name: wb.SheetNames.length > 1 ? `${file.name.replace(/\.[^/.]+$/, '')} - ${sheetName}` : file.name.replace(/\.[^/.]+$/, ''),
          data: XLSX.utils.sheet_to_json(wb.Sheets[sheetName]),
          created: new Date().toISOString()
        })).filter(t => t.data.length > 0)
        setTables(prev => [...prev, ...newTables])
        setActiveTable(tables.length)
        addLog?.(`📊 ${file.name} importé (${wb.SheetNames.length} feuille(s))`, 'success', 'excel')
      } catch { addLog?.('❌ Erreur import', 'error', 'excel') }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  function exportXLSX() {
    const wb = XLSX.utils.book_new()
    tables.forEach(t => {
      const ws = XLSX.utils.json_to_sheet(t.data)
      XLSX.utils.book_append_sheet(wb, ws, t.name.substring(0, 31))
    })
    XLSX.writeFile(wb, 'aria-export.xlsx')
    addLog?.('📥 Export XLSX complet', 'success', 'excel')
  }

  function exportCurrentXLSX() {
    const ws = XLSX.utils.json_to_sheet(filteredData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, table?.name?.substring(0, 31) || 'Data')
    XLSX.writeFile(wb, (table?.name || 'aria') + '.xlsx')
  }

  function deleteTable(idx) {
    if (tables.length === 1) return
    setTables(prev => prev.filter((_, i) => i !== idx))
    setActiveTable(Math.max(0, idx - 1))
  }

  function toggleRow(idx) {
    const next = new Set(selectedRows)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    setSelectedRows(next)
  }

  function toggleAllRows() {
    if (selectedRows.size === filteredData.length) setSelectedRows(new Set())
    else setSelectedRows(new Set(filteredData.map((_, i) => i)))
  }

  const totals = {}
  numericKeys.forEach(k => { totals[k] = rawData.reduce((sum, row) => sum + (Number(row[k]) || 0), 0) })

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, height: 'calc(100vh - 60px)', overflow: 'auto' }}>

      {/* TOOLBAR */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={importFile} />
        <button className="btn-secondary" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }}>📂 {isFr ? 'Importer' : 'Import'}</button>
        <button className="btn-secondary" onClick={exportCurrentXLSX} style={{ fontSize: 12 }}>📥 {isFr ? 'Exporter feuille' : 'Export sheet'}</button>
        <button className="btn-secondary" onClick={exportXLSX} style={{ fontSize: 12 }}>📦 {isFr ? 'Tout exporter' : 'Export all'}</button>
        <button className="btn-secondary" onClick={addRow} style={{ fontSize: 12 }}>➕ {isFr ? 'Ligne' : 'Row'}</button>
        <button className="btn-secondary" onClick={addColumn} style={{ fontSize: 12 }}>➕ {isFr ? 'Colonne' : 'Col'}</button>
        {selectedRows.size > 0 && (
          <button onClick={deleteSelected} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer' }}>
            🗑️ {isFr ? `Supprimer (${selectedRows.size})` : `Delete (${selectedRows.size})`}
          </button>
        )}

        {/* Recherche */}
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder={isFr ? '🔍 Rechercher...' : '🔍 Search...'}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, width: 160, outline: 'none' }}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {[
            { id: 'table', label: '📊 ' + (isFr ? 'Tableau' : 'Table') },
            { id: 'chart', label: '📈 ' + (isFr ? 'Graphique' : 'Chart') },
            { id: 'stats', label: '🔢 Stats' },
            { id: 'ai', label: '🤖 IA' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeTab === t.id ? 'rgba(100,112,241,0.2)' : 'var(--surface2)',
              color: activeTab === t.id ? '#a5b8fc' : 'var(--muted)',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* FEUILLES TABS */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {tables.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 2,
            padding: '4px 10px', borderRadius: 8,
            border: '1px solid ' + (activeTable === i ? 'rgba(100,112,241,0.4)' : 'var(--border2)'),
            background: activeTable === i ? 'rgba(100,112,241,0.15)' : 'var(--surface2)',
            cursor: 'pointer',
          }} onClick={() => setActiveTable(i)}>
            <span style={{ fontSize: 12, fontWeight: 500, color: activeTable === i ? '#a5b8fc' : 'var(--muted)' }}>{t.name}</span>
            <span style={{ fontSize: 10, color: 'var(--muted2)', marginLeft: 4 }}>{t.data.length}</span>
            {tables.length > 1 && (
              <button onClick={e => { e.stopPropagation(); deleteTable(i) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: 10, padding: '0 2px', marginLeft: 2 }}>✕</button>
            )}
          </div>
        ))}
        <div style={{ fontSize: 11, color: 'var(--muted2)', marginLeft: 4 }}>
          {filteredData.length !== rawData.length ? `${filteredData.length}/${rawData.length} lignes` : `${rawData.length} lignes · ${headers.length} col`}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {QUICK_ACTIONS[isFr ? 'fr' : 'en'].map(qa => (
          <button key={qa.action} onClick={() => handleQuickAction(qa.action)} style={{
            padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border2)',
            background: 'var(--surface2)', color: 'var(--text2)',
            fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(100,112,241,0.4)'; e.currentTarget.style.color = '#a5b8fc' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
          >{qa.label}</button>
        ))}
      </div>

      {/* TABLEAU */}
      {activeTab === 'table' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', flex: 1 }}>
          {/* Filtre colonne */}
          {headers.length > 0 && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={filterCol} onChange={e => setFilterCol(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none' }}>
                <option value="all">{isFr ? 'Toutes colonnes' : 'All columns'}</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              {filterCol !== 'all' && (
                <input value={filterVal} onChange={e => setFilterVal(e.target.value)}
                  placeholder={isFr ? 'Filtrer...' : 'Filter...'}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none', width: 120 }}
                />
              )}
              <span style={{ fontSize: 11, color: 'var(--muted2)', marginLeft: 'auto' }}>
                {isFr ? 'Cliquer entête pour trier' : 'Click header to sort'}
              </span>
            </div>
          )}
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100% - 40px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 10px', background: 'var(--surface2)', borderBottom: '1px solid var(--border2)', width: 32 }}>
                    <input type="checkbox" checked={selectedRows.size === filteredData.length && filteredData.length > 0} onChange={toggleAllRows} style={{ cursor: 'pointer' }} />
                  </th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--muted)', background: 'var(--surface2)', borderBottom: '1px solid var(--border2)', whiteSpace: 'nowrap' }}>#</th>
                  {headers.map(h => (
                    <th key={h} onClick={() => { setSortCol(h); setSortDir(sortCol === h && sortDir === 'asc' ? 'desc' : 'asc') }}
                      style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: sortCol === h ? '#a5b8fc' : 'var(--muted)', background: 'var(--surface2)', borderBottom: '1px solid var(--border2)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      {h} {sortCol === h ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                  <th style={{ padding: '8px 10px', background: 'var(--surface2)', borderBottom: '1px solid var(--border2)', width: 30 }} />
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, ri) => (
                  <tr key={ri} style={{ background: selectedRows.has(ri) ? 'rgba(100,112,241,0.08)' : ri % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}
                    onMouseEnter={e => { if (!selectedRows.has(ri)) e.currentTarget.style.background = 'rgba(100,112,241,0.05)' }}
                    onMouseLeave={e => { if (!selectedRows.has(ri)) e.currentTarget.style.background = ri % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}
                  >
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>
                      <input type="checkbox" checked={selectedRows.has(ri)} onChange={() => toggleRow(ri)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '6px 10px', fontSize: 10, color: 'var(--muted2)', borderBottom: '1px solid var(--border)' }}>{ri + 1}</td>
                    {headers.map(h => (
                      <td key={h} style={{ padding: '4px 2px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                        {editCell?.row === ri && editCell?.key === h ? (
                          <input autoFocus defaultValue={row[h]}
                            onBlur={e => updateCell(ri, h, e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') updateCell(ri, h, e.target.value); if (e.key === 'Escape') setEditCell(null) }}
                            style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #6470f1', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, width: '100%', outline: 'none' }}
                          />
                        ) : (
                          <div onDoubleClick={() => setEditCell({ row: ri, key: h })} style={{
                            padding: '4px 10px', borderRadius: 4, cursor: 'cell',
                            color: typeof row[h] === 'number' ? '#6470f1' : 'var(--text)',
                            fontWeight: typeof row[h] === 'number' ? 600 : 400,
                            minWidth: 60,
                          }}>
                            {typeof row[h] === 'number' ? row[h].toLocaleString(isFr ? 'fr-FR' : 'en-US') : String(row[h] ?? '')}
                          </div>
                        )}
                      </td>
                    ))}
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
                      <button onClick={() => deleteRow(ri)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: 11 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted2)'}
                      >✕</button>
                    </td>
                  </tr>
                ))}
                {/* TOTAUX */}
                {numericKeys.length > 0 && (
                  <tr style={{ background: 'rgba(100,112,241,0.08)', borderTop: '2px solid rgba(100,112,241,0.2)' }}>
                    <td colSpan={2} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#a5b8fc' }}>TOTAL</td>
                    {headers.map(h => (
                      <td key={h} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, color: numericKeys.includes(h) ? '#a5b8fc' : 'transparent' }}>
                        {numericKeys.includes(h) ? totals[h].toLocaleString(isFr ? 'fr-FR' : 'en-US') : ''}
                      </td>
                    ))}
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
            {filteredData.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                {isFr ? 'Aucun résultat' : 'No results'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GRAPHIQUES */}
      {activeTab === 'chart' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { id: 'bar', label: '📊 ' + (isFr ? 'Barres' : 'Bar') },
              { id: 'line', label: '📈 ' + (isFr ? 'Lignes' : 'Line') },
              { id: 'area', label: '🏔️ ' + (isFr ? 'Aires' : 'Area') },
              { id: 'pie', label: '🥧 ' + (isFr ? 'Camembert' : 'Pie') },
            ].map(ct => (
              <button key={ct.id} onClick={() => setChartType(ct.id)} style={{
                padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: chartType === ct.id ? 'rgba(100,112,241,0.2)' : 'var(--surface2)',
                color: chartType === ct.id ? '#a5b8fc' : 'var(--muted)',
              }}>{ct.label}</button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {numericKeys.map((k, idx) => (
                <button key={k} onClick={() => setChartKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])} style={{
                  padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border2)', fontSize: 11, cursor: 'pointer',
                  background: chartKeys.includes(k) ? COLORS[idx % COLORS.length] + '22' : 'transparent',
                  color: chartKeys.includes(k) ? COLORS[idx % COLORS.length] : 'var(--muted)',
                }}>{k}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={filteredData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey={xKey} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)' }} />
                  <Legend wrapperStyle={{ color: 'var(--muted)' }} />
                  {chartKeys.map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4,4,0,0]} />)}
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={filteredData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey={xKey} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)' }} />
                  <Legend wrapperStyle={{ color: 'var(--muted)' }} />
                  {chartKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />)}
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={filteredData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    {chartKeys.map((k, i) => (
                      <linearGradient key={k} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey={xKey} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)' }} />
                  <Legend wrapperStyle={{ color: 'var(--muted)' }} />
                  {chartKeys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} fill={`url(#grad${i})`} strokeWidth={2} />)}
                </AreaChart>
              ) : (
                <PieChart>
                  <Pie data={filteredData.map(d => ({ name: d[xKey], value: d[chartKeys[0]] || 0 }))}
                    cx="50%" cy="50%" innerRadius="30%" outerRadius="65%" paddingAngle={3} dataKey="value"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      const R = Math.PI / 180
                      const r = innerRadius + (outerRadius - innerRadius) * 0.5
                      const x = cx + r * Math.cos(-midAngle * R)
                      const y = cy + r * Math.sin(-midAngle * R)
                      return percent > 0.05 ? <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{(percent * 100).toFixed(0)}%</text> : null
                    }}>
                    {filteredData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* STATS */}
      {activeTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {numericKeys.map(k => (
              <div key={k} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6470f1', marginBottom: 12 }}>{k}</div>
                {[
                  [isFr ? 'Total' : 'Sum', stats[k]?.sum?.toLocaleString(isFr ? 'fr-FR' : 'en-US')],
                  [isFr ? 'Moyenne' : 'Average', Number(stats[k]?.avg)?.toLocaleString(isFr ? 'fr-FR' : 'en-US')],
                  ['Min', stats[k]?.min?.toLocaleString(isFr ? 'fr-FR' : 'en-US')],
                  ['Max', stats[k]?.max?.toLocaleString(isFr ? 'fr-FR' : 'en-US')],
                  [isFr ? 'Médiane' : 'Median', stats[k]?.median?.toLocaleString(isFr ? 'fr-FR' : 'en-US')],
                  [isFr ? 'Lignes' : 'Count', stats[k]?.count],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{val}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {numericKeys.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              {isFr ? 'Aucune colonne numérique détectée' : 'No numeric columns detected'}
            </div>
          )}
        </div>
      )}

      {/* IA */}
      {activeTab === 'ai' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            🤖 {isFr ? 'Demandez à Aria d\'analyser vos données, générer des formules Excel, détecter des tendances...' : 'Ask Aria to analyze your data, generate Excel formulas, detect trends...'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={aiRequest} onChange={e => setAiRequest(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyzeWithAI()}
              placeholder={isFr ? 'Ex: Donne moi la formule pour calculer la moyenne de la colonne B...' : 'Ex: Give me the formula to calculate average of column B...'}
            />
            <button className="btn-primary" onClick={analyzeWithAI} disabled={aiLoading || !aiRequest.trim()} style={{ whiteSpace: 'nowrap' }}>
              {aiLoading ? '⏳' : (isFr ? 'Envoyer' : 'Send')}
            </button>
          </div>

          {/* Suggestions rapides */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              isFr ? 'Formule pour supprimer doublons' : 'Formula to remove duplicates',
              isFr ? 'RECHERCHEV sur cette donnée' : 'VLOOKUP on this data',
              isFr ? 'Formule de calcul TVA 20%' : 'VAT 20% calculation formula',
              isFr ? 'Résumé des tendances' : 'Trends summary',
              isFr ? 'Détecte les valeurs manquantes' : 'Detect missing values',
            ].map(s => (
              <button key={s} onClick={() => setAiRequest(s)} style={{
                padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border2)',
                background: 'var(--surface2)', color: 'var(--muted)', fontSize: 11, cursor: 'pointer',
              }}>{s}</button>
            ))}
          </div>

          {/* Résultat */}
          {aiResult && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {aiResult.type === 'ai' && (
                <div style={{ background: 'rgba(100,112,241,0.06)', border: '1px solid rgba(100,112,241,0.2)', borderRadius: 12, padding: 16, fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {aiResult.message}
                </div>
              )}
              {aiResult.type === 'action' && (
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 14, fontSize: 13, color: '#10b981' }}>
                  {aiResult.message}
                </div>
              )}
              {aiResult.type === 'stats' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(aiResult.data).map(([k, s]) => (
                    <div key={k} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6470f1', marginBottom: 6 }}>{k}</div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text)' }}>
                        <span>Total: <b>{s.sum?.toLocaleString()}</b></span>
                        <span>Moy: <b>{s.avg}</b></span>
                        <span>Min: <b>{s.min}</b></span>
                        <span>Max: <b>{s.max}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {aiResult.type === 'anomalies' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 4 }}>⚠️ {aiResult.data.length} {isFr ? 'anomalie(s) détectée(s)' : 'anomaly(ies) detected'}</div>
                  {aiResult.data.map((a, i) => (
                    <div key={i} style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text)' }}>
                      {isFr ? `Ligne ${a.row}, colonne "${a.col}": valeur ${a.value} (moy: ${a.avg})` : `Row ${a.row}, column "${a.col}": value ${a.value} (avg: ${a.avg})`}
                    </div>
                  ))}
                </div>
              )}
              {aiResult.type === 'trends' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {aiResult.data.map((t, i) => (
                    <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.col}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.change > 0 ? '#10b981' : '#ef4444' }}>
                        {t.trend} {t.change > 0 ? '+' : ''}{t.change}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {aiResult.type === 'error' && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 14, fontSize: 13, color: '#ef4444' }}>
                  {aiResult.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
