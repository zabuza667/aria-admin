// src/hooks/useSupabase.js — Hook universel Supabase pour toutes les sections

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import * as db from '../lib/db'

// ── Hook auth principal ───────────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupérer la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)
      if (session?.user) await loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    try {
      const p = await db.profiles.get(userId)
      setProfile(p)
    } catch {
      // Profil pas encore créé — normal au premier login
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email, password) {
    const data = await db.auth.signIn(email, password)
    return data
  }

  async function signUp(email, password, name) {
    const data = await db.auth.signUp(email, password, name)
    return data
  }

  async function signOut() {
    await db.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function updateProfile(updates) {
    if (!user) return
    const updated = await db.profiles.update(user.id, updates)
    setProfile(updated)
    return updated
  }

  return { user, profile, loading, signIn, signUp, signOut, updateProfile }
}

// ── Hook universel pour une table Supabase ────────────────────
export function useTable(tableName, userId, options = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const dbModule = {
    tasks: db.tasks,
    events: db.events,
    invoices: db.invoices,
    expenses: db.expenses,
    contacts: db.contacts,
    employees: db.employees,
    logs: db.logs,
    notifications: db.notifications,
    emails: db.emails,
    excel_files: db.excelFiles,
  }[tableName]

  const load = useCallback(async () => {
    if (!userId || !dbModule) return
    try {
      setLoading(true)
      const result = await dbModule.getAll(userId, options.folder)
      setData(result)
    } catch (err) {
      setError(err.message)
      console.error(`Error loading ${tableName}:`, err)
    } finally {
      setLoading(false)
    }
  }, [userId, tableName])

  useEffect(() => { load() }, [load])

  async function add(item) {
    if (!userId || !dbModule) return
    try {
      const created = await dbModule.create(userId, item)
      setData(prev => [created, ...prev])
      return created
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function update(id, updates) {
    if (!dbModule) return
    try {
      const updated = await dbModule.update(id, updates)
      setData(prev => prev.map(item => item.id === id ? updated : item))
      return updated
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function remove(id) {
    if (!dbModule) return
    try {
      await dbModule.delete(id)
      setData(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return { data, loading, error, add, update, remove, reload: load, setData }
}

// ── Hook tâches ───────────────────────────────────────────────
export function useTasks(userId) {
  return useTable('tasks', userId)
}

// ── Hook événements ───────────────────────────────────────────
export function useEvents(userId) {
  return useTable('events', userId)
}

// ── Hook factures ─────────────────────────────────────────────
export function useInvoices(userId) {
  return useTable('invoices', userId)
}

// ── Hook dépenses ─────────────────────────────────────────────
export function useExpenses(userId) {
  return useTable('expenses', userId)
}

// ── Hook contacts ─────────────────────────────────────────────
export function useContacts(userId) {
  return useTable('contacts', userId)
}

// ── Hook employés ─────────────────────────────────────────────
export function useEmployees(userId) {
  return useTable('employees', userId)
}

// ── Hook logs ─────────────────────────────────────────────────
export function useLogs(userId) {
  const table = useTable('logs', userId)

  async function addLog(userId, message, type = 'info', section = '') {
    await db.logs.add(userId, message, type, section)
    table.reload()
  }

  return { ...table, addLog }
}

// ── Hook notifications ────────────────────────────────────────
export function useNotifications(userId) {
  const table = useTable('notifications', userId)
  const unread = table.data.filter(n => !n.read).length

  async function addNotification(title, message, type = 'info') {
    return await db.notifications.add(userId, title, message, type)
  }

  async function markRead(id) {
    await db.notifications.markRead(id)
    table.setData(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await db.notifications.markAllRead(userId)
    table.setData(prev => prev.map(n => ({ ...n, read: true })))
  }

  return { ...table, unread, addNotification, markRead, markAllRead }
}

// ── Hook fichiers Excel ───────────────────────────────────────
export function useExcelFiles(userId) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    db.excelFiles.getAll(userId).then(data => {
      setFiles(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId])

  async function saveFile(file) {
    const saved = await db.excelFiles.save(userId, file)
    setFiles(prev => {
      const exists = prev.find(f => f.id === saved.id)
      return exists ? prev.map(f => f.id === saved.id ? saved : f) : [saved, ...prev]
    })
    return saved
  }

  async function deleteFile(id) {
    await db.excelFiles.delete(id)
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  return { files, loading, saveFile, deleteFile }
}
