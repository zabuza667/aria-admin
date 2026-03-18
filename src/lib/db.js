// src/lib/db.js — Couche d'accès Supabase pour toutes les sections d'Aria

import { supabase } from './supabase'

// ── Auth ──────────────────────────────────────────────────────
export const auth = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },
  async signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } }
    })
    if (error) throw error
    return data
  },
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },
  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// ── Profil ────────────────────────────────────────────────────
export const profiles = {
  async get(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) throw error
    return data
  },
  async update(userId, updates) {
    const { data, error } = await supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', userId).select().single()
    if (error) throw error
    return data
  }
}

// ── Tâches ────────────────────────────────────────────────────
export const tasks = {
  async getAll(userId) {
    const { data, error } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async create(userId, task) {
    const { data, error } = await supabase.from('tasks').insert({ ...task, user_id: userId }).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async delete(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
  }
}

// ── Événements (Calendrier) ───────────────────────────────────
export const events = {
  async getAll(userId) {
    const { data, error } = await supabase.from('events').select('*').eq('user_id', userId).order('date', { ascending: true })
    if (error) throw error
    return data || []
  },
  async create(userId, event) {
    const { data, error } = await supabase.from('events').insert({ ...event, user_id: userId }).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('events').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async delete(id) {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) throw error
  }
}

// ── Factures ──────────────────────────────────────────────────
export const invoices = {
  async getAll(userId) {
    const { data, error } = await supabase.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async create(userId, invoice) {
    const { data, error } = await supabase.from('invoices').insert({ ...invoice, user_id: userId }).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('invoices').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async delete(id) {
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) throw error
  }
}

// ── Dépenses ──────────────────────────────────────────────────
export const expenses = {
  async getAll(userId) {
    const { data, error } = await supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false })
    if (error) throw error
    return data || []
  },
  async create(userId, expense) {
    const { data, error } = await supabase.from('expenses').insert({ ...expense, user_id: userId }).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('expenses').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async delete(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
  }
}

// ── Contacts (CRM) ────────────────────────────────────────────
export const contacts = {
  async getAll(userId) {
    const { data, error } = await supabase.from('contacts').select('*').eq('user_id', userId).order('name', { ascending: true })
    if (error) throw error
    return data || []
  },
  async create(userId, contact) {
    const { data, error } = await supabase.from('contacts').insert({ ...contact, user_id: userId }).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('contacts').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async delete(id) {
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) throw error
  }
}

// ── Employés (RH) ─────────────────────────────────────────────
export const employees = {
  async getAll(userId) {
    const { data, error } = await supabase.from('employees').select('*').eq('user_id', userId).order('name', { ascending: true })
    if (error) throw error
    return data || []
  },
  async create(userId, employee) {
    const { data, error } = await supabase.from('employees').insert({ ...employee, user_id: userId }).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('employees').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async delete(id) {
    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (error) throw error
  }
}

// ── Fichiers Excel ────────────────────────────────────────────
export const excelFiles = {
  async getAll(userId) {
    const { data, error } = await supabase.from('excel_files').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async save(userId, file) {
    const { data, error } = await supabase.from('excel_files').upsert({ ...file, user_id: userId }).select().single()
    if (error) throw error
    return data
  },
  async delete(id) {
    const { error } = await supabase.from('excel_files').delete().eq('id', id)
    if (error) throw error
  }
}

// ── Logs ──────────────────────────────────────────────────────
export const logs = {
  async getAll(userId) {
    const { data, error } = await supabase.from('logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200)
    if (error) throw error
    return data || []
  },
  async add(userId, message, type = 'info', section = '') {
    const { error } = await supabase.from('logs').insert({ user_id: userId, message, type, section })
    if (error) console.error('Log error:', error)
  }
}

// ── Notifications ─────────────────────────────────────────────
export const notifications = {
  async getAll(userId) {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async add(userId, title, message, type = 'info') {
    const { data, error } = await supabase.from('notifications').insert({ user_id: userId, title, message, type }).select().single()
    if (error) throw error
    return data
  },
  async markRead(id) {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) throw error
  },
  async markAllRead(userId) {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId)
    if (error) throw error
  },
  async delete(id) {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) throw error
  }
}

// ── Emails ────────────────────────────────────────────────────
export const emails = {
  async getAll(userId, folder = 'inbox') {
    const { data, error } = await supabase.from('emails').select('*').eq('user_id', userId).eq('folder', folder).order('date', { ascending: false })
    if (error) throw error
    return data || []
  },
  async save(userId, email) {
    const { data, error } = await supabase.from('emails').upsert({ ...email, user_id: userId }).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('emails').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async delete(id) {
    const { error } = await supabase.from('emails').delete().eq('id', id)
    if (error) throw error
  }
}
