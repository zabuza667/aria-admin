import { useState, useRef } from 'react'
import { useLS } from '../../hooks/useStore'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#6470f1','#10b981','#f59e0b','#ec4899','#06b6d4','#84cc16','#f97316','#8b5cf6']

// ── Détecte si le message demande un tableau/rapport visuel ──
function isVisualRequest(text) {
  const keywords = ['tableau', 'table', 'rapport', 'report', 'résumé visuel', 'visual summary',
    'génère un tableau', 'create a table', 'affiche', 'display', 'montre', 'show me',
    'récapitulatif', 'summary', 'synthèse', 'overview', 'dashboard']
  return keywords.some(k => text.toLowerCase().includes(k))
}

// ── Composant Tableau Visuel ──
function VisualTable({ data, title, headers, isFr }) {
  const numericCols = headers.filter(h => data.some(r => typeof r[h] === 'number' || (!isNaN(Number(r[h])) && r[h] !== '' && r[h] !== undefined)))

  function exportPDF() {
    const printWindow = window.open('', '_blank')
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1d2e; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 3px solid #6470f1; }
    .title { font-size: 24px; font-weight: 800; color: #1a1d2e; }
    .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .logo { font-size: 20px; font-weight: 800; color: #6470f1; }
    .stats { display: grid; grid-template-columns: repeat(${Math.min(numericCols.length, 4)}, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-card { background: #f8f9ff; border: 1px solid #e8eaff; border-radius: 8px; padding: 12px 16px; }
    .stat-label { font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 20px; font-weight: 800; color: #6470f1; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #6470f1; color: white; padding: 10px 14px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 9px 14px; border-bottom: 1px solid #f0f0f0; }
    tr:nth-child(even) td { background: #fafbff; }
    tr:hover td { background: #f0f2ff; }
    .num { text-align: right; font-weight: 600; color: #6470f1; }
    .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${title}</div>
      <div class="subtitle">Généré par Aria · ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    <div class="logo">✦ Aria</div>
  </div>
  ${numericCols.length > 0 ? `
  <div class="stats">
    ${numericCols.slice(0, 4).map(col => {
      const vals = data.map(r => Number(r[col])).filter(v => !isNaN(v))
      const total = vals.reduce((a, b) => a + b, 0)
      return `<div class="stat-card"><div class="stat-label">${col} — Total</div><div class="stat-value">${total.toLocaleString('fr-FR')}</div></div>`
    }).join('')}
  </div>` : ''}
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${data.map(row => `<tr>${headers.map(h => {
        const v = row[h]
        const isNum = typeof v === 'number' || (!isNaN(Number(v)) && v !== '' && v !== undefined)
        return `<td class="${isNum ? 'num' : ''}">${isNum ? Number(v).toLocaleString('fr-FR') : (v ?? '')}</td>`
      }).join('')}</tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">Rapport généré automatiquement par Aria · ${data.length} lignes · ${headers.length} colonnes</div>
</body>
</html>`
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => { printWindow.print() }
  }

  return (
    <div style={{ marginTop: 8 }}>
      {/* Stats cards */}
      {numericCols.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(numericCols.length, 4)}, 1fr)`, gap: 8, marginBottom: 12 }}>
          {numericCols.slice(0, 4).map(col => {
            const vals = data.map(r => Number(r[col])).filter(v => !isNaN(v))
            const total = vals.reduce((a, b) => a + b, 0)
            const avg = (total / vals.length).toFixed(0)
            return (
              <div key={col} style={{ background: 'rgba(100,112,241,0.08)', border: '1px solid rgba(100,112,241,0.2)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{col}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#a5b8fc' }}>{total.toLocaleString('fr-FR')}</div>
                <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 2 }}>∅ {Number(avg).toLocaleString('fr-FR')}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tableau */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: 300 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {headers.map(h => (
                  <th key={h} style={{ padding: '8px 12px', background: '#6470f1', color: 'white', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                  {headers.map(h => {
                    const v = row[h]
                    const isNum = typeof v === 'number' || (!isNaN(Number(v)) && v !== '' && v !== undefined)
                    return (
                      <td key={h} style={{ padding: '7px 12px', borderBottom: '1px solid var(--border)', textAlign: isNum ? 'right' : 'left', color: isNum ? '#a5b8fc' : 'var(--text)', fontWeight: isNum ? 600 : 400, whiteSpace: 'nowrap' }}>
                        {isNum ? Number(v).toLocaleString('fr-FR') : String(v ?? '')}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Footer + export */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted2)' }}>{data.length} lignes · {headers.length} colonnes</span>
          <button onClick={exportPDF} style={{
            padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: 'rgba(100,112,241,0.15)', color: '#a5b8fc', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            🖨️ {isFr ? 'Exporter PDF' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

const SUGGESTIONS_FR = [
  'Génère un tableau récapitulatif complet',
  'Fais moi un rapport avec tableau exportable',
  'Quel est le mois le plus rentable ?',
  'Détecte les anomalies dans mes données',
  'Affiche un résumé visuel de mes données',
  'Génère une formule RECHERCHEV pour ces données',
  'Quelles sont les tendances principales ?',
  'Y a-t-il des valeurs manquantes ?',
]

const SUGGESTIONS_EN = [
  'Generate a complete summary table',
  'Make me a report with exportable table',
  'What is the most profitable month?',
  'Detect anomalies in my data',
  'Show me a visual overview of my data',
  'Generate a VLOOKUP formula for this data',
  'What are the main trends?',
  'Are there any missing values?',
]

function analyzeDataLocally(data, headers, isFr) {
  if (!data || data.length === 0) return null

  const numericCols = headers.filter(h => data.some(r => typeof r[h] === 'number' || (!isNaN(Number(r[h])) && r[h] !== '')))
  const textCols = headers.filter(h => !numericCols.includes(h))

  const stats = {}
  numericCols.forEach(k => {
    const vals = data.map(r => Number(r[k])).filter(v => !isNaN(v) && v !== 0)
    if (!vals.length) return
    const sum = vals.reduce((a, b) => a + b, 0)
    const avg = sum / vals.length
    const sorted = [...vals].sort((a, b) => a - b)
    const std = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / vals.length)
    stats[k] = { sum, avg, min: Math.min(...vals), max: Math.max(...vals), median: sorted[Math.floor(sorted.length / 2)], std, count: vals.length }
  })

  // Anomalies (> 2 écarts types)
  const anomalies = []
  numericCols.forEach(k => {
    if (!stats[k]) return
    const { avg, std } = stats[k]
    data.forEach((row, i) => {
      const v = Number(row[k])
      if (!isNaN(v) && Math.abs(v - avg) > 2 * std) {
        anomalies.push({ row: i + 1, col: k, value: v, avg: avg.toFixed(0) })
      }
    })
  })

  // Doublons
  const seen = new Set()
  let duplicates = 0
  data.forEach(row => {
    const k = JSON.stringify(row)
    if (seen.has(k)) duplicates++
    else seen.add(k)
  })

  // Valeurs manquantes
  let missing = 0
  data.forEach(row => headers.forEach(h => { if (row[h] === '' || row[h] === null || row[h] === undefined) missing++ }))

  // Tendances (première vs dernière valeur)
  const trends = {}
  numericCols.forEach(k => {
    const vals = data.map(r => Number(r[k])).filter(v => !isNaN(v))
    if (vals.length < 2) return
    const change = ((vals[vals.length - 1] - vals[0]) / Math.abs(vals[0]) * 100).toFixed(1)
    trends[k] = Number(change)
  })

  return { stats, anomalies, duplicates, missing, trends, numericCols, textCols }
}

export default function ExcelView({ lang, addLog, triggerSave }) {
  const [files, setFiles] = useLS('excel_files_v1', [], triggerSave)
  const [activeFile, setActiveFile] = useState(0)
  const [messages, setMessages] = useLS('excel_messages', [], triggerSave)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chartType, setChartType] = useState('bar')
  const [showChart, setShowChart] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef()
  const chatRef = useRef()
  const isFr = lang === 'fr'

  const file = files[activeFile]
  const data = file?.data || []
  const headers = data.length > 0 ? Object.keys(data[0]) : []
  const analysis = file ? analyzeDataLocally(data, headers, isFr) : null
  const numericCols = analysis?.numericCols || []
  const xKey = headers.find(h => !numericCols.includes(h)) || headers[0]

  function importFile(f) {
    if (!f) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' })
        const allSheets = wb.SheetNames.map(name => ({
          name,
          data: XLSX.utils.sheet_to_json(wb.Sheets[name])
        })).filter(s => s.data.length > 0)

        if (!allSheets.length) return

        const newFile = {
          id: Date.now(),
          name: f.name,
          sheets: allSheets,
          data: allSheets[0].data,
          activeSheet: 0,
          imported: new Date().toLocaleString(isFr ? 'fr-FR' : 'en-US'),
          rowCount: allSheets[0].data.length,
        }
        setFiles(prev => [...prev, newFile])
        setActiveFile(files.length)

        // Message d'analyse automatique
        const ana = analyzeDataLocally(allSheets[0].data, Object.keys(allSheets[0].data[0] || {}), isFr)
        const autoMsg = buildAutoAnalysis(newFile, ana, isFr)
        setMessages(prev => [...prev, {
          role: 'assistant', content: autoMsg, fileId: newFile.id, timestamp: Date.now()
        }])
        addLog?.(`📊 ${f.name} importé — ${newFile.rowCount} lignes`, 'success', 'excel')
        setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100)
      } catch (e) {
        addLog?.('❌ Erreur import', 'error', 'excel')
      }
    }
    reader.readAsBinaryString(f)
  }

  function buildAutoAnalysis(file, ana, isFr) {
    if (!ana) return isFr ? 'Fichier importé.' : 'File imported.'
    const { stats, anomalies, duplicates, missing, trends, numericCols } = ana
    const headers = Object.keys(file.data[0] || {})

    let msg = isFr
      ? `✅ **${file.name}** importé avec succès !\n\n`
      : `✅ **${file.name}** successfully imported!\n\n`

    msg += isFr
      ? `📋 **Aperçu** — ${file.rowCount} lignes · ${headers.length} colonnes · ${file.sheets.length} feuille(s)\n`
      : `📋 **Overview** — ${file.rowCount} rows · ${headers.length} columns · ${file.sheets.length} sheet(s)\n`

    msg += isFr
      ? `🔢 **Colonnes numériques** : ${numericCols.join(', ') || 'aucune'}\n`
      : `🔢 **Numeric columns** : ${numericCols.join(', ') || 'none'}\n`

    if (Object.keys(stats).length > 0) {
      msg += isFr ? '\n📊 **Statistiques rapides** :\n' : '\n📊 **Quick stats** :\n'
      Object.entries(stats).slice(0, 3).forEach(([k, s]) => {
        msg += `• ${k} — Total: ${s.sum.toLocaleString(isFr?'fr-FR':'en-US')} · Moy: ${s.avg.toFixed(0).toLocaleString()} · Min: ${s.min.toLocaleString()} · Max: ${s.max.toLocaleString()}\n`
      })
    }

    if (Object.keys(trends).length > 0) {
      msg += isFr ? '\n📈 **Tendances** :\n' : '\n📈 **Trends** :\n'
      Object.entries(trends).slice(0, 3).forEach(([k, v]) => {
        msg += `• ${k} : ${v > 0 ? '📈 +' : '📉 '}${v}% ${isFr ? 'sur la période' : 'over period'}\n`
      })
    }

    if (anomalies.length > 0) {
      msg += isFr
        ? `\n⚠️ **${anomalies.length} anomalie(s) détectée(s)** — valeurs qui s'écartent significativement de la moyenne.\n`
        : `\n⚠️ **${anomalies.length} anomaly(ies) detected** — values significantly deviating from average.\n`
    }

    if (duplicates > 0) {
      msg += isFr ? `\n🔁 **${duplicates} doublon(s)** détecté(s).\n` : `\n🔁 **${duplicates} duplicate(s)** detected.\n`
    }

    if (missing > 0) {
      msg += isFr ? `\n❓ **${missing} valeur(s) manquante(s)** dans les données.\n` : `\n❓ **${missing} missing value(s)** in data.\n`
    }

    msg += isFr
      ? '\n💬 **Posez-moi une question** sur ces données ou demandez une formule Excel !'
      : '\n💬 **Ask me a question** about this data or request an Excel formula!'

    return msg
  }

  async function sendMessage(text) {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    setLoading(true)

    const userMsg = { role: 'user', content: msg, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 50)

    const wantsVisual = isVisualRequest(msg) && file && data.length > 0

    try {
      const context = file ? `
Fichier Excel: "${file.name}"
Lignes: ${data.length} | Colonnes: ${headers.join(', ')}
Échantillon (10 premières lignes): ${JSON.stringify(data.slice(0, 10))}
Statistiques: ${JSON.stringify(analysis?.stats || {})}
Tendances: ${JSON.stringify(analysis?.trends || {})}
Anomalies: ${JSON.stringify(analysis?.anomalies?.slice(0, 5) || [])}
Doublons: ${analysis?.duplicates || 0}
Valeurs manquantes: ${analysis?.missing || 0}
` : (isFr ? 'Aucun fichier importé.' : 'No file imported.')

      const systemPrompt = isFr
        ? `Tu es Aria, un assistant expert en Excel et analyse de données intégré dans une app de gestion.
Tu analyses des fichiers Excel et réponds aux questions en français de façon claire et structurée.
Quand on te demande une formule Excel, tu donnes la formule EXACTE et complète, avec une explication.
Tu utilises des emojis pour rendre les réponses lisibles.
Tu es direct, précis, et utile. Tu ne donnes jamais de réponses vagues.
${wantsVisual ? `IMPORTANT: L'utilisateur veut un tableau visuel. À la FIN de ta réponse texte, ajoute exactement ce bloc JSON (ne le modifie pas, remplace juste les valeurs):
VISUAL_TABLE_START
{"title":"[titre du tableau]","rows":[${JSON.stringify(data.slice(0,20))}],"headers":${JSON.stringify(headers)}}
VISUAL_TABLE_END` : ''}
Formules disponibles: SOMME, MOYENNE, MAX, MIN, NB, NBVAL, SI, SIERREUR, RECHERCHEV, INDEX, EQUIV, NB.SI, SOMME.SI, RANG, GRANDE.VALEUR, CONCATENER, MAJUSCULE, MINUSCULE, NBCAR, GAUCHE, DROITE, ARRONDI, ABS, RACINE, ECARTYPE, MEDIANE, AUJOURDHUI.`
        : `You are Aria, an Excel and data analysis expert assistant.
${wantsVisual ? `IMPORTANT: User wants a visual table. At the END of your text response, add exactly this JSON block:
VISUAL_TABLE_START
{"title":"[table title]","rows":[${JSON.stringify(data.slice(0,20))}],"headers":${JSON.stringify(headers)}}
VISUAL_TABLE_END` : ''}
Give EXACT Excel formulas when asked. Be direct and helpful.`

      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [
            ...history,
            { role: 'user', content: `${context}\n\nQuestion: ${msg}` }
          ]
        })
      })
      const result = await response.json()
      let reply = result.content?.find(c => c.type === 'text')?.text || (isFr ? 'Erreur de réponse' : 'Response error')

      // Extraire le tableau visuel si présent
      let visualData = null
      const visualMatch = reply.match(/VISUAL_TABLE_START\s*([\s\S]*?)\s*VISUAL_TABLE_END/)
      if (visualMatch) {
        try {
          visualData = JSON.parse(visualMatch[1].trim())
          reply = reply.replace(/VISUAL_TABLE_START[\s\S]*?VISUAL_TABLE_END/, '').trim()
        } catch { visualData = null }
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        visualData,
        timestamp: Date.now()
      }])
      addLog?.('🤖 Analyse IA Excel', 'success', 'excel')
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: isFr ? '❌ Erreur de connexion à l\'IA' : '❌ AI connection error', timestamp: Date.now() }])
    }

    setLoading(false)
    setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100)
  }

  function exportXLSX() {
    if (!file) return
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.writeFile(wb, file.name.replace(/\.[^.]+$/, '') + '_aria.xlsx')
    addLog?.('📥 Export XLSX', 'success', 'excel')
  }

  function removeDuplicates() {
    if (!file) return
    const seen = new Set()
    const deduped = data.filter(row => {
      const k = JSON.stringify(row)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    const removed = data.length - deduped.length
    setFiles(prev => prev.map((f, i) => i === activeFile ? { ...f, data: deduped, rowCount: deduped.length } : f))
    sendMessage(isFr ? `J'ai supprimé ${removed} doublon(s). Peux-tu analyser les données nettoyées ?` : `I removed ${removed} duplicate(s). Can you analyze the cleaned data?`)
  }

  function switchSheet(idx) {
    if (!file?.sheets) return
    const newData = file.sheets[idx].data
    setFiles(prev => prev.map((f, i) => i === activeFile ? { ...f, data: newData, activeSheet: idx, rowCount: newData.length } : f))
  }

  // Données graphique
  const chartData = data.slice(0, 50)

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

      {/* ── EN-TÊTE ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            📊 {isFr ? 'Assistant Excel IA' : 'AI Excel Assistant'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {isFr ? 'Importez un fichier · Posez vos questions · Obtenez des formules exactes' : 'Import a file · Ask questions · Get exact formulas'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => importFile(e.target.files[0])} />
          <button className="btn-primary" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }}>
            📂 {isFr ? 'Importer fichier' : 'Import file'}
          </button>
          {file && <>
            <button className="btn-secondary" onClick={exportXLSX} style={{ fontSize: 12 }}>💾 Export</button>
            <button className="btn-secondary" onClick={() => setShowChart(v => !v)} style={{ fontSize: 12 }}>
              {showChart ? '📋' : '📈'} {showChart ? (isFr ? 'Données' : 'Data') : (isFr ? 'Graphique' : 'Chart')}
            </button>
          </>}
        </div>
      </div>

      {/* ── ZONE PRINCIPALE ── */}
      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* ── PANNEAU GAUCHE — Fichiers + Aperçu ── */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>

          {/* Zone drop */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); importFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? '#6470f1' : 'var(--border2)'}`,
              borderRadius: 12, padding: '16px 12px', textAlign: 'center', cursor: 'pointer',
              background: isDragging ? 'rgba(100,112,241,0.08)' : 'var(--surface)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>📂</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
              {isFr ? 'Glissez un fichier ici' : 'Drop a file here'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 3 }}>.xlsx · .xls · .csv</div>
          </div>

          {/* Liste fichiers */}
          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isFr ? 'Fichiers' : 'Files'} ({files.length})
              </div>
              {files.map((f, i) => (
                <div key={f.id}
                  onClick={() => setActiveFile(i)}
                  style={{
                    padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${activeFile === i ? 'rgba(100,112,241,0.4)' : 'var(--border)'}`,
                    background: activeFile === i ? 'rgba(100,112,241,0.08)' : 'var(--surface)',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: activeFile === i ? '#a5b8fc' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📊 {f.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 2 }}>
                    {f.rowCount} {isFr ? 'lignes' : 'rows'} · {f.imported}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Feuilles */}
          {file?.sheets?.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isFr ? 'Feuilles' : 'Sheets'}
              </div>
              {file.sheets.map((sh, i) => (
                <button key={i} onClick={() => switchSheet(i)} style={{
                  padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: (file.activeSheet || 0) === i ? 'rgba(100,112,241,0.12)' : 'transparent',
                  color: (file.activeSheet || 0) === i ? '#a5b8fc' : 'var(--muted)',
                  fontSize: 11, cursor: 'pointer', textAlign: 'left',
                }}>📋 {sh.name} <span style={{ color: 'var(--muted2)', marginLeft: 4 }}>{sh.data.length}</span></button>
              ))}
            </div>
          )}

          {/* Stats rapides */}
          {analysis && numericCols.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stats</div>
              {numericCols.slice(0, 3).map(k => analysis.stats[k] && (
                <div key={k}>
                  <div style={{ fontSize: 11, color: '#6470f1', fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {[['Σ', analysis.stats[k].sum], ['∅', analysis.stats[k].avg.toFixed(0)], ['↓', analysis.stats[k].min], ['↑', analysis.stats[k].max]].map(([l, v]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                        <span style={{ color: 'var(--muted2)' }}>{l}</span>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{Number(v).toLocaleString(isFr ? 'fr-FR' : 'en-US')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {analysis.anomalies.length > 0 && (
                <div style={{ fontSize: 10, color: '#f59e0b', padding: '4px 8px', background: 'rgba(245,158,11,0.08)', borderRadius: 6 }}>
                  ⚠️ {analysis.anomalies.length} {isFr ? 'anomalie(s)' : 'anomaly(ies)'}
                </div>
              )}
              {analysis.duplicates > 0 && (
                <button onClick={removeDuplicates} style={{ fontSize: 10, color: '#6470f1', padding: '4px 8px', background: 'rgba(100,112,241,0.08)', borderRadius: 6, border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  🔁 {analysis.duplicates} {isFr ? 'doublon(s) — Supprimer' : 'duplicate(s) — Remove'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── PANNEAU DROIT — Chat IA + Aperçu ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', minHeight: 0 }}>

          {/* Graphique */}
          {showChart && file && numericCols.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, height: 220, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {['bar', 'line', 'area', 'pie'].map(ct => (
                  <button key={ct} onClick={() => setChartType(ct)} style={{
                    padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    background: chartType === ct ? 'rgba(100,112,241,0.2)' : 'var(--surface2)',
                    color: chartType === ct ? '#a5b8fc' : 'var(--muted)',
                  }}>{ct === 'bar' ? '📊' : ct === 'line' ? '📈' : ct === 'area' ? '🏔️' : '🥧'}</button>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={155}>
                {chartType === 'bar' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey={xKey} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, fontSize: 11 }} />
                    {numericCols.slice(0, 4).map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />)}
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey={xKey} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, fontSize: 11 }} />
                    {numericCols.slice(0, 4).map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)}
                  </LineChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={chartData}>
                    <defs>{numericCols.slice(0, 4).map((k, i) => <linearGradient key={k} id={`g${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} /></linearGradient>)}</defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey={xKey} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, fontSize: 11 }} />
                    {numericCols.slice(0, 4).map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} fill={`url(#g${i})`} strokeWidth={2} />)}
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Pie data={chartData.slice(0, 10).map(d => ({ name: d[xKey], value: Number(d[numericCols[0]]) || 0 }))} cx="50%" cy="50%" outerRadius={65} dataKey="value" labelLine={false}
                      label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : null}>
                      {chartData.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10, color: 'var(--muted)' }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {/* Chat */}
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

            {/* Messages */}
            <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* État vide */}
              {messages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                  <div style={{ fontSize: 40 }}>🤖</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                      {isFr ? 'Assistant Excel IA' : 'AI Excel Assistant'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 320, lineHeight: 1.6 }}>
                      {isFr
                        ? 'Importez un fichier Excel pour commencer. Je l\'analyserai automatiquement et répondrai à toutes vos questions.'
                        : 'Import an Excel file to get started. I\'ll analyze it automatically and answer all your questions.'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 400 }}>
                    {(isFr ? SUGGESTIONS_FR : SUGGESTIONS_EN).slice(0, 4).map(s => (
                      <button key={s} onClick={() => sendMessage(s)} style={{
                        padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border2)',
                        background: 'var(--surface2)', color: 'var(--muted)', fontSize: 11, cursor: 'pointer',
                      }}>{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    background: msg.role === 'user' ? 'rgba(100,112,241,0.2)' : 'rgba(16,185,129,0.15)',
                  }}>
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div style={{ maxWidth: msg.visualData ? '95%' : '80%', flex: msg.visualData ? 1 : 'unset' }}>
                    {msg.content && (
                      <div style={{
                        padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                        background: msg.role === 'user' ? 'rgba(100,112,241,0.12)' : 'var(--surface2)',
                        border: `1px solid ${msg.role === 'user' ? 'rgba(100,112,241,0.2)' : 'var(--border)'}`,
                        fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap',
                      }}>
                        {msg.content}
                      </div>
                    )}
                    {msg.visualData && (
                      <VisualTable
                        data={msg.visualData.rows || []}
                        title={msg.visualData.title || file?.name || 'Tableau'}
                        headers={msg.visualData.headers || headers}
                        isFr={isFr}
                      />
                    )}
                  </div>
                </div>
              ))}

              {/* Loading */}
              {loading && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
                  <div style={{ padding: '12px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6470f1', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {messages.length > 0 && !loading && (
              <div style={{ padding: '0 12px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(isFr ? SUGGESTIONS_FR : SUGGESTIONS_EN).slice(0, 4).map(s => (
                  <button key={s} onClick={() => sendMessage(s)} style={{
                    padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border2)',
                    background: 'transparent', color: 'var(--muted2)', fontSize: 10, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(100,112,241,0.4)'; e.currentTarget.style.color = '#a5b8fc' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted2)' }}
                  >{s}</button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input
                className="input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={file
                  ? (isFr ? 'Posez une question sur vos données...' : 'Ask a question about your data...')
                  : (isFr ? 'Importez d\'abord un fichier Excel...' : 'Import an Excel file first...')
                }
                disabled={loading}
                style={{ flex: 1 }}
              />
              <button className="btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                {loading ? '⏳' : (isFr ? 'Envoyer' : 'Send')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-6px) }
        }
      `}</style>
    </div>
  )
}
