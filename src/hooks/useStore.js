import { useState, useEffect } from 'react'

// Hook localStorage persistant
export function useLS(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem('aria_' + key)
      return stored ? JSON.parse(stored) : defaultValue
    } catch { return defaultValue }
  })
  useEffect(() => {
    try { localStorage.setItem('aria_' + key, JSON.stringify(value)) } catch {}
  }, [key, value])
  return [value, setValue]
}

// Store global de l'app
export function useAppStore() {
  const [lang, setLang] = useLS('lang', 'fr')
  const [theme, setTheme] = useLS('theme', 'dark')
  const [user, setUser] = useLS('user', null)
  const [notifications, setNotifications] = useLS('notifications', [])
  const [logs, setLogs] = useLS('logs', [])

  const addLog = (message, type = 'info', section = '') => {
    const log = {
      id: Date.now(),
      message,
      type,
      section,
      timestamp: new Date().toISOString(),
    }
    setLogs(prev => [log, ...prev].slice(0, 200))
  }

  const addNotification = (title, message, type = 'info') => {
    const notif = {
      id: Date.now(),
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
    }
    setNotifications(prev => [notif, ...prev].slice(0, 50))
  }

  return {
    lang, setLang,
    theme, setTheme,
    user, setUser,
    notifications, setNotifications,
    logs, setLogs,
    addLog, addNotification,
  }
}
