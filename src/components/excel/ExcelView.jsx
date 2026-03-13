import { useState, useRef, useEffect, useCallback } from 'react'
import { useLS } from '../../hooks/useStore'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

// ─── Constantes ───────────────────────────────────────────────
const COLORS = ['#6470f1','#10b981','#f59e0b','#ec4899','#06b6d4','#84cc16','#f97316','#8b5cf6']

const SAMPLE = [
  ['Mois','Revenus','Dépenses','Bénéfice','Croissance'],
  ['Janvier',45000,32000,13000,'8.2%'],
  ['Février',52000,35000,17000,'15.6%'],
  ['Mars',48000,31000,17000,'-7.7%'],
  ['Avril',61000,38000,23000,'27.1%'],
  ['Mai',55000,36000,19000,'-9.8%'],
  ['Juin',67000,41000,26000,'21.8%'],
  ['Juillet',71000,43000,28000,'5.9%'],
  ['Août',59000,38000,21000,'-16.9%'],
]

function colLetter(n) {
  let s = ''
  let i = n
  while (i >= 0) { s = String.fromCharCode(65 + (i % 26)) + s; i = Math.floor(i / 26) - 1 }
  return s
}

function parseCellRef(ref, headers, numRows) {
  // "B2" → { col: 1, row: 1 }
  const m = ref.match(/^([A-Z]+)(\d+)$/)
  if (!m) return null
  let col = 0
  for (let i = 0; i < m[1].length; i++) col = col * 26 + m[1].charCodeAt(i) - 64
  col -= 1
  const row = parseInt(m[2]) - 1
  return { col, row }
}

function parseRange(range, headers, numRows) {
  // "B2:D5" → [{col,row}, {col,row}]
  const parts = range.split(':')
  if (parts.length !== 2) return null
  const a = parseCellRef(parts[0])
  const b = parseCellRef(parts[1])
  if (!a || !b) return null
  return { r1: Math.min(a.row, b.row), r2: Math.max(a.row, b.row), c1: Math.min(a.col, b.col), c2: Math.max(a.col, b.col) }
}

