import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { useAppStore } from './hooks/useStore'
import { canAccess, NAV_ITEMS } from './lib/roles'

import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import AuthScreen from './components/layout/AuthScreen'

import Dashboard from './components/dashboard/Dashboard'
import EmailView from './components/email/EmailView'
import CalendarView from './components/calendar/CalendarView'
import TasksView from './components/tasks/TasksView'
import ExcelView from './components/excel/ExcelView'
import AccountingView from './components/accounting/AccountingView'
import HRView from './components/hr/HRView'
import CRMView from './components/crm/CRMView'
import FilesView from './components/files/FilesView'
import AnalyticsView from './components/analytics/AnalyticsView'
import LogsView from './components/logs/LogsView'
import SettingsView from './components/settings/SettingsView'
import TeamView from './components/team/TeamView'
import NotificationsView from './components/notifications/NotificationsView'
import CEOView from './components/ceo/CEOView'

const INACTIVITY_LIMIT = 30 * 60 * 1000 // 30 minutes

export default function App() {
  const { lang, setLang, user, setUser, notifications, setNotifications, logs, setLogs, addLog, addNotification, saveIndicator, triggerSave } = useAppStore()
  const [section, setSection] = useState(() => localStorage.getItem('aria_last_section') || 'dashboard')
  const [prevSection, setPrevSection] = useState('dashboard')
  const [authLoading, setAuthLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [briefingShownToday, setBriefingShownToday] = useState(() => {
    const today = new Date().toDateString()
    // Ne montrer le briefing qu'une fois par jour, pas au refresh
    return localStorage.getItem('briefing_seen_' + today) === '1' || 
           localStorage.getItem('aria_last_section') !== null
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const inactivityTimer = useRef(null)

  function handleRefresh() {
    setRefreshKey(k => k + 1)
  }
  const searchRef = useRef(null)
  const isFr = lang === 'fr'

  // Stats dynamiques temps réel
  const computeStats = useCallback(() => {
    try {
      const tasks = JSON.parse(localStorage.getItem('aria_tasks') || '[]')
      const invoices = JSON.parse(localStorage.getItem('aria_invoices') || '[]')
      const emails = JSON.parse(localStorage.getItem('aria_emails') || '[]')
      const events = JSON.parse(localStorage.getItem('aria_events') || '[]')
      const today = new Date().toDateString()
      return {
        unreadEmails: emails.filter(e => !e.read).length || 2,
        activeTasks: tasks.filter(t => t.status === 'inProgress' || t.status === 'todo').length || 4,
        todayMeetings: events.filter(e => new Date(e.date || e.start).toDateString() === today).length || 2,
        pendingInvoices: invoices.filter(i => i.status === 'pending' || i.status === 'overdue').length || 2,
      }
    } catch {
      return { unreadEmails: 2, activeTasks: 4, todayMeetings: 2, pendingInvoices: 2 }
    }
  }, [])

  const [stats, setStats] = useState(computeStats)

  // Mise à jour stats quand localStorage change (triggerSave)
  useEffect(() => {
    setStats(computeStats())
  }, [saveIndicator, section])

  // Auth
  useEffect(() => {
    async function loadUser(supabaseUser) {
      if (!supabaseUser) { setUser(null); setAuthLoading(false); return }
      try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', supabaseUser.id).single()
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: profile?.name || supabaseUser.email?.split('@')[0] || 'Utilisateur',
          role: profile?.role || 'admin',
          avatar: profile?.avatar || null,
        })
      } catch {
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.email?.split('@')[0] || 'Utilisateur',
          role: 'admin',
        })
      }
      setAuthLoading(false)
    }

    // Session existante au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUser(session?.user || null)
    })

    // Ecouter tous les changements auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUser(session?.user || null)
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setAuthLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Inactivity auto-logout
  const resetInactivity = useCallback(() => {
    clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(async () => {
      await supabase.auth.signOut()
      setUser(null)
      addNotification?.(isFr ? 'Session expirée' : 'Session expired', isFr ? 'Déconnecté après 30 min d\'inactivité.' : 'Logged out after 30 min of inactivity.', 'info')
    }, INACTIVITY_LIMIT)
  }, [isFr])

  useEffect(() => {
    if (!user) return
    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach(e => window.addEventListener(e, resetInactivity))
    resetInactivity()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivity))
      clearTimeout(inactivityTimer.current)
    }
  }, [user, resetInactivity])

  // Ctrl+K global search
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(s => !s)
        setTimeout(() => searchRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') setShowSearch(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Dark/light mode CSS
  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light')
    } else {
      document.body.classList.add('light')
    }
    document.body.style.colorScheme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setSection('dashboard')
  }

  function navigate(newSection) {
    if (!user) return
    if (!canAccess(user.role, newSection)) {
      addNotification(isFr ? 'Accès refusé' : 'Access denied', isFr ? 'Vous n\'avez pas les droits pour cette section.' : 'You don\'t have access to this section.', 'error')
      return
    }
    setSection(newSection)
    setAnimKey(k => k + 1)
    setShowSearch(false)
    addLog('🧭 Navigation → ' + newSection, 'info', 'app')
  }

  // Search navigation results
  const searchResults = searchQuery.length > 1
    ? NAV_ITEMS.filter(item =>
        (item.labelFr + item.labelEn + item.id).toLowerCase().includes(searchQuery.toLowerCase()) &&
        canAccess(user?.role, item.id)
      ).slice(0, 6)
    : []

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0b12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6470f1, #a5b8fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800 }}>A</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{isFr ? 'Chargement d\'Aria...' : 'Loading Aria...'}</div>
        </div>
      </div>
    )
  }

  if (!user) return <AuthScreen onAuth={setUser} lang={lang} />

  const unreadNotifs = notifications.filter(n => !n.read).length
  const sharedProps = { lang, user, addLog, addNotification, triggerSave }

  const dashboardProps = { ...sharedProps, stats, onNavigate: navigate, darkMode, setDarkMode, briefingShownToday, onBriefingShown: () => { const today = new Date().toDateString(); localStorage.setItem('briefing_seen_' + today, '1'); setBriefingShownToday(true) } }

  const renderSection = () => {
    switch (section) {
      case 'emails':        return <EmailView {...sharedProps} />
      case 'calendar':      return <CalendarView {...sharedProps} />
      case 'tasks':         return <TasksView {...sharedProps} />
      case 'excel':         return <ExcelView {...sharedProps} />
      case 'accounting':    return <AccountingView {...sharedProps} />
      case 'hr':            return <HRView {...sharedProps} />
      case 'crm':           return <CRMView {...sharedProps} />
      case 'files':         return <FilesView {...sharedProps} />
      case 'analytics':     return <AnalyticsView lang={lang} />
      case 'logs':          return <LogsView logs={logs} setLogs={setLogs} lang={lang} />
      case 'settings':      return <SettingsView lang={lang} setLang={setLang} user={user} setUser={setUser} />
      case 'team':          return <TeamView lang={lang} user={user} />
      case 'notifications': return <NotificationsView lang={lang} notifications={notifications} setNotifications={setNotifications} />
      case 'ceo':           return <CEOView lang={lang} user={user} />
      default:              return null
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: darkMode ? '#0a0b12' : '#f0f2f8', transition: 'background 0.3s' }}>

      {/* CTRL+K SEARCH */}
      {showSearch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120, zIndex: 999 }}
          onClick={() => setShowSearch(false)}>
          <div style={{ background: '#12141f', border: '1px solid rgba(100,112,241,0.3)', borderRadius: 16, width: 500, maxWidth: '90vw', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontSize: 16 }}>🔍</span>
              <input ref={searchRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={isFr ? 'Rechercher une section...' : 'Search a section...'}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: 15 }}
                autoFocus
              />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.07)', padding: '2px 6px', borderRadius: 4 }}>ESC</span>
            </div>
            {searchResults.length > 0 && (
              <div style={{ padding: 8 }}>
                {searchResults.map(item => (
                  <button key={item.id} onClick={() => navigate(item.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,112,241,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, color: 'white', fontWeight: 500 }}>{isFr ? item.labelFr : item.labelEn}</span>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.length > 1 && searchResults.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                {isFr ? 'Aucun résultat' : 'No results'}
              </div>
            )}
            {!searchQuery && (
              <div style={{ padding: '8px 16px 12px', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                {isFr ? 'Tapez pour naviguer rapidement...' : 'Type to navigate quickly...'}
              </div>
            )}
          </div>
        </div>
      )}

      <Sidebar
        current={section}
        onNavigate={navigate}
        user={user}
        lang={lang}
        onLogout={handleLogout}
        notifCount={unreadNotifs}
        darkMode={darkMode}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          section={section}
          lang={lang}
          setLang={setLang}
          user={user}
          notifications={notifications}
          unreadNotifs={unreadNotifs}
          onOpenSearch={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50) }}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onRefresh={handleRefresh}
          onNavigate={navigate}
        />
        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>

          {/* Toast sauvegarde */}
          <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 999,
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
            borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8,
            backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(16,185,129,0.2)',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: saveIndicator ? 'translateY(0) scale(1)' : 'translateY(80px) scale(0.9)',
            opacity: saveIndicator ? 1 : 0,
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 16 }}>💾</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>
              {isFr ? 'Sauvegardé' : 'Saved'}
            </span>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          </div>

          {/* Dashboard toujours monté */}
          <div style={{ display: section === 'dashboard' ? 'block' : 'none' }}>
            <Dashboard {...dashboardProps} />
          </div>

          {/* Autres sections avec animation */}
          {section !== 'dashboard' && (
            <div key={animKey} style={{ animation: 'fadeSlideIn 0.25s cubic-bezier(0.22, 1, 0.36, 1)' }}>
              {renderSection()}
            </div>
          )}

          <style>{`
            @keyframes fadeSlideIn {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </main>
      </div>
    </div>
  )
}
