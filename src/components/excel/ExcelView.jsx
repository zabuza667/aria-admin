import { useState, useRef } from 'react'
import { useLS } from '../../hooks/useStore'
import { analyzeExcelRequest } from '../../lib/claude'
import * as XLSX from 'xlsx'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const SAMPLE_DATA = [
  { Mois: 'Jan', Revenus: 45000, Dépenses: 32000, Bénéfice: 13000 },
  { Mois: 'Fév', Revenus: 52000, Dépenses: 35000, Bénéfice: 17000 },
  { Mois: 'Mar', Revenus: 48000, Dépenses: 31000, Bénéfice: 17000 },
  { Mois: 'Avr', Revenus: 61000, Dépenses: 38000, Bénéfice: 23000 },
  { Mois: 'Mai', Revenus: 55000, Dépenses: 36000, Bénéfice: 19000 },
  { Mois: 'Jun', Revenus: 67000, Dépenses: 41000, Bénéfice: 26000 },
]

const COLORS = ['#6470f1','#10b981','#f59e0b','#ec4899','#06b6d4','#84cc16']

export default function ExcelView({ lang, addLog }) {
  const [tables, setTables] = useLS('excel_tables', [{ id: 1, name: 'Rapport financier Q1', data: SAMPLE_DATA, created: new Date().toISOString() }])
  const [activeTable, setActiveTable] = useState(0)
  const [chartType, setChartType] = useState('bar')
  const [chartKeys, setChartKeys] = useState(['Revenus', 'Dépenses', 'Bénéfice'])
  const [aiRequest, setAiRequest] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [activeTab, setActiveTab] = useState('table')
  const [editCell, setEditCell] = useState(null)
  const fileRef = useRef()
  const isFr = lang === 'fr'

  const table = tables[activeTable]
  const data = table?.data || []
  const headers = data.length > 0 ? Object.keys(data[0]) : []
  const numericKeys = headers.filter(h => typeof data[0]?.[h] === 'number')

  function updateCell(rowIndex, key, value) {
    const newData = data.map((row, i) => i === rowIndex ? { ...row, [key]: isNaN(Number(value)) ? value : Number(value) } : row)
    setTables(prev => prev.map((t, i) => i === activeTable ? { ...t, data: newData } : t))
  }

  function addRow() {
    const newRow = {}
    headers.forEach(h => newRow[h] = typeof data[0]?.[h] === 'number' ? 0 : '')
    setTables(prev => prev.map((t, i) => i === activeTable ? { ...t, data: [...t.data, newRow] } : t))
  }

  function deleteRow(idx) {
    setTables(prev => prev.map((t, i) => i === activeTable ? { ...t, data: t.data.filter((_, ri) => ri !== idx) } : t))
  }

  function importFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(ws)
      const newTable = { id: Date.now(), name: file.name.replace(/\.[^/.]+$/, ''), data: json, created: new Date().toISOString() }
      setTables(prev => [...prev, newTable])
      setActiveTable(tables.length)
      addLog?.('📊 ' + (isFr ? 'Fichier importé: ' : 'File imported: ') + file.name, 'success', 'excel')
    }
    reader.readAsBinaryString(file)
  }

  function exportXLSX() {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.writeFile(wb, (table?.name || 'aria-export') + '.xlsx')
    addLog?.('📥 ' + (isFr ? 'Export XLSX: ' : 'XLSX export: ') + table?.name, 'success', 'excel')
  }

  async function analyzeWithAI() {
    if (!aiRequest.trim()) return
    setAiLoading(true)
    try {
      addLog?.('🤖 ' + (isFr ? 'Analyse IA Excel...' : 'AI Excel analysis...'), 'info', 'excel')
      const result = await analyzeExcelRequest(aiRequest, data.slice(0, 10), lang)
      setAiAnalysis(result)
      addLog?.('✅ ' + (isFr ? 'Analyse IA terminée' : 'AI analysis done'), 'success', 'excel')
    } catch { setAiAnalysis(isFr ? 'Erreur analyse' : 'Analysis error') }
    setAiLoading(false)
  }

  // Totals row
  const totals = {}
  numericKeys.forEach(k => { totals[k] = data.reduce((sum, row) => sum + (Number(row[k]) || 0), 0) })

  const xKey = headers.find(h => typeof data[0]?.[h] === 'string') || headers[0]

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 60px)', overflow: 'auto' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={importFile} />
        <button className="btn-secondary" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }}>📂 {isFr ? 'Importer' : 'Import'}</button>
        <button className="btn-secondary" onClick={exportXLSX} style={{ fontSize: 12 }}>📥 Export XLSX</button>
        <button className="btn-secondary" onClick={addRow} style={{ fontSize: 12 }}>➕ {isFr ? 'Ligne' : 'Row'}</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {['table', 'chart', 'ai'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeTab === t ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTab === t ? '#a5b8fc' : 'rgba(255,255,255,0.5)',
            }}>
              {t === 'table' ? '📊 ' + (isFr ? 'Tableau' : 'Table') : t === 'chart' ? '📈 ' + (isFr ? 'Graphique' : 'Chart') : '🤖 IA'}
            </button>
          ))}
        </div>
      </div>

      {/* Table tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tables.map((t, i) => (
          <button key={t.id} onClick={() => setActiveTable(i)} style={{
            padding: '5px 14px', borderRadius: 8, border: '1px solid ' + (activeTable === i ? 'rgba(100,112,241,0.4)' : 'rgba(255,255,255,0.08)'),
            background: activeTable === i ? 'rgba(100,112,241,0.15)' : 'transparent',
            color: activeTable === i ? '#a5b8fc' : 'rgba(255,255,255,0.5)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>{t.name}</button>
        ))}
      </div>

      {/* Table tab */}
      {activeTab === 'table' && (
        <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', flex: 1 }}>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#0e1019', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>#</th>
                  {headers.map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#0e1019', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                  <th style={{ padding: '10px 12px', background: '#0e1019', borderBottom: '1px solid rgba(255,255,255,0.05)' }} />
                </tr>
              </thead>
              <tbody>
                {data.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{ri + 1}</td>
                    {headers.map(h => (
                      <td key={h} style={{ padding: '4px 8px' }}>
                        {editCell?.row === ri && editCell?.key === h ? (
                          <input
                            className="input"
                            style={{ padding: '4px 8px', fontSize: 13 }}
                            defaultValue={row[h]}
                            autoFocus
                            onBlur={e => { updateCell(ri, h, e.target.value); setEditCell(null) }}
                            onKeyDown={e => { if (e.key === 'Enter') { updateCell(ri, h, e.target.value); setEditCell(null) } if (e.key === 'Escape') setEditCell(null) }}
                          />
                        ) : (
                          <div onClick={() => setEditCell({ row: ri, key: h })} style={{
                            padding: '4px 8px', borderRadius: 6, cursor: 'text', color: 'rgba(255,255,255,0.8)',
                            fontWeight: typeof row[h] === 'number' ? 600 : 400,
                            color: typeof row[h] === 'number' ? '#a5b8fc' : 'rgba(255,255,255,0.8)',
                          }}>
                            {typeof row[h] === 'number' ? row[h].toLocaleString(isFr ? 'fr-FR' : 'en-US') : row[h]}
                          </div>
                        )}
                      </td>
                    ))}
                    <td style={{ padding: '4px 8px' }}>
                      <button onClick={() => deleteRow(ri)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                      >✕</button>
                    </td>
                  </tr>
                ))}
                {/* Totals */}
                {numericKeys.length > 0 && (
                  <tr style={{ background: 'rgba(100,112,241,0.08)', borderTop: '2px solid rgba(100,112,241,0.2)' }}>
                    <td style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#a5b8fc' }}>{isFr ? 'TOTAL' : 'TOTAL'}</td>
                    {headers.map(h => (
                      <td key={h} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: numericKeys.includes(h) ? '#a5b8fc' : 'transparent' }}>
                        {numericKeys.includes(h) ? totals[h].toLocaleString(isFr ? 'fr-FR' : 'en-US') : ''}
                      </td>
                    ))}
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart tab */}
      {activeTab === 'chart' && (
        <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {['bar', 'line', 'pie'].map(ct => (
              <button key={ct} onClick={() => setChartType(ct)} style={{
                padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: chartType === ct ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.05)',
                color: chartType === ct ? '#a5b8fc' : 'rgba(255,255,255,0.4)',
              }}>
                {ct === 'bar' ? '📊' : ct === 'line' ? '📈' : '🥧'} {ct === 'bar' ? (isFr ? 'Barres' : 'Bar') : ct === 'line' ? (isFr ? 'Lignes' : 'Line') : (isFr ? 'Camembert' : 'Pie')}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {numericKeys.map(k => (
                <button key={k} onClick={() => setChartKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])} style={{
                  padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, cursor: 'pointer',
                  background: chartKeys.includes(k) ? COLORS[numericKeys.indexOf(k)] + '22' : 'transparent',
                  color: chartKeys.includes(k) ? COLORS[numericKeys.indexOf(k)] : 'rgba(255,255,255,0.4)',
                }}>{k}</button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey={xKey} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }} />
                  <Legend />
                  {chartKeys.map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4,4,0,0]} />)}
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey={xKey} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }} />
                  <Legend />
                  {chartKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4, fill: COLORS[i % COLORS.length] }} />)}
                </LineChart>
              ) : (
                <PieChart>
                  <Pie data={data.map(d => ({ name: d[xKey], value: d[chartKeys[0]] || 0 }))} cx="50%" cy="50%" outerRadius="70%" dataKey="value" label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'}>
                    {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }} />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* AI tab */}
      {activeTab === 'ai' && (
        <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            {isFr ? '🤖 Demandez à Aria d\'analyser ou créer des tableaux Excel' : '🤖 Ask Aria to analyze or create Excel tables'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={aiRequest} onChange={e => setAiRequest(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyzeWithAI()} placeholder={isFr ? 'Ex: Analyse les tendances de revenus, Crée un tableau de budget...' : 'Ex: Analyze revenue trends, Create a budget table...'} />
            <button className="btn-primary" onClick={analyzeWithAI} disabled={aiLoading || !aiRequest.trim()} style={{ whiteSpace: 'nowrap' }}>
              {aiLoading ? '...' : (isFr ? 'Analyser' : 'Analyze')}
            </button>
          </div>
          {aiAnalysis && (
            <div style={{ background: 'rgba(100,112,241,0.05)', border: '1px solid rgba(100,112,241,0.15)', borderRadius: 12, padding: 16, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, whiteSpace: 'pre-wrap', flex: 1, overflowY: 'auto' }}>
              {aiAnalysis}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              isFr ? 'Analyse les tendances' : 'Analyze trends',
              isFr ? 'Calcule les moyennes' : 'Calculate averages',
              isFr ? 'Identifie les anomalies' : 'Identify anomalies',
              isFr ? 'Crée un résumé' : 'Create a summary',
            ].map(s => (
              <button key={s} className="btn-ghost" onClick={() => setAiRequest(s)} style={{ fontSize: 11, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
