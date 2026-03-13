import { useState, useRef, useCallback, useEffect } from 'react'
import { useLS } from '../../hooks/useStore'
import * as XLSX from 'xlsx'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const SAMPLE_DATA = [
  { A: 'Mois', B: 'Revenus', C: 'Dépenses', D: 'Bénéfice' },
  { A: 'Jan', B: 45000, C: 32000, D: 13000 },
  { A: 'Fév', B: 52000, C: 35000, D: 17000 },
  { A: 'Mar', B: 48000, C: 31000, D: 17000 },
  { A: 'Avr', B: 61000, C: 38000, D: 23000 },
  { A: 'Mai', B: 55000, C: 36000, D: 19000 },
  { A: 'Jun', B: 67000, C: 41000, D: 26000 },
]

const COLORS = ['#6470f1','#10b981','#f59e0b','#ec4899','#06b6d4','#84cc16','#f97316','#8b5cf6']

function colLetter(n) {
  let s = ''
  while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 }
  return s
}

function cellRef(col, row) { return colLetter(col) + (row + 1) }

export default function ExcelView({ lang, addLog, triggerSave }) {
  const [sheets, setSheets] = useLS('excel_sheets', [{
    id: 1, name: 'Feuil1',
    cells: SAMPLE_DATA,
    colWidths: {},
  }], triggerSave)
  const [activeSheet, setActiveSheet] = useState(0)
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 })
  const [selectedRange, setSelectedRange] = useState(null)
  const [editingCell, setEditingCell] = useState(null)
  const [formulaBar, setFormulaBar] = useState('')
  const [activeTab, setActiveTab] = useState('sheet')
  const [chartType, setChartType] = useState('bar')
  const [aiRequest, setAiRequest] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [history, setHistory] = useState([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [conditionalRules, setConditionalRules] = useState([])
  const [showCondModal, setShowCondModal] = useState(false)
  const [condRule, setCondRule] = useState({ col: '', condition: 'gt', value: '', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' })
  const [searchQuery, setSearchQuery] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const fileRef = useRef()
  const tableRef = useRef()
  const isFr = lang === 'fr'

  const sheet = sheets[activeSheet]
  const rawData = sheet?.cells || []
  const headers = rawData.length > 0 ? Object.keys(rawData[0]) : []
  const numCols = headers.length
  const numRows = rawData.length

  // Données filtrées/triées
  const displayData = [...rawData]
    .filter(row => !searchQuery || Object.values(row).some(v => String(v).toLowerCase().includes(searchQuery.toLowerCase())))
    .sort((a, b) => {
      if (!sortCol) return 0
      const va = a[headers[sortCol]], vb = b[headers[sortCol]]
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })

  const numericCols = headers.filter(h => rawData.some(r => typeof r[h] === 'number'))

  // Mise à jour barre de formule
  useEffect(() => {
    const val = rawData[selectedCell.row]?.[headers[selectedCell.col]]
    setFormulaBar(val !== undefined ? String(val) : '')
  }, [selectedCell, rawData])

  // Ctrl+Z / Ctrl+Y
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo() }
      if (e.key === 'Delete' && !editingCell) clearCell()
      if (e.key === 'Escape') setEditingCell(null)
      // Navigation clavier
      if (!editingCell) {
        if (e.key === 'ArrowRight') { e.preventDefault(); setSelectedCell(c => ({ ...c, col: Math.min(c.col + 1, numCols - 1) })) }
        if (e.key === 'ArrowLeft') { e.preventDefault(); setSelectedCell(c => ({ ...c, col: Math.max(c.col - 1, 0) })) }
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCell(c => ({ ...c, row: Math.min(c.row + 1, numRows - 1) })) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedCell(c => ({ ...c, row: Math.max(c.row - 1, 0) })) }
        if (e.key === 'Tab') { e.preventDefault(); setSelectedCell(c => ({ ...c, col: Math.min(c.col + 1, numCols - 1) })) }
        if (e.key === 'Enter') { e.preventDefault(); setSelectedCell(c => ({ ...c, row: Math.min(c.row + 1, numRows - 1) })) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingCell, numCols, numRows])

  function saveToHistory(data) {
    const newHistory = history.slice(0, historyIdx + 1)
    newHistory.push(JSON.stringify(data))
    setHistory(newHistory)
    setHistoryIdx(newHistory.length - 1)
  }

  function undo() {
    if (historyIdx <= 0) return
    const prev = JSON.parse(history[historyIdx - 1])
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, cells: prev } : sh))
    setHistoryIdx(h => h - 1)
  }

  function redo() {
    if (historyIdx >= history.length - 1) return
    const next = JSON.parse(history[historyIdx + 1])
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, cells: next } : sh))
    setHistoryIdx(h => h + 1)
  }

  function updateCell(row, col, value) {
    saveToHistory(rawData)
    const key = headers[col]
    const parsed = value === '' ? '' : isNaN(Number(value)) ? value : Number(value)
    const newData = rawData.map((r, i) => i === row ? { ...r, [key]: parsed } : r)
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, cells: newData } : sh))
    setEditingCell(null)
  }

  function clearCell() {
    updateCell(selectedCell.row, selectedCell.col, '')
  }

  function addRow() {
    saveToHistory(rawData)
    const newRow = {}
    headers.forEach(h => newRow[h] = '')
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, cells: [...sh.cells, newRow] } : sh))
  }

  function addCol() {
    const letter = colLetter(numCols)
    saveToHistory(rawData)
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, cells: sh.cells.map(r => ({ ...r, [letter]: '' })) } : sh))
  }

  function deleteRow(idx) {
    saveToHistory(rawData)
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, cells: sh.cells.filter((_, ri) => ri !== idx) } : sh))
  }

  function deleteCol(colIdx) {
    saveToHistory(rawData)
    const key = headers[colIdx]
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, cells: sh.cells.map(r => { const nr = { ...r }; delete nr[key]; return nr }) } : sh))
  }

  function removeDuplicates() {
    saveToHistory(rawData)
    const seen = new Set()
    const deduped = rawData.filter(row => { const k = JSON.stringify(row); if (seen.has(k)) return false; seen.add(k); return true })
    const removed = rawData.length - deduped.length
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, cells: deduped } : sh))
    setAiResult({ type: 'action', message: isFr ? `✅ ${removed} doublon(s) supprimé(s)` : `✅ ${removed} duplicate(s) removed` })
  }

  function addSheet() {
    const name = isFr ? `Feuil${sheets.length + 1}` : `Sheet${sheets.length + 1}`
    setSheets(s => [...s, { id: Date.now(), name, cells: [{ A: '' }], colWidths: {} }])
    setActiveSheet(sheets.length)
  }

  function deleteSheet(idx) {
    if (sheets.length === 1) return
    setSheets(s => s.filter((_, i) => i !== idx))
    setActiveSheet(Math.max(0, idx - 1))
  }

  function getCellStyle(row, col) {
    const key = headers[col]
    const val = rawData[row]?.[key]
    const isSelected = selectedCell.row === row && selectedCell.col === col
    let bg = row % 2 === 0 ? 'var(--surface)' : 'var(--surface2)'
    let color = typeof val === 'number' ? '#6470f1' : 'var(--text)'
    let fontWeight = typeof val === 'number' ? 600 : 400

    // Mise en forme conditionnelle
    for (const rule of conditionalRules) {
      if (rule.col === key && val !== undefined && val !== '') {
        const num = Number(val)
        let match = false
        if (rule.condition === 'gt' && num > Number(rule.value)) match = true
        if (rule.condition === 'lt' && num < Number(rule.value)) match = true
        if (rule.condition === 'eq' && String(val) === String(rule.value)) match = true
        if (rule.condition === 'contains' && String(val).toLowerCase().includes(rule.value.toLowerCase())) match = true
        if (match) { bg = rule.bg; color = rule.color }
      }
    }

    return {
      background: isSelected ? 'rgba(100,112,241,0.18)' : bg,
      color, fontWeight,
      outline: isSelected ? '2px solid #6470f1' : 'none',
      outlineOffset: '-1px',
    }
  }

  function importFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' })
        const newSheets = wb.SheetNames.map(name => ({
          id: Date.now() + Math.random(),
          name: name.substring(0, 20),
          cells: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 }).map(row => {
            const obj = {}
            row.forEach((v, i) => { obj[colLetter(i)] = v })
            return obj
          }).filter(r => Object.values(r).some(v => v !== undefined && v !== '')),
          colWidths: {}
        }))
        setSheets(s => [...s, ...newSheets])
        setActiveSheet(sheets.length)
        addLog?.(`📊 ${file.name} importé`, 'success', 'excel')
      } catch { addLog?.('❌ Erreur import', 'error', 'excel') }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  function exportXLSX() {
    const wb = XLSX.utils.book_new()
    sheets.forEach(sh => {
      const ws = XLSX.utils.json_to_sheet(sh.cells)
      XLSX.utils.book_append_sheet(wb, ws, sh.name.substring(0, 31))
    })
    XLSX.writeFile(wb, 'aria-export.xlsx')
    addLog?.('📥 Export XLSX', 'success', 'excel')
  }

  async function analyzeWithAI() {
    if (!aiRequest.trim()) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const stats = {}
      numericCols.forEach(k => {
        const vals = rawData.map(r => Number(r[k])).filter(v => !isNaN(v))
        stats[k] = { sum: vals.reduce((a,b)=>a+b,0), avg: (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2), min: Math.min(...vals), max: Math.max(...vals) }
      })
      const prompt = isFr
        ? `Expert Excel. Données: colonnes ${headers.join(', ')}, ${rawData.length} lignes. Stats: ${JSON.stringify(stats)}. Échantillon: ${JSON.stringify(rawData.slice(0,10))}. Demande: ${aiRequest}. Réponds de façon structurée. Si formule Excel demandée, donne la formule exacte avec explication.`
        : `Excel expert. Data: columns ${headers.join(', ')}, ${rawData.length} rows. Stats: ${JSON.stringify(stats)}. Sample: ${JSON.stringify(rawData.slice(0,10))}. Request: ${aiRequest}. Respond structured. If Excel formula requested, give exact formula with explanation.`
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
      })
      const data = await response.json()
      setAiResult({ type: 'ai', message: data.content?.find(c => c.type === 'text')?.text || '' })
    } catch { setAiResult({ type: 'error', message: 'Erreur IA' }) }
    setAiLoading(false)
  }

  const totals = {}
  numericCols.forEach(k => { totals[k] = rawData.reduce((s, r) => s + (Number(r[k]) || 0), 0) })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', background: 'var(--bg)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── RIBBON TOOLBAR ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '6px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={importFile} />
        
        {/* Groupe Fichier */}
        <div style={{ display: 'flex', gap: 4, paddingRight: 10, borderRight: '1px solid var(--border2)' }}>
          <ToolBtn onClick={() => fileRef.current?.click()} icon="📂" label={isFr ? 'Ouvrir' : 'Open'} />
          <ToolBtn onClick={exportXLSX} icon="💾" label={isFr ? 'Enregistrer' : 'Save'} />
        </div>

        {/* Groupe Édition */}
        <div style={{ display: 'flex', gap: 4, paddingRight: 10, borderRight: '1px solid var(--border2)' }}>
          <ToolBtn onClick={undo} icon="↩️" label="Ctrl+Z" disabled={historyIdx <= 0} />
          <ToolBtn onClick={redo} icon="↪️" label="Ctrl+Y" disabled={historyIdx >= history.length - 1} />
          <ToolBtn onClick={clearCell} icon="🗑️" label={isFr ? 'Effacer' : 'Clear'} />
        </div>

        {/* Groupe Lignes/Colonnes */}
        <div style={{ display: 'flex', gap: 4, paddingRight: 10, borderRight: '1px solid var(--border2)' }}>
          <ToolBtn onClick={addRow} icon="➕" label={isFr ? 'Ligne' : 'Row'} />
          <ToolBtn onClick={addCol} icon="➕" label={isFr ? 'Colonne' : 'Col'} />
          <ToolBtn onClick={() => deleteRow(selectedCell.row)} icon="➖" label={isFr ? 'Supp. ligne' : 'Del row'} />
          <ToolBtn onClick={() => deleteCol(selectedCell.col)} icon="➖" label={isFr ? 'Supp. col' : 'Del col'} />
        </div>

        {/* Groupe Données */}
        <div style={{ display: 'flex', gap: 4, paddingRight: 10, borderRight: '1px solid var(--border2)' }}>
          <ToolBtn onClick={() => { setSortCol(selectedCell.col); setSortDir('asc') }} icon="🔼" label={isFr ? 'Trier A→Z' : 'Sort A-Z'} />
          <ToolBtn onClick={() => { setSortCol(selectedCell.col); setSortDir('desc') }} icon="🔽" label={isFr ? 'Trier Z→A' : 'Sort Z-A'} />
          <ToolBtn onClick={removeDuplicates} icon="🔢" label={isFr ? 'Doublons' : 'Duplicates'} />
          <ToolBtn onClick={() => setShowCondModal(true)} icon="🎨" label={isFr ? 'Mise en forme' : 'Cond. format'} />
        </div>

        {/* Recherche */}
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="🔍 Rechercher..."
          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, width: 140, outline: 'none' }}
        />

        {/* Onglets vues */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
          {[
            { id: 'sheet', label: '📊' },
            { id: 'chart', label: '📈' },
            { id: 'ai', label: '🤖' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14,
              background: activeTab === t.id ? 'rgba(100,112,241,0.2)' : 'transparent',
              color: activeTab === t.id ? '#a5b8fc' : 'var(--muted)',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ── BARRE DE FORMULE ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Référence cellule */}
        <div style={{ minWidth: 60, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border2)', background: 'var(--surface2)', fontSize: 12, fontWeight: 700, color: '#6470f1', textAlign: 'center' }}>
          {cellRef(selectedCell.col, selectedCell.row)}
        </div>
        <span style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>fx</span>
        <input
          value={formulaBar}
          onChange={e => setFormulaBar(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { updateCell(selectedCell.row, selectedCell.col, formulaBar); e.target.blur() } }}
          style={{ flex: 1, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border2)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'monospace' }}
          placeholder={isFr ? 'Valeur ou formule...' : 'Value or formula...'}
        />
        <span style={{ fontSize: 11, color: 'var(--muted2)' }}>
          {displayData.length !== rawData.length ? `${displayData.length}/${rawData.length}` : `${rawData.length} × ${numCols}`}
        </span>
      </div>

      {/* ── VUE FEUILLE ── */}
      {activeTab === 'sheet' && (
        <div ref={tableRef} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed', minWidth: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                {/* Coin */}
                <th style={{ width: 36, minWidth: 36, background: 'var(--surface2)', border: '1px solid var(--border2)', padding: '4px' }} />
                {headers.map((h, ci) => (
                  <th key={h} onClick={() => { setSortCol(ci); setSortDir(sortCol === ci && sortDir === 'asc' ? 'desc' : 'asc') }}
                    style={{ minWidth: sheet.colWidths?.[h] || 100, background: selectedCell.col === ci ? 'rgba(100,112,241,0.15)' : 'var(--surface2)', border: '1px solid var(--border2)', padding: '4px 8px', cursor: 'pointer', userSelect: 'none', fontWeight: 700, fontSize: 11, color: selectedCell.col === ci ? '#a5b8fc' : 'var(--muted)', textAlign: 'center' }}>
                    {colLetter(ci)} {sortCol === ci ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, ri) => (
                <tr key={ri}>
                  {/* Numéro de ligne */}
                  <td style={{ background: selectedCell.row === ri ? 'rgba(100,112,241,0.15)' : 'var(--surface2)', border: '1px solid var(--border2)', padding: '3px 6px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: selectedCell.row === ri ? '#a5b8fc' : 'var(--muted2)', userSelect: 'none', minWidth: 36 }}>
                    {ri + 1}
                  </td>
                  {headers.map((h, ci) => {
                    const isEditing = editingCell?.row === ri && editingCell?.col === ci
                    const cellStyle = getCellStyle(ri, ci)
                    return (
                      <td key={h}
                        onClick={() => { setSelectedCell({ row: ri, col: ci }); setEditingCell(null) }}
                        onDoubleClick={() => setEditingCell({ row: ri, col: ci })}
                        style={{ border: '1px solid var(--border)', padding: 0, position: 'relative', ...cellStyle, minWidth: sheet.colWidths?.[h] || 100 }}>
                        {isEditing ? (
                          <input autoFocus defaultValue={row[h]}
                            onBlur={e => updateCell(ri, ci, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { updateCell(ri, ci, e.target.value); setSelectedCell(c => ({ ...c, row: Math.min(c.row + 1, numRows - 1) })) }
                              if (e.key === 'Tab') { e.preventDefault(); updateCell(ri, ci, e.target.value); setSelectedCell(c => ({ ...c, col: Math.min(c.col + 1, numCols - 1) })) }
                              if (e.key === 'Escape') setEditingCell(null)
                            }}
                            style={{ width: '100%', height: '100%', padding: '3px 8px', border: 'none', outline: 'none', background: 'rgba(100,112,241,0.1)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit' }}
                          />
                        ) : (
                          <div style={{ padding: '3px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: 24 }}>
                            {typeof row[h] === 'number' ? row[h].toLocaleString(isFr ? 'fr-FR' : 'en-US') : String(row[h] ?? '')}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Ligne TOTAL */}
              {numericCols.length > 0 && (
                <tr>
                  <td style={{ background: 'rgba(100,112,241,0.1)', border: '1px solid var(--border2)', padding: '4px 6px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#a5b8fc' }}>Σ</td>
                  {headers.map(h => (
                    <td key={h} style={{ background: 'rgba(100,112,241,0.08)', border: '1px solid var(--border2)', padding: '4px 8px', fontSize: 12, fontWeight: 700, color: numericCols.includes(h) ? '#a5b8fc' : 'transparent', borderTop: '2px solid rgba(100,112,241,0.3)' }}>
                      {numericCols.includes(h) ? totals[h].toLocaleString(isFr ? 'fr-FR' : 'en-US') : ''}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
          {/* Message résultat action */}
          {aiResult?.type === 'action' && (
            <div style={{ position: 'fixed', bottom: 60, right: 24, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#10b981', backdropFilter: 'blur(8px)' }}>
              {aiResult.message}
            </div>
          )}
        </div>
      )}

      {/* ── VUE GRAPHIQUE ── */}
      {activeTab === 'chart' && (
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'bar', label: '📊 ' + (isFr ? 'Barres' : 'Bar') },
              { id: 'line', label: '📈 ' + (isFr ? 'Lignes' : 'Line') },
              { id: 'area', label: '🏔️ ' + (isFr ? 'Aires' : 'Area') },
              { id: 'pie', label: '🥧 ' + (isFr ? 'Camembert' : 'Pie') },
            ].map(ct => (
              <button key={ct.id} onClick={() => setChartType(ct.id)} style={{
                padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: chartType === ct.id ? 'rgba(100,112,241,0.2)' : 'var(--surface)',
                color: chartType === ct.id ? '#a5b8fc' : 'var(--muted)',
              }}>{ct.label}</button>
            ))}
          </div>
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={rawData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey={headers[0]} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ color: 'var(--muted)' }} />
                  {numericCols.map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4,4,0,0]} />)}
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={rawData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey={headers[0]} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ color: 'var(--muted)' }} />
                  {numericCols.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />)}
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={rawData}>
                  <defs>{numericCols.map((k, i) => <linearGradient key={k} id={`g${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[i%COLORS.length]} stopOpacity={0.3}/><stop offset="95%" stopColor={COLORS[i%COLORS.length]} stopOpacity={0}/></linearGradient>)}</defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey={headers[0]} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ color: 'var(--muted)' }} />
                  {numericCols.map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i%COLORS.length]} fill={`url(#g${i})`} strokeWidth={2} />)}
                </AreaChart>
              ) : (
                <PieChart>
                  <Pie data={rawData.map(d => ({ name: d[headers[0]], value: d[numericCols[0]] || 0 }))} cx="50%" cy="50%" innerRadius="30%" outerRadius="65%" paddingAngle={3} dataKey="value"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      const R = Math.PI/180, r = innerRadius + (outerRadius-innerRadius)*0.5
                      const x = cx + r*Math.cos(-midAngle*R), y = cy + r*Math.sin(-midAngle*R)
                      return percent > 0.05 ? <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{(percent*100).toFixed(0)}%</text> : null
                    }} labelLine={false}>
                    {rawData.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── VUE IA ── */}
      {activeTab === 'ai' && (
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>🤖 {isFr ? 'Demandez une analyse, une formule Excel, ou une action sur vos données' : 'Ask for analysis, Excel formula, or data action'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={aiRequest} onChange={e => setAiRequest(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyzeWithAI()}
                placeholder={isFr ? 'Ex: Donne-moi la formule RECHERCHEV pour cette donnée...' : 'Ex: Give me the VLOOKUP formula for this data...'} />
              <button className="btn-primary" onClick={analyzeWithAI} disabled={aiLoading || !aiRequest.trim()} style={{ whiteSpace: 'nowrap' }}>
                {aiLoading ? '⏳' : (isFr ? 'Envoyer' : 'Send')}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                isFr ? 'Formule RECHERCHEV' : 'VLOOKUP formula',
                isFr ? 'Calcul TVA 20%' : 'VAT 20% calc',
                isFr ? 'Supprimer doublons' : 'Remove duplicates',
                isFr ? 'Résumé des données' : 'Data summary',
                isFr ? 'Détecter anomalies' : 'Detect anomalies',
                isFr ? 'Formule SI/SINON' : 'IF/ELSE formula',
              ].map(s => (
                <button key={s} onClick={() => setAiRequest(s)} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
            {aiResult?.type === 'ai' && (
              <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(100,112,241,0.05)', border: '1px solid rgba(100,112,241,0.2)', borderRadius: 10, padding: 14, fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {aiResult.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ONGLETS FEUILLES (bas) ── */}
      <div style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)', padding: '4px 8px', display: 'flex', gap: 4, alignItems: 'center' }}>
        {sheets.map((sh, i) => (
          <div key={sh.id} style={{ display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 12px', borderRadius: '6px 6px 0 0', cursor: 'pointer',
            background: activeSheet === i ? 'var(--surface)' : 'transparent',
            border: activeSheet === i ? '1px solid var(--border2)' : '1px solid transparent',
            borderBottom: activeSheet === i ? '1px solid var(--surface)' : '1px solid transparent',
          }} onClick={() => setActiveSheet(i)}>
            <span style={{ fontSize: 12, color: activeSheet === i ? '#6470f1' : 'var(--muted)', fontWeight: activeSheet === i ? 600 : 400 }}>{sh.name}</span>
            {sheets.length > 1 && <button onClick={e => { e.stopPropagation(); deleteSheet(i) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: 10, padding: 0 }}>✕</button>}
          </div>
        ))}
        <button onClick={addSheet} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border2)', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>+</button>
      </div>

      {/* ── MODAL MISE EN FORME CONDITIONNELLE ── */}
      {showCondModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: 24, width: 400, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 16, fontWeight: 700 }}>🎨 {isFr ? 'Mise en forme conditionnelle' : 'Conditional formatting'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select value={condRule.col} onChange={e => setCondRule(r => ({ ...r, col: e.target.value }))} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }}>
                <option value="">{isFr ? 'Choisir colonne...' : 'Choose column...'}</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <select value={condRule.condition} onChange={e => setCondRule(r => ({ ...r, condition: e.target.value }))} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }}>
                <option value="gt">{isFr ? 'Supérieur à' : 'Greater than'}</option>
                <option value="lt">{isFr ? 'Inférieur à' : 'Less than'}</option>
                <option value="eq">{isFr ? 'Égal à' : 'Equal to'}</option>
                <option value="contains">{isFr ? 'Contient' : 'Contains'}</option>
              </select>
              <input value={condRule.value} onChange={e => setCondRule(r => ({ ...r, value: e.target.value }))} placeholder={isFr ? 'Valeur...' : 'Value...'}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{isFr ? 'Couleur :' : 'Color:'}</span>
                {[
                  { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: '🔴' },
                  { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: '🟡' },
                  { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: '🟢' },
                  { color: '#6470f1', bg: 'rgba(100,112,241,0.15)', label: '🔵' },
                  { color: '#ec4899', bg: 'rgba(236,72,153,0.15)', label: '🩷' },
                ].map(c => (
                  <button key={c.color} onClick={() => setCondRule(r => ({ ...r, color: c.color, bg: c.bg }))} style={{ fontSize: 18, background: condRule.color === c.color ? c.bg : 'none', border: condRule.color === c.color ? `2px solid ${c.color}` : '2px solid transparent', borderRadius: 6, cursor: 'pointer', padding: 4 }}>{c.label}</button>
                ))}
              </div>
            </div>
            {/* Règles existantes */}
            {conditionalRules.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{isFr ? 'Règles actives :' : 'Active rules:'}</span>
                {conditionalRules.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: r.color }} />
                    <span style={{ fontSize: 11, color: 'var(--text)', flex: 1 }}>{r.col} {r.condition} {r.value}</span>
                    <button onClick={() => setConditionalRules(rules => rules.filter((_, ri) => ri !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 12 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={() => { if (condRule.col && condRule.value) { setConditionalRules(r => [...r, { ...condRule }]); setCondRule(r => ({ ...r, value: '' })) } }}>
                {isFr ? 'Ajouter règle' : 'Add rule'}
              </button>
              <button className="btn-secondary" onClick={() => setShowCondModal(false)}>{isFr ? 'Fermer' : 'Close'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToolBtn({ onClick, icon, label, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} style={{
      padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border2)',
      background: 'var(--surface2)', cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 13, opacity: disabled ? 0.4 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
      transition: 'all 0.15s', color: 'var(--text)',
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = 'rgba(100,112,241,0.4)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
    >
      <span>{icon}</span>
      <span style={{ fontSize: 8, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}
