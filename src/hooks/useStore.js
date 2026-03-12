import { useState, useEffect, useCallback, useRef } from 'react'

// Hook localStorage persistant avec callback de sauvegarde
export function useLS(key, defaultValue, onSave) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem('aria_' + key)
      return stored ? JSON.parse(stored) : defaultValue
    } catch { return defaultValue }
  })

  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    try {
      localStorage.setItem('aria_' + key, JSON.stringify(value))
      onSave?.()
    } catch {}
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
  const [saveIndicator, setSaveIndicator] = useState(false)
  const saveTimer = useRef(null)

  const triggerSave = useCallback(() => {
    setSaveIndicator(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaveIndicator(false), 2000)
  }, [])

  const addLog = (message, type = 'info', section = '') => {
    const log = { id: Date.now(), message, type, section, timestamp: new Date().toISOString() }
    setLogs(prev => [log, ...prev].slice(0, 200))
  }

  const addNotification = (title, message, type = 'info') => {
    const notif = { id: Date.now(), title, message, type, read: false, timestamp: new Date().toISOString() }
    setNotifications(prev => [notif, ...prev].slice(0, 50))
  }

  return {
    lang, setLang, theme, setTheme, user, setUser,
    notifications, setNotifications, logs, setLogs,
    addLog, addNotification, saveIndicator, triggerSave,
  }
}