// ─── Moteur de formules ───────────────────────────────────────
function evalFormula(formula, grid) {
  if (!formula.startsWith('=')) return formula

  const expr = formula.slice(1).trim()
  const numRows = grid.length
  const numCols = grid[0]?.length || 0

  function getCell(ref) {
    const c = parseCellRef(ref)
    if (!c) return 0
    const val = grid[c.row]?.[c.col]
    return isNaN(Number(val)) ? val : Number(val)
  }

  function getRangeVals(rangeStr) {
    const r = parseRange(rangeStr)
    if (!r) return []
    const vals = []
    for (let row = r.r1; row <= r.r2; row++)
      for (let col = r.c1; col <= r.c2; col++) {
        const v = grid[row]?.[col]
        if (v !== undefined && v !== '' && !isNaN(Number(v))) vals.push(Number(v))
      }
    return vals
  }

  function getRangeAllVals(rangeStr) {
    const r = parseRange(rangeStr)
    if (!r) return []
    const vals = []
    for (let row = r.r1; row <= r.r2; row++)
      for (let col = r.c1; col <= r.c2; col++) {
        const v = grid[row]?.[col]
        if (v !== undefined && v !== '') vals.push(v)
      }
    return vals
  }

  try {
    // SOMME / SUM
    let m = expr.match(/^(?:SOMME|SUM)\(([^)]+)\)$/i)
    if (m) { const v = getRangeVals(m[1]); return v.reduce((a,b)=>a+b,0) }

    // MOYENNE / AVERAGE
    m = expr.match(/^(?:MOYENNE|AVERAGE)\(([^)]+)\)$/i)
    if (m) { const v = getRangeVals(m[1]); return v.length ? +(v.reduce((a,b)=>a+b,0)/v.length).toFixed(4) : 0 }

    // MAX
    m = expr.match(/^MAX\(([^)]+)\)$/i)
    if (m) { const v = getRangeVals(m[1]); return v.length ? Math.max(...v) : 0 }

    // MIN
    m = expr.match(/^MIN\(([^)]+)\)$/i)
    if (m) { const v = getRangeVals(m[1]); return v.length ? Math.min(...v) : 0 }

    // NB / COUNT
    m = expr.match(/^(?:NB|COUNT)\(([^)]+)\)$/i)
    if (m) { return getRangeVals(m[1]).length }

    // NBVAL / COUNTA
    m = expr.match(/^(?:NBVAL|COUNTA)\(([^)]+)\)$/i)
    if (m) { return getRangeAllVals(m[1]).length }

    // MEDIANE / MEDIAN
    m = expr.match(/^(?:MEDIANE|MEDIAN)\(([^)]+)\)$/i)
    if (m) { const v = getRangeVals(m[1]).sort((a,b)=>a-b); return v.length ? v[Math.floor(v.length/2)] : 0 }

    // ECARTYPE / STDEV
    m = expr.match(/^(?:ECARTYPE|STDEV)\(([^)]+)\)$/i)
    if (m) {
      const v = getRangeVals(m[1])
      if (!v.length) return 0
      const avg = v.reduce((a,b)=>a+b,0)/v.length
      return +Math.sqrt(v.reduce((a,b)=>a+Math.pow(b-avg,2),0)/v.length).toFixed(4)
    }

    // ARRONDI / ROUND
    m = expr.match(/^(?:ARRONDI|ROUND)\(([^,]+),([^)]+)\)$/i)
    if (m) { return +Number(getCell(m[1].trim())||eval(m[1].trim())).toFixed(parseInt(m[2])) }

    // ABS
    m = expr.match(/^ABS\(([^)]+)\)$/i)
    if (m) { return Math.abs(Number(getCell(m[1].trim()))) }

    // RACINE / SQRT
    m = expr.match(/^(?:RACINE|SQRT)\(([^)]+)\)$/i)
    if (m) { return +Math.sqrt(Number(getCell(m[1].trim()))).toFixed(4) }

    // PUISSANCE / POWER
    m = expr.match(/^(?:PUISSANCE|POWER)\(([^,]+),([^)]+)\)$/i)
    if (m) { return Math.pow(Number(getCell(m[1].trim())), Number(m[2])) }

    // MOD
    m = expr.match(/^MOD\(([^,]+),([^)]+)\)$/i)
    if (m) { return Number(getCell(m[1].trim())) % Number(m[2]) }

    // ENT / INT
    m = expr.match(/^(?:ENT|INT)\(([^)]+)\)$/i)
    if (m) { return Math.floor(Number(getCell(m[1].trim()))) }

    // MAJUSCULE / UPPER
    m = expr.match(/^(?:MAJUSCULE|UPPER)\(([^)]+)\)$/i)
    if (m) { return String(getCell(m[1].trim())).toUpperCase() }

    // MINUSCULE / LOWER
    m = expr.match(/^(?:MINUSCULE|LOWER)\(([^)]+)\)$/i)
    if (m) { return String(getCell(m[1].trim())).toLowerCase() }

    // NOMPROPRE / PROPER
    m = expr.match(/^(?:NOMPROPRE|PROPER)\(([^)]+)\)$/i)
    if (m) { return String(getCell(m[1].trim())).replace(/\b\w/g, c=>c.toUpperCase()) }

    // NBCAR / LEN
    m = expr.match(/^(?:NBCAR|LEN)\(([^)]+)\)$/i)
    if (m) { return String(getCell(m[1].trim())).length }

    // GAUCHE / LEFT
    m = expr.match(/^(?:GAUCHE|LEFT)\(([^,]+),([^)]+)\)$/i)
    if (m) { return String(getCell(m[1].trim())).slice(0, parseInt(m[2])) }

    // DROITE / RIGHT
    m = expr.match(/^(?:DROITE|RIGHT)\(([^,]+),([^)]+)\)$/i)
    if (m) { const s = String(getCell(m[1].trim())); return s.slice(s.length - parseInt(m[2])) }

    // SUPPRESPACE / TRIM
    m = expr.match(/^(?:SUPPRESPACE|TRIM)\(([^)]+)\)$/i)
    if (m) { return String(getCell(m[1].trim())).trim() }

    // AUJOURDHUI / TODAY
    if (/^(?:AUJOURDHUI|TODAY)\(\)$/i.test(expr)) { return new Date().toLocaleDateString('fr-FR') }

    // MAINTENANT / NOW
    if (/^(?:MAINTENANT|NOW)\(\)$/i.test(expr)) { return new Date().toLocaleString('fr-FR') }

    // ANNEE / YEAR
    m = expr.match(/^(?:ANNEE|YEAR)\(([^)]+)\)$/i)
    if (m) { return new Date(getCell(m[1].trim())).getFullYear() }

    // MOIS / MONTH
    m = expr.match(/^(?:MOIS|MONTH)\(([^)]+)\)$/i)
    if (m) { return new Date(getCell(m[1].trim())).getMonth() + 1 }

    // JOUR / DAY
    m = expr.match(/^(?:JOUR|DAY)\(([^)]+)\)$/i)
    if (m) { return new Date(getCell(m[1].trim())).getDate() }

    // ALEA / RAND
    if (/^(?:ALEA|RAND)\(\)$/i.test(expr)) { return +Math.random().toFixed(4) }

    // PI
    if (/^PI\(\)$/i.test(expr)) { return Math.PI }

    // NB.SI / COUNTIF
    m = expr.match(/^(?:NB\.SI|COUNTIF)\(([^,]+),([^)]+)\)$/i)
    if (m) {
      const vals = getRangeAllVals(m[1].trim())
      const crit = m[2].trim().replace(/"/g,'')
      const numCrit = crit.match(/^([><=!]+)(.+)$/)
      if (numCrit) {
        const op = numCrit[1], val = Number(numCrit[2])
        return vals.filter(v => {
          const n = Number(v)
          if (op === '>') return n > val
          if (op === '<') return n < val
          if (op === '>=') return n >= val
          if (op === '<=') return n <= val
          if (op === '<>') return n !== val
          return n === val
        }).length
      }
      return vals.filter(v => String(v) === crit).length
    }

    // SOMME.SI / SUMIF
    m = expr.match(/^(?:SOMME\.SI|SUMIF)\(([^,]+),([^,]+),([^)]+)\)$/i)
    if (m) {
      const condRange = getRangeAllVals(m[1].trim())
      const sumRange = getRangeVals(m[3].trim())
      const crit = m[2].trim().replace(/"/g,'')
      const numCrit = crit.match(/^([><=!]+)(.+)$/)
      let total = 0
      condRange.forEach((v, i) => {
        const n = Number(v)
        let match = false
        if (numCrit) {
          const op = numCrit[1], val = Number(numCrit[2])
          if (op === '>') match = n > val
          else if (op === '<') match = n < val
          else if (op === '>=') match = n >= val
          else if (op === '<=') match = n <= val
          else match = n === val
        } else match = String(v) === crit
        if (match) total += sumRange[i] || 0
      })
      return total
    }

    // RANG / RANK
    m = expr.match(/^(?:RANG|RANK)\(([^,]+),([^,)]+)/i)
    if (m) {
      const val = Number(getCell(m[1].trim()))
      const vals = getRangeVals(m[2].trim()).sort((a,b)=>b-a)
      return vals.indexOf(val) + 1
    }

    // GRANDE.VALEUR / LARGE
    m = expr.match(/^(?:GRANDE\.VALEUR|LARGE)\(([^,]+),([^)]+)\)$/i)
    if (m) { const v = getRangeVals(m[1].trim()).sort((a,b)=>b-a); return v[parseInt(m[2])-1] ?? 0 }

    // PETITE.VALEUR / SMALL
    m = expr.match(/^(?:PETITE\.VALEUR|SMALL)\(([^,]+),([^)]+)\)$/i)
    if (m) { const v = getRangeVals(m[1].trim()).sort((a,b)=>a-b); return v[parseInt(m[2])-1] ?? 0 }

    // CONCATENER / CONCATENATE & opérateur &
    m = expr.match(/^(?:CONCATENER|CONCATENATE)\((.+)\)$/i)
    if (m) {
      return m[1].split(',').map(p => {
        p = p.trim()
        if (p.startsWith('"') && p.endsWith('"')) return p.slice(1,-1)
        return String(getCell(p))
      }).join('')
    }

    // SI / IF
    m = expr.match(/^(?:SI|IF)\((.+)\)$/i)
    if (m) {
      const parts = m[1].match(/^(.+?),(.+),(.+)$/)
      if (parts) {
        const condStr = parts[1].trim()
        const trueVal = parts[2].trim().replace(/^"|"$/g,'')
        const falseVal = parts[3].trim().replace(/^"|"$/g,'')
        const condMatch = condStr.match(/^([A-Z]+\d+|[\d.]+)([><=!]+)([A-Z]+\d+|[\d.]+|"[^"]*")$/)
        if (condMatch) {
          const left = Number(getCell(condMatch[1])) || Number(condMatch[1]) || 0
          const op = condMatch[2]
          const rightRaw = condMatch[3].replace(/"/g,'')
          const right = Number(rightRaw) || 0
          let result = false
          if (op === '>') result = left > right
          else if (op === '<') result = left < right
          else if (op === '>=') result = left >= right
          else if (op === '<=') result = left <= right
          else if (op === '=') result = left === right
          else if (op === '<>') result = left !== right
          return result ? trueVal : falseVal
        }
      }
    }

    // SIERREUR / IFERROR
    m = expr.match(/^(?:SIERREUR|IFERROR)\((.+),([^,]+)\)$/i)
    if (m) {
      try { return evalFormula('=' + m[1].trim(), grid) }
      catch { return m[2].trim().replace(/"/g,'') }
    }

    // RECHERCHEV / VLOOKUP
    m = expr.match(/^(?:RECHERCHEV|VLOOKUP)\(([^,]+),([^,]+),([^,]+),([^)]+)\)$/i)
    if (m) {
      const searchVal = String(getCell(m[1].trim()) || m[1].trim().replace(/"/g,''))
      const range = parseRange(m[2].trim())
      const colIdx = parseInt(m[3]) - 1
      if (range) {
        for (let row = range.r1; row <= range.r2; row++) {
          if (String(grid[row]?.[range.c1]) === searchVal) {
            return grid[row]?.[range.c1 + colIdx] ?? '#N/A'
          }
        }
      }
      return '#N/A'
    }

    // INDEX
    m = expr.match(/^INDEX\(([^,]+),([^,)]+)(?:,([^)]+))?\)$/i)
    if (m) {
      const range = parseRange(m[1].trim())
      const rowIdx = parseInt(m[2]) - 1
      const colIdx = m[3] ? parseInt(m[3]) - 1 : 0
      if (range) return grid[range.r1 + rowIdx]?.[range.c1 + colIdx] ?? '#REF!'
    }

    // EQUIV / MATCH
    m = expr.match(/^(?:EQUIV|MATCH)\(([^,]+),([^,]+),([^)]*)\)$/i)
    if (m) {
      const searchVal = String(getCell(m[1].trim()) || m[1].trim().replace(/"/g,''))
      const range = parseRange(m[2].trim())
      if (range) {
        for (let row = range.r1; row <= range.r2; row++) {
          if (String(grid[row]?.[range.c1]) === searchVal) return row - range.r1 + 1
        }
      }
      return '#N/A'
    }

    // Opérateur & pour concaténation  "A1&" "&B1"
    if (expr.includes('&')) {
      return expr.split('&').map(p => {
        p = p.trim()
        if (p.startsWith('"') && p.endsWith('"')) return p.slice(1,-1)
        if (/^[A-Z]+\d+$/.test(p)) return String(getCell(p))
        return p
      }).join('')
    }

    // Opérations arithmétiques simples entre cellules  "A1+B1", "A1*2", etc.
    const arithMatch = expr.match(/^([A-Z]+\d+|[\d.]+)\s*([+\-*/])\s*([A-Z]+\d+|[\d.]+)$/)
    if (arithMatch) {
      const left = /^[A-Z]+\d+$/.test(arithMatch[1]) ? Number(getCell(arithMatch[1])) : Number(arithMatch[1])
      const right = /^[A-Z]+\d+$/.test(arithMatch[3]) ? Number(getCell(arithMatch[3])) : Number(arithMatch[3])
      const op = arithMatch[2]
      if (op === '+') return left + right
      if (op === '-') return left - right
      if (op === '*') return left * right
      if (op === '/') return right !== 0 ? +(left / right).toFixed(6) : '#DIV/0!'
    }

    return '#NOM?'
  } catch {
    return '#ERREUR!'
  }
}

// ─── Données initiales en grille 2D ───────────────────────────
function makeInitialSheets() {
  return [{
    id: 1,
    name: 'Feuil1',
    grid: SAMPLE.map(row => [...row]),
    formulas: {},
    colWidths: { 0: 120 },
  }]
}

// ─── Composant principal ──────────────────────────────────────
export default function ExcelView({ lang, addLog, triggerSave }) {
  const [sheets, setSheets] = useLS('excel_sheets_v2', makeInitialSheets(), triggerSave)
  const [activeSheet, setActiveSheet] = useState(0)
  const [sel, setSel] = useState({ r: 0, c: 0 })           // cellule active
  const [range, setRange] = useState(null)                   // plage sélectionnée {r1,c1,r2,c2}
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [editingCell, setEditingCell] = useState(null)       // {r,c}
  const [editValue, setEditValue] = useState('')
  const [formulaBar, setFormulaBar] = useState('')
  const [copiedCell, setCopiedCell] = useState(null)         // {r,c} ou range
  const [clipboard, setClipboard] = useState(null)           // valeur copiée
  const [history, setHistory] = useState([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [activeTab, setActiveTab] = useState('sheet')
  const [chartType, setChartType] = useState('bar')
  const [aiRequest, setAiRequest] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [condRules, setCondRules] = useState([])
  const [showCondModal, setShowCondModal] = useState(false)
  const [newRule, setNewRule] = useState({ col: 0, condition: 'gt', value: '', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' })
  const [contextMenu, setContextMenu] = useState(null)
  const [notification, setNotification] = useState(null)

  const tableRef = useRef()
  const editInputRef = useRef()
  const isFr = lang === 'fr'

  const sheet = sheets[activeSheet]
  const grid = sheet?.grid || [['']]
  const formulas = sheet?.formulas || {}
  const numRows = grid.length
  const numCols = Math.max(...grid.map(r => r.length), 1)

  // Valeur affichée d'une cellule (résultat de formule ou valeur brute)
  function displayVal(r, c) {
    const key = `${r},${c}`
    const raw = grid[r]?.[c]
    if (formulas[key]) {
      return evalFormula(formulas[key], grid)
    }
    return raw ?? ''
  }

  function rawVal(r, c) {
    const key = `${r},${c}`
    return formulas[key] || grid[r]?.[c] || ''
  }

  // Barre de formule = formule si existe, sinon valeur
  useEffect(() => {
    setFormulaBar(String(rawVal(sel.r, sel.c)))
  }, [sel, sheets, activeSheet])

  // ── Historique ──
  function pushHistory(g, f) {
    const snap = JSON.stringify({ grid: g, formulas: f })
    const h = history.slice(0, historyIdx + 1)
    h.push(snap)
    setHistory(h)
    setHistoryIdx(h.length - 1)
  }

  function undo() {
    if (historyIdx <= 0) return
    const snap = JSON.parse(history[historyIdx - 1])
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, grid: snap.grid, formulas: snap.formulas } : sh))
    setHistoryIdx(h => h - 1)
    notify(isFr ? 'Annulé' : 'Undone')
  }

  function redo() {
    if (historyIdx >= history.length - 1) return
    const snap = JSON.parse(history[historyIdx + 1])
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, grid: snap.grid, formulas: snap.formulas } : sh))
    setHistoryIdx(h => h + 1)
    notify(isFr ? 'Rétabli' : 'Redone')
  }

  function notify(msg, color = '#10b981') {
    setNotification({ msg, color })
    setTimeout(() => setNotification(null), 2000)
  }

  // ── Mise à jour cellule ──
  function setCell(r, c, value) {
    pushHistory(grid, formulas)
    const newGrid = grid.map((row, ri) => ri === r ? row.map((v, ci) => ci === c ? (value.startsWith('=') ? '' : (isNaN(Number(value)) || value === '' ? value : Number(value))) : v) : row)
    const newFormulas = { ...formulas }
    const key = `${r},${c}`
    if (value.startsWith('=')) {
      newFormulas[key] = value
      newGrid[r][c] = ''
    } else {
      delete newFormulas[key]
    }
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, grid: newGrid, formulas: newFormulas } : sh))
  }

  function commitEdit() {
    if (!editingCell) return
    setCell(editingCell.r, editingCell.c, editValue)
    setEditingCell(null)
  }

  // ── Lignes / colonnes ──
  function addRow() {
    pushHistory(grid, formulas)
    const newRow = Array(numCols).fill('')
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, grid: [...sh.grid, newRow] } : sh))
  }

  function addCol() {
    pushHistory(grid, formulas)
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, grid: sh.grid.map(row => [...row, '']) } : sh))
  }

  function deleteRow(ri) {
    if (numRows <= 1) return
    pushHistory(grid, formulas)
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, grid: sh.grid.filter((_,idx)=>idx!==ri) } : sh))
    if (sel.r >= ri && sel.r > 0) setSel(c => ({ ...c, r: c.r - 1 }))
    notify(isFr ? 'Ligne supprimée' : 'Row deleted', '#ef4444')
  }

  function deleteCol(ci) {
    if (numCols <= 1) return
    pushHistory(grid, formulas)
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, grid: sh.grid.map(row => row.filter((_,idx)=>idx!==ci)) } : sh))
    if (sel.c >= ci && sel.c > 0) setSel(c => ({ ...c, c: c.c - 1 }))
    notify(isFr ? 'Colonne supprimée' : 'Column deleted', '#ef4444')
  }

  function clearCell() {
    pushHistory(grid, formulas)
    const newGrid = grid.map((row, ri) => ri === sel.r ? row.map((v, ci) => ci === sel.c ? '' : v) : row)
    const newFormulas = { ...formulas }
    delete newFormulas[`${sel.r},${sel.c}`]
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, grid: newGrid, formulas: newFormulas } : sh))
  }

  function removeDuplicates() {
    pushHistory(grid, formulas)
    const seen = new Set()
    const deduped = grid.filter(row => {
      const k = JSON.stringify(row)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    const removed = grid.length - deduped.length
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, grid: deduped } : sh))
    notify(`${removed} doublon(s) supprimé(s)`)
  }

  function sortByCol(ci, dir) {
    pushHistory(grid, formulas)
    const sorted = [...grid].sort((a, b) => {
      const va = a[ci], vb = b[ci]
      if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va
      return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    setSheets(s => s.map((sh, i) => i === activeSheet ? { ...sh, grid: sorted } : sh))
  }

  // ── Copier / Coller ──
  function copyCell() {
    const val = rawVal(sel.r, sel.c)
    setCopiedCell({ ...sel })
    setClipboard(val)
    notify(isFr ? '📋 Copié' : '📋 Copied')
  }

  function pasteCell() {
    if (clipboard === null) return
    setCell(sel.r, sel.c, String(clipboard))
    notify(isFr ? '📋 Collé' : '📋 Pasted')
  }

  function cutCell() {
    copyCell()
    clearCell()
  }

  // ── Feuilles ──
  function addSheet() {
    const name = `Feuil${sheets.length + 1}`
    setSheets(s => [...s, { id: Date.now(), name, grid: [['', '', ''], ['', '', ''], ['', '', '']], formulas: {}, colWidths: {} }])
    setActiveSheet(sheets.length)
  }

  function deleteSheet(idx) {
    if (sheets.length === 1) return
    setSheets(s => s.filter((_,i)=>i!==idx))
    setActiveSheet(Math.max(0, idx - 1))
  }

  function renameSheet(idx) {
    const name = prompt(isFr ? 'Nom de la feuille :' : 'Sheet name:', sheets[idx].name)
    if (name) setSheets(s => s.map((sh, i) => i === idx ? { ...sh, name } : sh))
  }

  // ── Import / Export ──
  function importFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' })
      const newSheets = wb.SheetNames.map(name => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 })
        return { id: Date.now() + Math.random(), name: name.slice(0,20), grid: rows.map(r => [...r]), formulas: {}, colWidths: {} }
      }).filter(s => s.grid.length > 0)
      setSheets(s => [...s, ...newSheets])
      setActiveSheet(sheets.length)
      addLog?.(`📊 ${file.name} importé`, 'success', 'excel')
      notify(`${file.name} importé`)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  function exportXLSX() {
    const wb = XLSX.utils.book_new()
    sheets.forEach(sh => {
      const ws = XLSX.utils.aoa_to_sheet(sh.grid)
      XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0,31))
    })
    XLSX.writeFile(wb, 'aria-excel.xlsx')
    addLog?.('📥 Export XLSX', 'success', 'excel')
    notify('Exporté !')
  }

  // ── IA ──
  async function analyzeWithAI() {
    if (!aiRequest.trim()) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const headers = grid[0] || []
      const sample = grid.slice(0, 15)
      const prompt = isFr
        ? `Expert Excel et analyste de données. Grille de données:\nEn-têtes: ${JSON.stringify(headers)}\nDonnées (${grid.length} lignes): ${JSON.stringify(sample)}\n\nDemande: ${aiRequest}\n\nRéponds de façon claire et structurée. Si une formule Excel est demandée, donne la formule exacte avec explication détaillée. Les formules disponibles: SOMME, MOYENNE, MAX, MIN, NB, NBVAL, SI, SIERREUR, RECHERCHEV, INDEX, EQUIV, NB.SI, SOMME.SI, RANG, GRANDE.VALEUR, CONCATENER, MAJUSCULE, MINUSCULE, NBCAR, GAUCHE, DROITE, ARRONDI, ABS, RACINE, ECARTYPE, MEDIANE, AUJOURDHUI.`
        : `Excel expert and data analyst. Data grid:\nHeaders: ${JSON.stringify(headers)}\nData (${grid.length} rows): ${JSON.stringify(sample)}\n\nRequest: ${aiRequest}\n\nRespond clearly. If an Excel formula is requested, give the exact formula with detailed explanation.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
      })
      const data = await response.json()
      setAiResult(data.content?.find(c => c.type === 'text')?.text || '')
    } catch { setAiResult(isFr ? 'Erreur IA' : 'AI error') }
    setAiLoading(false)
  }

  // ── Clavier ──
  useEffect(() => {
    function onKey(e) {
      if (editingCell) {
        if (e.key === 'Escape') { setEditingCell(null); return }
        if (e.key === 'Enter') { e.preventDefault(); commitEdit(); setSel(c => ({ ...c, r: Math.min(c.r + 1, numRows - 1) })); return }
        if (e.key === 'Tab') { e.preventDefault(); commitEdit(); setSel(c => ({ ...c, c: Math.min(c.c + 1, numCols - 1) })); return }
        return
      }
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'z') { e.preventDefault(); undo(); return }
      if (ctrl && e.key === 'y') { e.preventDefault(); redo(); return }
      if (ctrl && e.key === 'c') { e.preventDefault(); copyCell(); return }
      if (ctrl && e.key === 'v') { e.preventDefault(); pasteCell(); return }
      if (ctrl && e.key === 'x') { e.preventDefault(); cutCell(); return }
      if (ctrl && e.key === 'a') { e.preventDefault(); setRange({ r1:0,c1:0,r2:numRows-1,c2:numCols-1 }); return }
      if (e.key === 'Delete' || e.key === 'Backspace') { clearCell(); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); setSel(c => ({ ...c, c: Math.min(c.c+1,numCols-1) })); setRange(null); return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setSel(c => ({ ...c, c: Math.max(c.c-1,0) })); setRange(null); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(c => ({ ...c, r: Math.min(c.r+1,numRows-1) })); setRange(null); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel(c => ({ ...c, r: Math.max(c.r-1,0) })); setRange(null); return }
      if (e.key === 'Tab') { e.preventDefault(); setSel(c => ({ ...c, c: Math.min(c.c+1,numCols-1) })); return }
      if (e.key === 'Enter') { e.preventDefault(); setSel(c => ({ ...c, r: Math.min(c.r+1,numRows-1) })); return }
      if (e.key === 'F2') { setEditingCell({...sel}); setEditValue(String(rawVal(sel.r,sel.c))); return }
      // Frappe directe → commence édition
      if (e.key.length === 1 && !ctrl) {
        setEditingCell({ ...sel })
        setEditValue(e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingCell, sel, numRows, numCols, clipboard, history, historyIdx])

  // Fermer menu contextuel
  useEffect(() => {
    function onClick() { setContextMenu(null) }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])

  // ── Style cellule ──
  function getCellBg(r, c) {
    const isActive = sel.r === r && sel.c === c
    const inRange = range && r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2
    const isCopied = copiedCell && copiedCell.r === r && copiedCell.c === c

    if (isActive) return 'rgba(100,112,241,0.12)'
    if (inRange) return 'rgba(100,112,241,0.08)'
    if (isCopied) return 'rgba(16,185,129,0.08)'
    return r % 2 === 0 ? 'var(--surface)' : '#0d0e1a'
  }

  function getCondStyle(r, c) {
    const val = displayVal(r, c)
    for (const rule of condRules) {
      if (rule.col !== c) continue
      const n = Number(val)
      let match = false
      if (rule.condition === 'gt' && n > Number(rule.value)) match = true
      if (rule.condition === 'lt' && n < Number(rule.value)) match = true
      if (rule.condition === 'eq' && String(val) === String(rule.value)) match = true
      if (rule.condition === 'contains' && String(val).toLowerCase().includes(rule.value.toLowerCase())) match = true
      if (match) return { color: rule.color, background: rule.bg, fontWeight: 700 }
    }
    return {}
  }

  // ── Données pour graphique ──
  const chartData = (() => {
    if (grid.length < 2) return []
    const headers = grid[0]
    return grid.slice(1).map(row => {
      const obj = {}
      headers.forEach((h, i) => { obj[String(h)] = row[i] })
      return obj
    })
  })()
  const chartHeaders = grid[0] || []
  const numericChartCols = chartHeaders.filter((_, i) => grid.slice(1).some(r => typeof r[i] === 'number' || !isNaN(Number(r[i]))))
  const xKey = String(chartHeaders[0] || '')

  // ── Totaux ──
  const colTotals = Array(numCols).fill(0).map((_, c) => {
    const vals = grid.map(r => Number(r[c])).filter(v => !isNaN(v) && v !== 0)
    return vals.length > 1 ? vals.reduce((a,b)=>a+b,0) : null
  })
  const hasTotal = colTotals.some(v => v !== null)

  const fileRef = useRef()

  return (
    <div
      style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 60px)', background:'var(--bg)', userSelect:'none' }}
      onMouseUp={() => setIsDragging(false)}
    >
      {/* ── RIBBON ── */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'5px 10px', display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={importFile} />

        <RibbonGroup label={isFr?'Fichier':'File'}>
          <RibbonBtn icon="📂" label={isFr?'Ouvrir':'Open'} onClick={()=>fileRef.current?.click()} />
          <RibbonBtn icon="💾" label={isFr?'Exporter':'Export'} onClick={exportXLSX} />
        </RibbonGroup>

        <RibbonGroup label={isFr?'Édition':'Edit'}>
          <RibbonBtn icon="↩" label="Ctrl+Z" onClick={undo} disabled={historyIdx<=0} />
          <RibbonBtn icon="↪" label="Ctrl+Y" onClick={redo} disabled={historyIdx>=history.length-1} />
          <RibbonBtn icon="✂" label="Couper" onClick={cutCell} />
          <RibbonBtn icon="📋" label="Copier" onClick={copyCell} />
          <RibbonBtn icon="📌" label="Coller" onClick={pasteCell} />
        </RibbonGroup>

        <RibbonGroup label={isFr?'Insertion':'Insert'}>
          <RibbonBtn icon="＋" label={isFr?'Ligne':'Row'} onClick={addRow} />
          <RibbonBtn icon="＋" label={isFr?'Colonne':'Col'} onClick={addCol} />
        </RibbonGroup>

        <RibbonGroup label="Données">
          <RibbonBtn icon="🔼" label="A→Z" onClick={()=>sortByCol(sel.c,'asc')} />
          <RibbonBtn icon="🔽" label="Z→A" onClick={()=>sortByCol(sel.c,'desc')} />
          <RibbonBtn icon="🔢" label={isFr?'Doublons':'Duplicates'} onClick={removeDuplicates} />
          <RibbonBtn icon="🎨" label={isFr?'Mise en forme':'Format'} onClick={()=>setShowCondModal(true)} />
        </RibbonGroup>

        {/* Onglets vue */}
        <div style={{marginLeft:'auto', display:'flex', gap:3}}>
          {[{id:'sheet',icon:'📊'},{id:'chart',icon:'📈'},{id:'ai',icon:'🤖'}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
              padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:15,
              background: activeTab===t.id ? 'rgba(100,112,241,0.2)' : 'transparent',
              color: activeTab===t.id ? '#a5b8fc' : 'var(--muted)',
              transition:'all 0.15s'
            }}>{t.icon}</button>
          ))}
        </div>
      </div>

      {/* ── BARRE DE FORMULE ── */}
      <div style={{ background:'#0d0e1a', borderBottom:'1px solid var(--border)', padding:'3px 8px', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ minWidth:54, padding:'3px 8px', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:4, fontSize:12, fontWeight:700, color:'#6470f1', textAlign:'center', letterSpacing:'0.05em' }}>
          {colLetter(sel.c)}{sel.r+1}
        </div>
        <span style={{fontSize:13, color:'var(--muted2)', fontStyle:'italic', fontFamily:'serif'}}>fx</span>
        <span style={{width:1, height:16, background:'var(--border2)'}}/>
        <input
          value={formulaBar}
          onChange={e=>setFormulaBar(e.target.value)}
          onKeyDown={e=>{
            if(e.key==='Enter'){setCell(sel.r,sel.c,formulaBar);e.target.blur()}
            if(e.key==='Escape')e.target.blur()
          }}
          onFocus={()=>setFormulaBar(String(rawVal(sel.r,sel.c)))}
          style={{ flex:1, padding:'3px 8px', border:'none', background:'transparent', color:'var(--text)', fontSize:12, outline:'none', fontFamily:'monospace' }}
          placeholder={isFr?'Valeur ou =FORMULE(...)':'Value or =FORMULA(...)'}
        />
      </div>

      {/* ── VUE FEUILLE ── */}
      {activeTab==='sheet' && (
        <div ref={tableRef} style={{flex:1, overflow:'auto', cursor:'cell'}}
          onContextMenu={e=>{e.preventDefault();setContextMenu({x:e.clientX,y:e.clientY})}}
        >
          <table style={{borderCollapse:'collapse', fontSize:12, tableLayout:'fixed', minWidth:'100%', position:'relative'}}>
            {/* En-têtes colonnes A B C ... */}
            <thead style={{position:'sticky', top:0, zIndex:10}}>
              <tr>
                {/* Coin supérieur gauche */}
                <th style={{width:40, minWidth:40, background:'#111219', border:'1px solid #1e2035', padding:'4px'}}/>
                {Array(numCols).fill(0).map((_,ci)=>(
                  <th key={ci}
                    style={{
                      minWidth: sheet.colWidths?.[ci]||90, background: sel.c===ci ? '#1a1d35' : '#111219',
                      border:'1px solid #1e2035', padding:'3px 6px', fontWeight:700, fontSize:10,
                      color: sel.c===ci ? '#a5b8fc' : '#6b7280', textAlign:'center', cursor:'pointer',
                      position:'relative', letterSpacing:'0.08em'
                    }}
                    onClick={()=>setSel(s=>({...s,c:ci}))}
                    onDoubleClick={()=>deleteCol(ci)}
                    title={isFr?'Clic: sélectionner · Double-clic: supprimer':'Click: select · Double-click: delete'}
                  >
                    {colLetter(ci)}
                    <span style={{position:'absolute',right:0,top:0,bottom:0,width:3,cursor:'col-resize',background:'transparent'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#6470f1'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    />
                  </th>
                ))}
                <th style={{width:28, background:'#111219', border:'1px solid #1e2035'}}/>
              </tr>
            </thead>
            <tbody>
              {grid.map((row, ri)=>(
                <tr key={ri}
                  style={{background: sel.r===ri ? 'rgba(100,112,241,0.04)' : 'transparent'}}
                >
                  {/* Numéro ligne */}
                  <td
                    style={{
                      background: sel.r===ri ? '#1a1d35' : '#111219',
                      border:'1px solid #1e2035', padding:'2px 6px',
                      textAlign:'center', fontSize:10, fontWeight:700,
                      color: sel.r===ri ? '#a5b8fc' : '#4b5268',
                      userSelect:'none', cursor:'pointer', minWidth:40
                    }}
                    onClick={()=>{setSel(s=>({...s,r:ri})); setRange({r1:ri,c1:0,r2:ri,c2:numCols-1})}}
                    onDoubleClick={()=>deleteRow(ri)}
                    title={isFr?'Clic: sélectionner · Double-clic: supprimer':'Click: select · Double-click: delete'}
                  >
                    {ri+1}
                  </td>

                  {/* Cellules */}
                  {Array(numCols).fill(0).map((_,ci)=>{
                    const isActive = sel.r===ri && sel.c===ci
                    const inRange = range && ri>=range.r1 && ri<=range.r2 && ci>=range.c1 && ci<=range.c2
                    const isCopied = copiedCell && copiedCell.r===ri && copiedCell.c===ci
                    const isEditing = editingCell?.r===ri && editingCell?.c===ci
                    const condStyle = getCondStyle(ri,ci)
                    const val = displayVal(ri,ci)
                    const isNum = typeof val==='number' || (!isNaN(Number(val)) && val!=='')

                    return (
                      <td key={ci}
                        style={{
                          border: isActive ? '2px solid #6470f1' : '1px solid #1e2035',
                          padding:0, position:'relative', cursor:'cell',
                          background: condStyle.background || getCellBg(ri,ci),
                          outline: isCopied ? '1px dashed #10b981' : 'none',
                          minWidth: sheet.colWidths?.[ci]||90,
                          ...condStyle
                        }}
                        onMouseDown={e=>{
                          e.preventDefault()
                          setSel({r:ri,c:ci})
                          setRange({r1:ri,c1:ci,r2:ri,c2:ci})
                          setDragStart({r:ri,c:ci})
                          setIsDragging(true)
                          setEditingCell(null)
                        }}
                        onMouseEnter={()=>{
                          if(isDragging && dragStart) {
                            setRange({r1:Math.min(dragStart.r,ri),c1:Math.min(dragStart.c,ci),r2:Math.max(dragStart.r,ri),c2:Math.max(dragStart.c,ci)})
                          }
                        }}
                        onDoubleClick={()=>{
                          setEditingCell({r:ri,c:ci})
                          setEditValue(String(rawVal(ri,ci)))
                        }}
                      >
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            autoFocus
                            value={editValue}
                            onChange={e=>setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={e=>{
                              if(e.key==='Enter'){e.preventDefault();commitEdit();setSel(c=>({...c,r:Math.min(c.r+1,numRows-1)}))}
                              if(e.key==='Tab'){e.preventDefault();commitEdit();setSel(c=>({...c,c:Math.min(c.c+1,numCols-1)}))}
                              if(e.key==='Escape'){setEditingCell(null)}
                            }}
                            style={{width:'100%',height:'100%',padding:'2px 6px',border:'none',outline:'none',background:'rgba(100,112,241,0.15)',color:'var(--text)',fontSize:12,fontFamily:'monospace'}}
                          />
                        ) : (
                          <div style={{
                            padding:'2px 6px', whiteSpace:'nowrap', overflow:'hidden',
                            textOverflow:'ellipsis', minHeight:22,
                            color: condStyle.color || (isNum ? '#818cf8' : 'var(--text)'),
                            fontWeight: condStyle.fontWeight || (isNum ? 600 : 400),
                            textAlign: isNum ? 'right' : 'left',
                            fontSize:12,
                          }}>
                            {isNum && val!=='' ? Number(val).toLocaleString(isFr?'fr-FR':'en-US') : String(val)}
                          </div>
                        )}
                      </td>
                    )
                  })}

                  {/* Bouton supprimer ligne */}
                  <td style={{border:'1px solid #1e2035', padding:'2px 4px', background:'#0a0b12', width:28}}>
                    <button onClick={()=>deleteRow(ri)} style={{
                      width:18,height:18,borderRadius:'50%',border:'none',cursor:'pointer',
                      background:'transparent',color:'#374151',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.2)';e.currentTarget.style.color='#ef4444'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#374151'}}
                    >✕</button>
                  </td>
                </tr>
              ))}

              {/* Ligne TOTAL */}
              {hasTotal && (
                <tr style={{borderTop:'2px solid rgba(100,112,241,0.3)'}}>
                  <td style={{background:'#0d0e1a',border:'1px solid #1e2035',padding:'4px 6px',textAlign:'center',fontSize:10,fontWeight:700,color:'#6470f1'}}>Σ</td>
                  {colTotals.map((total,ci)=>(
                    <td key={ci} style={{background:'rgba(100,112,241,0.06)',border:'1px solid #1e2035',padding:'3px 6px',textAlign:'right'}}>
                      {total!==null ? <span style={{fontSize:12,fontWeight:700,color:'#818cf8'}}>{total.toLocaleString(isFr?'fr-FR':'en-US')}</span> : ''}
                    </td>
                  ))}
                  <td style={{background:'#0a0b12',border:'1px solid #1e2035'}}/>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VUE GRAPHIQUE ── */}
      {activeTab==='chart' && (
        <div style={{flex:1,padding:16,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {[{id:'bar',icon:'📊',l:'Barres'},{id:'line',icon:'📈',l:'Lignes'},{id:'area',icon:'🏔️',l:'Aires'},{id:'pie',icon:'🥧',l:'Camembert'}].map(ct=>(
              <button key={ct.id} onClick={()=>setChartType(ct.id)} style={{
                padding:'5px 12px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
                background:chartType===ct.id?'rgba(100,112,241,0.2)':'var(--surface)',
                color:chartType===ct.id?'#a5b8fc':'var(--muted)'
              }}>{ct.icon} {ct.l}</button>
            ))}
          </div>
          <div style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:16}}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartType==='bar'?(
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey={xKey} tick={{fill:'var(--muted)',fontSize:11}}/>
                    <YAxis tick={{fill:'var(--muted)',fontSize:11}}/>
                    <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border2)',color:'var(--text)',borderRadius:8}}/>
                    <Legend wrapperStyle={{color:'var(--muted)'}}/>
                    {numericChartCols.slice(0,5).map((k,i)=><Bar key={k} dataKey={k} fill={COLORS[i%COLORS.length]} radius={[4,4,0,0]}/>)}
                  </BarChart>
                ):chartType==='line'?(
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey={xKey} tick={{fill:'var(--muted)',fontSize:11}}/>
                    <YAxis tick={{fill:'var(--muted)',fontSize:11}}/>
                    <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border2)',color:'var(--text)',borderRadius:8}}/>
                    <Legend wrapperStyle={{color:'var(--muted)'}}/>
                    {numericChartCols.slice(0,5).map((k,i)=><Line key={k} type="monotone" dataKey={k} stroke={COLORS[i%COLORS.length]} strokeWidth={2} dot={{r:3}}/>)}
                  </LineChart>
                ):chartType==='area'?(
                  <AreaChart data={chartData}>
                    <defs>{numericChartCols.slice(0,5).map((k,i)=><linearGradient key={k} id={`g${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[i%COLORS.length]} stopOpacity={0.3}/><stop offset="95%" stopColor={COLORS[i%COLORS.length]} stopOpacity={0}/></linearGradient>)}</defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey={xKey} tick={{fill:'var(--muted)',fontSize:11}}/>
                    <YAxis tick={{fill:'var(--muted)',fontSize:11}}/>
                    <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border2)',color:'var(--text)',borderRadius:8}}/>
                    <Legend wrapperStyle={{color:'var(--muted)'}}/>
                    {numericChartCols.slice(0,5).map((k,i)=><Area key={k} type="monotone" dataKey={k} stroke={COLORS[i%COLORS.length]} fill={`url(#g${i})`} strokeWidth={2}/>)}
                  </AreaChart>
                ):(
                  <PieChart>
                    <Pie data={chartData.map(d=>({name:d[xKey],value:Number(d[numericChartCols[0]])||0}))} cx="50%" cy="50%" innerRadius="30%" outerRadius="65%" paddingAngle={3} dataKey="value"
                      label={({cx,cy,midAngle,innerRadius,outerRadius,percent})=>{
                        const R=Math.PI/180,r=innerRadius+(outerRadius-innerRadius)*0.5
                        const x=cx+r*Math.cos(-midAngle*R),y=cy+r*Math.sin(-midAngle*R)
                        return percent>0.05?<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{(percent*100).toFixed(0)}%</text>:null
                      }} labelLine={false}>
                      {chartData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border2)',color:'var(--text)',borderRadius:8}}/>
                    <Legend wrapperStyle={{fontSize:12,color:'var(--muted)'}}/>
                  </PieChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--muted)',fontSize:13}}>
                {isFr?'Importez des données pour voir les graphiques':'Import data to see charts'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VUE IA ── */}
      {activeTab==='ai' && (
        <div style={{flex:1,padding:16,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:16,flex:1,display:'flex',flexDirection:'column',gap:12}}>
            <div style={{fontSize:13,color:'var(--muted)'}}>
              🤖 {isFr?'Posez une question sur vos données ou demandez une formule Excel exacte':'Ask a question about your data or request an exact Excel formula'}
            </div>
            <div style={{display:'flex',gap:8}}>
              <input className="input" value={aiRequest} onChange={e=>setAiRequest(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyzeWithAI()}
                placeholder={isFr?'Ex: Formule pour calculer la marge nette en %...':'Ex: Formula to calculate net margin in %...'} />
              <button className="btn-primary" onClick={analyzeWithAI} disabled={aiLoading||!aiRequest.trim()} style={{whiteSpace:'nowrap'}}>
                {aiLoading?'⏳':(isFr?'Envoyer':'Send')}
              </button>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {[
                isFr?'=RECHERCHEV pour cette donnée':'=VLOOKUP for this data',
                isFr?'Formule TVA 20%':'VAT 20% formula',
                isFr?'=SI avec plusieurs conditions':'=IF with multiple conditions',
                isFr?'Résumé des données':'Data summary',
                isFr?'Détecter les anomalies':'Detect anomalies',
              ].map(s=>(
                <button key={s} onClick={()=>setAiRequest(s)} style={{padding:'4px 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--muted)',fontSize:11,cursor:'pointer'}}>{s}</button>
              ))}
            </div>
            {aiResult && (
              <div style={{flex:1,overflowY:'auto',background:'rgba(100,112,241,0.05)',border:'1px solid rgba(100,112,241,0.2)',borderRadius:10,padding:14,fontSize:13,color:'var(--text)',lineHeight:1.8,whiteSpace:'pre-wrap'}}>
                {aiResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ONGLETS FEUILLES ── */}
      <div style={{background:'#0a0b12',borderTop:'1px solid var(--border)',padding:'0 8px',display:'flex',gap:0,alignItems:'flex-end',height:32}}>
        {sheets.map((sh,i)=>(
          <div key={sh.id}
            style={{
              padding:'4px 14px',cursor:'pointer',fontSize:12,fontWeight:activeSheet===i?600:400,
              color:activeSheet===i?'#6470f1':'var(--muted)',
              background:activeSheet===i?'var(--surface)':'transparent',
              borderRadius:'6px 6px 0 0',border:activeSheet===i?'1px solid var(--border2)':'1px solid transparent',
              borderBottom:'none',display:'flex',alignItems:'center',gap:6,
              transition:'all 0.15s'
            }}
            onClick={()=>setActiveSheet(i)}
            onDoubleClick={()=>renameSheet(i)}
            title={isFr?'Double-clic pour renommer':'Double-click to rename'}
          >
            {sh.name}
            {sheets.length>1&&<span onClick={e=>{e.stopPropagation();deleteSheet(i)}} style={{fontSize:9,color:'var(--muted2)',cursor:'pointer',opacity:0.6}}
              onMouseEnter={e=>{e.currentTarget.style.color='#ef4444';e.currentTarget.style.opacity='1'}}
              onMouseLeave={e=>{e.currentTarget.style.color='var(--muted2)';e.currentTarget.style.opacity='0.6'}}
            >✕</span>}
          </div>
        ))}
        <button onClick={addSheet} style={{padding:'4px 10px',background:'transparent',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:16,marginLeft:4}}>+</button>
      </div>

      {/* ── MENU CONTEXTUEL ── */}
      {contextMenu && (
        <div style={{position:'fixed',top:contextMenu.y,left:contextMenu.x,background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:10,padding:'4px 0',zIndex:300,minWidth:160,boxShadow:'0 8px 24px rgba(0,0,0,0.4)'}}>
          {[
            {label:isFr?'📋 Copier':'📋 Copy',action:copyCell},
            {label:isFr?'✂️ Couper':'✂️ Cut',action:cutCell},
            {label:isFr?'📌 Coller':'📌 Paste',action:pasteCell},
            null,
            {label:isFr?'🗑️ Supprimer ligne':'🗑️ Delete row',action:()=>deleteRow(sel.r)},
            {label:isFr?'🗑️ Supprimer colonne':'🗑️ Delete column',action:()=>deleteCol(sel.c)},
            null,
            {label:isFr?'🔼 Trier A→Z':'🔼 Sort A→Z',action:()=>sortByCol(sel.c,'asc')},
            {label:isFr?'🔽 Trier Z→A':'🔽 Sort Z→A',action:()=>sortByCol(sel.c,'desc')},
          ].map((item,i)=>item===null?(
            <div key={i} style={{height:1,background:'var(--border)',margin:'3px 0'}}/>
          ):(
            <button key={i} onClick={()=>{item.action();setContextMenu(null)}} style={{
              display:'block',width:'100%',padding:'7px 14px',background:'none',border:'none',cursor:'pointer',
              textAlign:'left',fontSize:12,color:'var(--text)'
            }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(100,112,241,0.1)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}
            >{item.label}</button>
          ))}
        </div>
      )}

      {/* ── MODAL MISE EN FORME CONDITIONNELLE ── */}
      {showCondModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:16,padding:24,width:420,display:'flex',flexDirection:'column',gap:14}}>
            <h3 style={{margin:0,color:'var(--text)',fontSize:15,fontWeight:700}}>🎨 {isFr?'Mise en forme conditionnelle':'Conditional formatting'}</h3>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',gap:8}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>{isFr?'Colonne (numéro)':'Column (number)'}</label>
                  <input type="number" min={0} max={numCols-1} value={newRule.col} onChange={e=>setNewRule(r=>({...r,col:parseInt(e.target.value)||0}))}
                    style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none'}}/>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>{isFr?'Condition':'Condition'}</label>
                  <select value={newRule.condition} onChange={e=>setNewRule(r=>({...r,condition:e.target.value}))}
                    style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none'}}>
                    <option value="gt">{isFr?'Supérieur à':'Greater than'}</option>
                    <option value="lt">{isFr?'Inférieur à':'Less than'}</option>
                    <option value="eq">{isFr?'Égal à':'Equal to'}</option>
                    <option value="contains">{isFr?'Contient':'Contains'}</option>
                  </select>
                </div>
              </div>
              <input value={newRule.value} onChange={e=>setNewRule(r=>({...r,value:e.target.value}))} placeholder={isFr?'Valeur...':'Value...'}
                style={{padding:'7px 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none'}}/>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:12,color:'var(--muted)'}}>{isFr?'Couleur :':'Color:'}</span>
                {[{c:'#ef4444',bg:'rgba(239,68,68,0.12)',l:'🔴'},{c:'#f59e0b',bg:'rgba(245,158,11,0.12)',l:'🟡'},{c:'#10b981',bg:'rgba(16,185,129,0.12)',l:'🟢'},{c:'#6470f1',bg:'rgba(100,112,241,0.12)',l:'🔵'},{c:'#ec4899',bg:'rgba(236,72,153,0.12)',l:'🩷'}].map(clr=>(
                  <button key={clr.c} onClick={()=>setNewRule(r=>({...r,color:clr.c,bg:clr.bg}))} style={{
                    fontSize:18,background:newRule.color===clr.c?clr.bg:'none',
                    border:newRule.color===clr.c?`2px solid ${clr.c}`:'2px solid transparent',
                    borderRadius:6,cursor:'pointer',padding:4
                  }}>{clr.l}</button>
                ))}
              </div>
            </div>
            {condRules.length>0&&(
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <span style={{fontSize:11,color:'var(--muted)'}}>{isFr?'Règles actives :':'Active rules:'}</span>
                {condRules.map((r,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 10px',borderRadius:8,background:'var(--surface2)',border:'1px solid var(--border)'}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:r.color,flexShrink:0}}/>
                    <span style={{fontSize:11,color:'var(--text)',flex:1}}>{isFr?'Colonne':'Col'} {colLetter(r.col)} {r.condition} {r.value}</span>
                    <button onClick={()=>setCondRules(rules=>rules.filter((_,ri)=>ri!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:12}}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{display:'flex',gap:8}}>
              <button className="btn-primary" onClick={()=>{if(newRule.value)setCondRules(r=>[...r,{...newRule}])}}>
                {isFr?'Ajouter règle':'Add rule'}
              </button>
              <button className="btn-secondary" onClick={()=>setShowCondModal(false)}>{isFr?'Fermer':'Close'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATION TOAST ── */}
      {notification && (
        <div style={{
          position:'fixed',bottom:50,right:20,padding:'8px 16px',borderRadius:10,
          background:'var(--surface)',border:`1px solid ${notification.color}`,
          color:notification.color,fontSize:12,fontWeight:600,
          boxShadow:'0 4px 16px rgba(0,0,0,0.3)',zIndex:400,
          animation:'slideIn 0.2s ease'
        }}>
          {notification.msg}
        </div>
      )}

      <style>{`
        @keyframes slideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>
    </div>
  )
}

// ── Composants Ribbon ─────────────────────────────────────────
function RibbonGroup({ label, children }) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,paddingRight:10,borderRight:'1px solid var(--border2)'}}>
      <div style={{display:'flex',gap:3}}>{children}</div>
      <span style={{fontSize:9,color:'var(--muted2)',letterSpacing:'0.05em',textTransform:'uppercase'}}>{label}</span>
    </div>
  )
}

function RibbonBtn({ icon, label, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} style={{
      padding:'4px 7px',borderRadius:5,border:'1px solid transparent',
      background:'transparent',cursor:disabled?'not-allowed':'pointer',
      fontSize:14,opacity:disabled?0.35:1,display:'flex',flexDirection:'column',
      alignItems:'center',gap:1,transition:'all 0.12s',color:'var(--text)',minWidth:32,
    }}
    onMouseEnter={e=>{if(!disabled){e.currentTarget.style.background='rgba(100,112,241,0.12)';e.currentTarget.style.borderColor='rgba(100,112,241,0.3)'}}}
    onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='transparent'}}
    >
      <span>{icon}</span>
      <span style={{fontSize:8,color:'var(--muted2)',whiteSpace:'nowrap'}}>{label}</span>
    </button>
  )
}
