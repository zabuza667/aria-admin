// Hook simplifié pour connecter une section à Supabase
// Remplace useLS avec fallback localStorage pendant la migration

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSupabaseTable(table, userId, defaultData = [], orderBy = 'created_at') {
  const [data, setData] = useState(defaultData)
  const [loading, setLoading] = useState(true)
  const [synced, setSynced] = useState(false)

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    try {
      const { data: rows, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order(orderBy, { ascending: false })

      if (error) throw error
      setData(rows || [])
      setSynced(true)
    } catch (err) {
      console.error(`Supabase load ${table}:`, err)
    } finally {
      setLoading(false)
    }
  }, [userId, table])

  useEffect(() => { load() }, [load])

  async function add(item) {
    const optimistic = { ...item, id: 'temp_' + Date.now(), user_id: userId, created_at: new Date().toISOString() }
    setData(prev => [optimistic, ...prev])

    try {
      const { data: created, error } = await supabase
        .from(table)
        .insert({ ...item, user_id: userId })
        .select()
        .single()
      if (error) throw error
      setData(prev => prev.map(r => r.id === optimistic.id ? created : r))
      return created
    } catch (err) {
      setData(prev => prev.filter(r => r.id !== optimistic.id))
      console.error(`Supabase add ${table}:`, err)
      throw err
    }
  }

  async function update(id, updates) {
    setData(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    try {
      const { data: updated, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      setData(prev => prev.map(r => r.id === id ? updated : r))
      return updated
    } catch (err) {
      console.error(`Supabase update ${table}:`, err)
      throw err
    }
  }

  async function remove(id) {
    setData(prev => prev.filter(r => r.id !== id))
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error(`Supabase delete ${table}:`, err)
      load()
    }
  }

  return { data, loading, synced, add, update, remove, reload: load, setData }
}
