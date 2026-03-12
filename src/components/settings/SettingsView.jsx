import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ROLES } from '../../lib/roles'

export default function SettingsView({ lang, setLang, user, setUser }) {
  const [name, setName] = useState(user?.name || '')
  const [saved, setSaved] = useState(false)
  const isFr = lang === 'fr'

  async function saveProfile() {
    if (user?.id) {
      await supabase.from('profiles').update({ name, lang }).eq('id', user.id)
    }
    setUser(prev => ({ ...prev, name, lang }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Profile */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontFamily: 'Outfit', fontWeight: 600, color: 'var(--text)' }}>
            👤 {isFr ? 'Profil' : 'Profile'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{isFr ? 'Nom affiché' : 'Display name'}</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={isFr ? 'Votre nom' : 'Your name'} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Email</label>
              <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{isFr ? 'Rôle' : 'Role'}</label>
              <div style={{
                padding: '8px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                border: '1px solid var(--border2)',
                fontSize: 13, color: ROLES[user?.role]?.color || '#a5b8fc', fontWeight: 600,
              }}>
                {ROLES[user?.role]?.label?.[lang] || user?.role || 'Admin'}
              </div>
            </div>
            <button className="btn-primary" onClick={saveProfile} style={{ width: 'fit-content' }}>
              {saved ? '✅ ' + (isFr ? 'Enregistré !' : 'Saved!') : (isFr ? 'Enregistrer' : 'Save')}
            </button>
          </div>
        </div>

        {/* Language */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontFamily: 'Outfit', fontWeight: 600, color: 'var(--text)' }}>
            🌐 {isFr ? 'Langue' : 'Language'}
          </h3>
          <div style={{ display: 'flex', gap: 10 }}>
            {[['fr', '🇫🇷 Français'], ['en', '🇬🇧 English']].map(([l, label]) => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: '10px 20px', borderRadius: 10, border: '2px solid ' + (lang === l ? '#6470f1' : 'rgba(255,255,255,0.1)'),
                background: lang === l ? 'rgba(100,112,241,0.15)' : 'transparent',
                color: lang === l ? '#a5b8fc' : 'rgba(255,255,255,0.5)',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* About */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontFamily: 'Outfit', fontWeight: 600, color: 'var(--text)' }}>ℹ️ Aria</h3>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 6px' }}>Version 1.0.0</p>
            <p style={{ margin: '0 0 6px' }}>Powered by Claude AI (Anthropic)</p>
            <p style={{ margin: 0 }}>Supabase · Resend · Google APIs</p>
          </div>
        </div>
      </div>
    </div>
  )
}
