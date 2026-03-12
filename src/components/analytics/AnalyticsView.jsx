import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { callClaude } from '../../lib/claude'

const MONTHLY_DATA = [
  { month: 'Jan', emails: 45, tasks: 23, revenue: 45000, expenses: 32000 },
  { month: 'Fév', emails: 52, tasks: 31, revenue: 52000, expenses: 35000 },
  { month: 'Mar', emails: 48, tasks: 28, revenue: 48000, expenses: 31000 },
  { month: 'Avr', emails: 61, tasks: 35, revenue: 61000, expenses: 38000 },
  { month: 'Mai', emails: 55, tasks: 29, revenue: 55000, expenses: 36000 },
  { month: 'Jun', emails: 67, tasks: 42, revenue: 67000, expenses: 41000 },
]

const PIE_DATA = [
  { name: 'Emails', value: 35, color: '#6470f1' },
  { name: 'Tâches', value: 28, color: '#10b981' },
  { name: 'Réunions', value: 20, color: '#f59e0b' },
  { name: 'Admin', value: 17, color: '#ec4899' },
]

const TS = {
  contentStyle: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, color: '#1a1d2e', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
}

// Custom donut label
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return percent > 0.08 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {(percent * 100).toFixed(0)}%
    </text>
  ) : null
}

