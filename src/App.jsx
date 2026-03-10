import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useAppStore } from './hooks/useStore'
import { canAccess } from './lib/roles'

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

export default function App() {
  const { lang, setLang, user, setUser, notifications, setNotifications, logs, setLogs, addLog, addNotification } = useAppStore()
  const [section, setSection] = useState('dashboard')
  const [authLoading, setAuthLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Stats pour le dashboard
  const stats = {
    unreadEmails: 2,
    activeTasks: 4,
    todayMeetings: 2,
    pendingInvoices: 2,
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data: profile }) => {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: profile?.name || session.user.email?.split('@')[0] || 'Utilisateur',
            role: profile?.role || 'admin',
          })
        })
      }
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') setUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setSection('dashboard')
  }

  function navigate(newSection) {
    if (!user) return
    if (!canAccess(user.role, newSection)) {
      addNotification('Accès refusé', 'Vous n\'avez pas les droits pour accéder à cette section.', 'error')
      return
    }
    setSection(newSection)
    addLog('🧭 Navigation → ' + newSection, 'info', 'app')
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0b12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #6470f1, #a5b8fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, animation: 'pulseGlow 2s infinite' }}>A</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Chargement d'Aria...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onAuth={setUser} lang={lang} />
  }

  const unreadNotifs = notifications.filter(n => !n.read).length

  const sharedProps = { lang, user, addLog, addNotification }

  const renderSection = () => {
    switch (section) {
      case 'dashboard':    return <Dashboard {...sharedProps} stats={stats} onNavigate={navigate} />
      case 'emails':       return <EmailView {...sharedProps} />
      case 'calendar':     return <CalendarView {...sharedProps} />
      case 'tasks':        return <TasksView {...sharedProps} />
      case 'excel':        return <ExcelView {...sharedProps} />
      case 'accounting':   return <AccountingView {...sharedProps} />
      case 'hr':           return <HRView {...sharedProps} />
      case 'crm':          return <CRMView {...sharedProps} />
      case 'files':        return <FilesView {...sharedProps} />
      case 'analytics':    return <AnalyticsView lang={lang} />
      case 'logs':         return <LogsView logs={logs} setLogs={setLogs} lang={lang} />
      case 'settings':     return <SettingsView lang={lang} setLang={setLang} user={user} setUser={setUser} />
      case 'team':         return <TeamView lang={lang} user={user} />
      case 'notifications':return <NotificationsView lang={lang} notifications={notifications} setNotifications={setNotifications} />
      case 'ceo':          return <CEOView lang={lang} user={user} />
      default:             return <Dashboard {...sharedProps} stats={stats} onNavigate={navigate} />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0b12' }}>
      <Sidebar
        current={section}
        onNavigate={navigate}
        user={user}
        lang={lang}
        onLogout={handleLogout}
        notifCount={unreadNotifs}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          section={section}
          lang={lang}
          setLang={setLang}
          user={user}
          onSearch={setSearch}
          notifications={notifications}
        />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {renderSection()}
        </main>
      </div>
    </div>
  )
}
