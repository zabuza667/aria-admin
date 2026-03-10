import { useState } from 'react'
import { useLS } from '../../hooks/useStore'
import { callClaude } from '../../lib/claude'

const SAMPLE_EVENTS = [
  { id: 1, title: 'Réunion de direction', date: '2026-03-10', time: '14:00', duration: 60, type: 'meeting', location: 'Salle A', attendees: ['Direction', 'RH', 'Compta'] },
  { id: 2, title: 'Call client Dupont', date: '2026-03-11', time: '10:30', duration: 30, type: 'call', location: 'Visio', attendees: ['Marie Dupont'] },
  { id: 3, title: 'Formation Excel avancé', date: '2026-03-12', time: '09:00', duration: 180, type: 'training', location: 'Salle formation', attendees: ['Équipe compta'] },
  { id: 4, title: 'Déjeuner partenaire', date: '2026-03-13', time: '12:30', duration: 90, type: 'external', location: 'Restaurant Le Central', attendees: ['Partenaire XYZ'] },
  { id: 5, title: 'Revue mensuelle RH', date: '2026-03-16', time: '15:00', duration: 45, type: 'meeting', location: 'Salle B', attendees: ['RH', 'Direction'] },
]

const TYPE_CONFIG = {
  meeting: { color: '#6470f1', icon: '🤝', label: { fr: 'Réunion', en: 'Meeting' } },
  call: { color: '#10b981', icon: '📞', label: { fr: 'Appel', en: 'Call' } },
  training: { color: '#f59e0b', icon: '📚', label: { fr: 'Formation', en: 'Training' } },
  external: { color: '#ec4899', icon: '🌐', label: { fr: 'Externe', en: 'External' } },
  reminder: { color: '#6b7280', icon: '⏰', label: { fr: 'Rappel', en: 'Reminder' } },
}