export default function AnalyticsView({ lang }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [aiInsight, setAiInsight] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const isFr = lang === 'fr'

  async function generateInsights() {
    setAiLoading(true)
    try {
      const result = await callClaude(
        (isFr ? 'Analyse ces données et génère 5 insights actionnables pour améliorer la productivité:\n' : 'Analyze this data and generate 5 actionable insights to improve productivity:\n') + JSON.stringify(MONTHLY_DATA)
      )
      setAiInsight(result)
    } catch { setAiInsight(isFr ? 'Erreur' : 'Error') }
    setAiLoading(false)
  }

  const kpis = [
    { label: isFr ? 'CA Total' : 'Total Revenue', value: '328 000€', trend: '+12%', up: true, color: '#10b981' },
    { label: isFr ? 'Emails traités' : 'Emails processed', value: '328', trend: '+8%', up: true, color: '#6470f1' },
    { label: isFr ? 'Tâches terminées' : 'Tasks done', value: '188', trend: '+15%', up: true, color: '#f59e0b' },
    { label: isFr ? 'Dépenses' : 'Expenses', value: '213 000€', trend: '-3%', up: false, color: '#ec4899' },
  ]

  const tabs = [
    ['overview', '📊 ' + (isFr ? 'Vue d\'ensemble' : 'Overview')],
    ['finance', '💰 ' + (isFr ? 'Finances' : 'Finance')],
    ['productivity', '⚡ ' + (isFr ? 'Productivité' : 'Productivity')],
    ['ai', '🤖 IA'],
  ]

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontFamily: 'Outfit', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: k.up ? '#10b981' : '#ef4444' }}>
              {k.up ? '↑' : '↓'} {k.trend}
            </div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 4 }}>
        {tabs.map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: activeTab === t ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.04)',
            color: activeTab === t ? '#a5b8fc' : 'rgba(255,255,255,0.5)',
          }}>{l}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* DONUT CHART - modernisé */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 16 }}>
                {isFr ? 'Répartition du temps' : 'Time breakdown'}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    paddingAngle={3} dataKey="value" labelLine={false} label={renderCustomLabel}>
                    {PIE_DATA.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke={entry.color + '40'} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TS.contentStyle} cursor={false} formatter={(v) => v + '%'} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                {PIE_DATA.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 16 }}>
                {isFr ? 'Activité mensuelle' : 'Monthly activity'}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MONTHLY_DATA} barSize={12} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={TS.contentStyle} cursor={TS.cursor} />
                  <Bar dataKey="emails" fill="#6470f1" radius={[4, 4, 0, 0]} name="Emails" />
                  <Bar dataKey="tasks" fill="#10b981" radius={[4, 4, 0, 0]} name={isFr ? 'Tâches' : 'Tasks'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* FINANCE */}
      {activeTab === 'finance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 16 }}>
              {isFr ? 'Revenus vs Dépenses' : 'Revenue vs Expenses'}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={MONTHLY_DATA}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => (v/1000) + 'k'} />
                <Tooltip contentStyle={TS.contentStyle} cursor={TS.cursor} formatter={v => v.toLocaleString('fr-FR') + '€'} />
                <Legend wrapperStyle={{ color: 'var(--muted)', fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" name={isFr ? 'CA' : 'Revenue'} stroke="#10b981" strokeWidth={2} fill="url(#colorRev)" dot={{ r: 4, fill: '#10b981' }} />
                <Area type="monotone" dataKey="expenses" name={isFr ? 'Dépenses' : 'Expenses'} stroke="#ef4444" strokeWidth={2} fill="url(#colorExp)" dot={{ r: 4, fill: '#ef4444' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Donut catégories dépenses */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 16 }}>
              {isFr ? 'Répartition dépenses par catégorie' : 'Expenses by category'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={[
                    { name: 'IT', value: 30, color: '#6470f1' },
                    { name: isFr ? 'Bureau' : 'Office', value: 25, color: '#10b981' },
                    { name: isFr ? 'Transport' : 'Transport', value: 20, color: '#f59e0b' },
                    { name: isFr ? 'Marketing' : 'Marketing', value: 15, color: '#ec4899' },
                    { name: isFr ? 'Autre' : 'Other', value: 10, color: '#94a3b8' },
                  ]} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" labelLine={false} label={renderCustomLabel}>
                    {[{ color: '#6470f1' }, { color: '#10b981' }, { color: '#f59e0b' }, { color: '#ec4899' }, { color: '#94a3b8' }].map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TS.contentStyle} formatter={v => v + '%'} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'IT', pct: 30, color: '#6470f1', amount: '63 900€' },
                  { label: isFr ? 'Bureau' : 'Office', pct: 25, color: '#10b981', amount: '53 250€' },
                  { label: 'Transport', pct: 20, color: '#f59e0b', amount: '42 600€' },
                  { label: 'Marketing', pct: 15, color: '#ec4899', amount: '31 950€' },
                  { label: isFr ? 'Autre' : 'Other', pct: 10, color: '#94a3b8', amount: '21 300€' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ width: item.pct + '%', height: '100%', background: item.color, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 55 }}>{item.amount}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.color, minWidth: 28 }}>{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTIVITY */}
      {activeTab === 'productivity' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 16 }}>
            {isFr ? 'Évolution productivité' : 'Productivity trend'}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={MONTHLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TS.contentStyle} cursor={TS.cursor} />
              <Legend wrapperStyle={{ color: 'var(--muted)', fontSize: 12 }} />
              <Line type="monotone" dataKey="emails" name="Emails" stroke="#6470f1" strokeWidth={2.5} dot={{ r: 5, fill: '#6470f1', strokeWidth: 2, stroke: '#1a1d2e' }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="tasks" name={isFr ? 'Tâches' : 'Tasks'} stroke="#10b981" strokeWidth={2.5} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#1a1d2e' }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI INSIGHTS */}
      {activeTab === 'ai' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, minHeight: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>🤖 {isFr ? 'Analyse IA' : 'AI Analysis'}</div>
            <button className="btn-primary" onClick={generateInsights} disabled={aiLoading} style={{ fontSize: 12 }}>
              {aiLoading ? '⏳ ...' : (isFr ? 'Générer les insights' : 'Generate insights')}
            </button>
          </div>
          {aiInsight ? (
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{aiInsight}</div>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', paddingTop: 50 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <p style={{ fontSize: 13 }}>{isFr ? 'Cliquez pour générer une analyse IA de vos données' : 'Click to generate an AI analysis of your data'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
