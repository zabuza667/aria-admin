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

const TS = { background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }

export default function AnalyticsView({ lang }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [aiInsight, setAiInsight] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const isFr = lang === 'fr'

  async function generateInsights() {
    setAiLoading(true)
    try {
      const result = await callClaude(
        (isFr ? 'Analyse ces données et génère 5 insights actionnables pour améliorer la productivité administrative:\n' : 'Analyze this data and generate 5 actionable insights to improve administrative productivity:\n') + JSON.stringify(MONTHLY_DATA),
        '', { maxTokens: 700 }
      )
      setAiInsight(result)
    } catch { setAiInsight(isFr ? 'Erreur' : 'Error') }
    setAiLoading(false)
  }

  const tabs = [
    ['overview', isFr ? '📊 Vue d\'ensemble' : '📊 Overview'],
    ['finance', isFr ? '💰 Finances' : '💰 Finance'],
    ['productivity', isFr ? '⚡ Productivité' : '⚡ Productivity'],
    ['ai', '🤖 IA Insights'],
  ]

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: isFr ? '📧 Emails traités' : '📧 Emails processed', value: '328', trend: '+12%', up: true, color: '#6470f1' },
          { label: isFr ? '✅ Tâches complétées' : '✅ Tasks completed', value: '188', trend: '+8%', up: true, color: '#10b981' },
          { label: isFr ? '💰 CA total' : '💰 Total revenue', value: '328K€', trend: '+15%', up: true, color: '#f59e0b' },
          { label: isFr ? '⏱️ Temps réponse' : '⏱️ Response time', value: '2.4h', trend: '-18%', up: false, color: '#ec4899' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 26, fontFamily: 'Outfit', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: kpi.up ? '#10b981' : '#ef4444' }}>{kpi.trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {tabs.map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: activeTab === t ? 'rgba(100,112,241,0.2)' : 'rgba(255,255,255,0.04)',
            color: activeTab === t ? '#a5b8fc' : 'rgba(255,255,255,0.5)',
          }}>{l}</button>
        ))}
        {activeTab === 'ai' && (
          <button className="btn-primary" onClick={generateInsights} disabled={aiLoading} style={{ marginLeft: 'auto', fontSize: 12 }}>
            🤖 {aiLoading ? '...' : (isFr ? 'Générer insights' : 'Generate insights')}
          </button>
        )}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
              {isFr ? '📧 Emails & Tâches par mois' : '📧 Emails & Tasks per month'}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={MONTHLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <Tooltip contentStyle={TS} />
                <Legend />
                <Bar dataKey="emails" fill="#6470f1" radius={[3,3,0,0]} name="Emails" />
                <Bar dataKey="tasks" fill="#10b981" radius={[3,3,0,0]} name={isFr ? 'Tâches' : 'Tasks'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
              {isFr ? '⏱️ Répartition du temps' : '⏱️ Time distribution'}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => name + ' ' + (percent*100).toFixed(0) + '%'} labelLine={false} fontSize={11}>
                  {PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={TS} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
            {isFr ? '💰 Revenus vs Dépenses' : '💰 Revenue vs Expenses'}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={MONTHLY_DATA}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <Tooltip contentStyle={TS} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#gRev)" name={isFr ? 'Revenus' : 'Revenue'} strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#gExp)" name={isFr ? 'Dépenses' : 'Expenses'} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'productivity' && (
        <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
            {isFr ? '⚡ Tendance productivité' : '⚡ Productivity trend'}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={MONTHLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <Tooltip contentStyle={TS} />
              <Legend />
              <Line type="monotone" dataKey="tasks" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name={isFr ? 'Tâches' : 'Tasks'} />
              <Line type="monotone" dataKey="emails" stroke="#6470f1" strokeWidth={2} dot={{ r: 4 }} name="Emails" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'ai' && (
        <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, minHeight: 200 }}>
          {aiInsight ? (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{aiInsight}</div>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', paddingTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
              <p>{isFr ? 'Cliquez sur "Générer insights" pour une analyse IA' : 'Click "Generate insights" for AI analysis'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