export default function CalendarView({ lang, addLog }) {
  const [events, setEvents] = useLS('events', SAMPLE_EVENTS)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)) // March 2026
  const [view, setView] = useState('month')
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [aiPlanning, setAiPlanning] = useState(false)
  const isFr = lang === 'fr'

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1

  const monthNames = isFr
    ? ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
    : ['January','February','March','April','May','June','July','August','September','October','November','December']
  const dayNames = isFr ? ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  function getEventsForDate(d) {
    const dateStr = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0')
    return events.filter(e => e.date === dateStr)
  }

  function openNewEvent(day = '') {
    const dateStr = day ? year + '-' + String(month+1).padStart(2,'0') + '-' + String(day).padStart(2,'0') : ''
    setEditEvent({ title: '', date: dateStr, time: '09:00', duration: 60, type: 'meeting', location: '', attendees: [] })
    setShowModal(true)
  }

  function saveEvent() {
    if (!editEvent?.title || !editEvent?.date) return
    if (editEvent.id) {
      setEvents(prev => prev.map(e => e.id === editEvent.id ? editEvent : e))
    } else {
      setEvents(prev => [...prev, { ...editEvent, id: Date.now() }])
    }
    addLog?.('🗓️ ' + (isFr ? 'Événement sauvegardé: ' : 'Event saved: ') + editEvent.title, 'success', 'calendar')
    setShowModal(false); setEditEvent(null)
  }

  async function aiPlanMeeting() {
    setAiPlanning(true)
    try {
      const result = await callClaude(
        isFr ? 'Suggère un planning optimisé pour cette semaine avec 3 réunions types importantes pour une PME. Format JSON: [{title, date:"2026-03-16", time, duration, type:"meeting", location, attendees:[]}]' : 'Suggest an optimized schedule for this week with 3 typical important meetings for a SME. JSON: [{title, date:"2026-03-16", time, duration, type:"meeting", location, attendees:[]}]',
        '', { maxTokens: 600 }
      )
      const match = result.match(/\[[\s\S]+\]/)
      if (match) {
        const suggestions = JSON.parse(match[0])
        setEvents(prev => [...prev, ...suggestions.map(s => ({ ...s, id: Date.now() + Math.random() }))])
        addLog?.('🤖 ' + (isFr ? 'Planning IA ajouté' : 'AI schedule added'), 'success', 'calendar')
      }
    } catch {}
    setAiPlanning(false)
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 60px)', overflow: 'auto' }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>‹</button>
          <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 18, color: 'white', minWidth: 160, textAlign: 'center' }}>
            {monthNames[month]} {year}
          </span>
          <button className="btn-ghost" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>›</button>
        </div>
        <button className="btn-secondary" onClick={() => setCurrentDate(new Date(2026, 2, 1))} style={{ fontSize: 12 }}>
          {isFr ? "Aujourd'hui" : 'Today'}
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={aiPlanMeeting} disabled={aiPlanning} style={{ fontSize: 12 }}>
            🤖 {aiPlanning ? '...' : (isFr ? 'Planning IA' : 'AI Plan')}
          </button>
          <button className="btn-primary" onClick={() => openNewEvent()}>
            ➕ {isFr ? 'Événement' : 'Event'}
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', flex: 1 }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {dayNames.map(d => (
            <div key={d} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
          ))}
        </div>

        {/* Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: adjustedFirstDay }, (_, i) => (
            <div key={'empty-' + i} style={{ minHeight: 100, borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' }} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dateStr = year + '-' + String(month+1).padStart(2,'0') + '-' + String(day).padStart(2,'0')
            const dayEvents = getEventsForDate(day)
            const isToday = dateStr === todayStr
            const isSelected = selectedDay === day
            return (
              <div key={day}
                onClick={() => { setSelectedDay(day === selectedDay ? null : day) }}
                style={{
                  minHeight: 100, padding: 8,
                  borderRight: '1px solid rgba(255,255,255,0.04)',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer', transition: 'background 0.15s',
                  background: isSelected ? 'rgba(100,112,241,0.08)' : isToday ? 'rgba(100,112,241,0.04)' : 'transparent',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(100,112,241,0.04)' : 'transparent' }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: isToday ? '#6470f1' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'white' : 'rgba(255,255,255,0.7)',
                  marginBottom: 6,
                }}>{day}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayEvents.slice(0, 3).map(ev => {
                    const tc = TYPE_CONFIG[ev.type] || TYPE_CONFIG.meeting
                    return (
                      <div key={ev.id} onClick={e => { e.stopPropagation(); setEditEvent(ev); setShowModal(true) }} style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                        background: tc.color + '22', color: tc.color, border: '1px solid ' + tc.color + '44',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer',
                      }}>{tc.icon} {ev.title}</div>
                    )
                  })}
                  {dayEvents.length > 3 && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>+{dayEvents.length - 3} {isFr ? 'autres' : 'more'}</div>}
                </div>
                {isSelected && (
                  <button onClick={e => { e.stopPropagation(); openNewEvent(day) }} style={{
                    marginTop: 4, width: '100%', background: 'none', border: '1px dashed rgba(100,112,241,0.3)',
                    borderRadius: 4, color: '#a5b8fc', fontSize: 10, cursor: 'pointer', padding: '2px',
                  }}>+ {isFr ? 'Ajouter' : 'Add'}</button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && editEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 20px', fontFamily: 'Outfit', fontWeight: 600, color: 'white' }}>
              {editEvent.id ? '✏️ ' + (isFr ? 'Modifier' : 'Edit') : '➕ ' + (isFr ? 'Nouvel événement' : 'New event')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input" placeholder={isFr ? 'Titre *' : 'Title *'} value={editEvent.title} onChange={e => setEditEvent(p => ({ ...p, title: e.target.value }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{isFr ? 'Date *' : 'Date *'}</label>
                  <input className="input" type="date" value={editEvent.date} onChange={e => setEditEvent(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{isFr ? 'Heure' : 'Time'}</label>
                  <input className="input" type="time" value={editEvent.time} onChange={e => setEditEvent(p => ({ ...p, time: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{isFr ? 'Type' : 'Type'}</label>
                  <select className="input" value={editEvent.type} onChange={e => setEditEvent(p => ({ ...p, type: e.target.value }))}>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {isFr ? v.label.fr : v.label.en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{isFr ? 'Durée (min)' : 'Duration (min)'}</label>
                  <input className="input" type="number" value={editEvent.duration} onChange={e => setEditEvent(p => ({ ...p, duration: parseInt(e.target.value) }))} />
                </div>
              </div>
              <input className="input" placeholder={isFr ? 'Lieu / Lien visio' : 'Location / Video link'} value={editEvent.location} onChange={e => setEditEvent(p => ({ ...p, location: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn-primary" onClick={saveEvent}>✅ {isFr ? 'Enregistrer' : 'Save'}</button>
                {editEvent.id && <button className="btn-secondary" onClick={() => { setEvents(prev => prev.filter(e => e.id !== editEvent.id)); setShowModal(false) }} style={{ color: '#ef4444' }}>🗑️</button>}
                <button className="btn-secondary" onClick={() => setShowModal(false)}>🚫 {isFr ? 'Annuler' : 'Cancel'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
