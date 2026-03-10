import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthScreen({ onAuth, lang }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isFr = lang === 'fr'

  async function handleSubmit() {
    setError(''); setSuccess('')
    if (!email || !password) { setError(isFr ? 'Email et mot de passe requis' : 'Email and password required'); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
        onAuth({
          id: data.user.id,
          email: data.user.email,
          name: profile?.name || data.user.email.split('@')[0],
          role: profile?.role || 'admin',
          avatar: profile?.avatar || null,
        })
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            email: data.user.email,
            name: name || email.split('@')[0],
            role: 'admin',
          })
          setSuccess(isFr ? 'Compte créé ! Vérifiez votre email pour confirmer.' : 'Account created! Check your email to confirm.')
          setMode('login')
        }
      }
    } catch (err) {
      setError(err.message || (isFr ? 'Erreur de connexion' : 'Connection error'))
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0b12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background effects */}
      <div style={{
        position: 'absolute', top: -200, left: -200,
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(100,112,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -200, right: -200,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(165,184,252,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        background: '#12141f',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: 40,
        width: '100%',
        maxWidth: 420,
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #6470f1, #a5b8fc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, fontFamily: 'Outfit',
            margin: '0 auto 12px',
            boxShadow: '0 0 24px rgba(100,112,241,0.4)',
          }}>A</div>
          <h1 style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 800, fontSize: 28, color: 'white' }}>Aria</h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            {isFr ? 'Assistant Administratif IA' : 'AI Administrative Assistant'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12,
          padding: 4, marginBottom: 24,
        }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px 0',
              background: mode === m ? 'rgba(100,112,241,0.2)' : 'transparent',
              border: mode === m ? '1px solid rgba(100,112,241,0.3)' : '1px solid transparent',
              borderRadius: 8,
              color: mode === m ? '#a5b8fc' : 'rgba(255,255,255,0.4)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              {m === 'login' ? (isFr ? 'Connexion' : 'Sign In') : (isFr ? 'Inscription' : 'Register')}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 500 }}>
                {isFr ? 'Nom complet' : 'Full name'}
              </label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={isFr ? 'Votre nom' : 'Your name'} />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 500 }}>Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 500 }}>
              {isFr ? 'Mot de passe' : 'Password'}
            </label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#6ee7b7' }}>
              ✅ {success}
            </div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ justifyContent: 'center', padding: '12px', marginTop: 4 }}>
            {loading ? (isFr ? 'Chargement...' : 'Loading...') : (mode === 'login' ? (isFr ? 'Se connecter' : 'Sign In') : (isFr ? "Créer mon compte" : 'Create account'))}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          Aria v1.0 — Powered by Claude AI
        </p>
      </div>
    </div>
  )
}
