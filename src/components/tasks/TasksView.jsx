import { useState } from 'react'
import { useLS } from '../../hooks/useStore'
import { callClaude } from '../../lib/claude'

const COLUMNS = [
  { id: 'todo', iconFr: '📋 À faire', iconEn: '📋 To Do', color: '#6b7280' },
  { id: 'inprogress', iconFr: '⚡ En cours', iconEn: '⚡ In Progress', color: '#f59e0b' },
  { id: 'validation', iconFr: '👀 En validation', iconEn: '👀 In Validation', color: '#6470f1' },
  { id: 'done', iconFr: '✅ Terminé', iconEn: '✅ Done', color: '#10b981' },
]

const SAMPLE_TASKS = [
  { id: 1, title: 'Préparer réunion direction', desc: 'Ordre du jour, réservation salle, invitations', status: 'todo', priority: 'haute', due: '2026-03-12', assignee: 'Marie' },
  { id: 2, title: 'Rapport mensuel Q1', desc: 'Consolider les données des 3 départements', status: 'inprogress', priority: 'haute', due: '2026-03-15', assignee: 'Thomas' },
  { id: 3, title: 'Commande fournitures bureau', desc: 'Papier, encre, café, fournitures diverses', status: 'validation', priority: 'faible', due: '2026-03-11', assignee: null },
  { id: 4, title: 'Mise à jour contacts CRM', desc: '45 contacts à mettre à jour suite au salon', status: 'todo', priority: 'moyenne', due: '2026-03-20', assignee: null },
  { id: 5, title: 'Facture fournisseur #4521', desc: 'Vérification et validation paiement 847€', status: 'done', priority: 'haute', due: '2026-03-10', assignee: 'Julie' },
]

export default function TasksView({ lang, user, addLog }) {
  const [tasks, setTasks] = useLS('tasks', SAMPLE_TASKS)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [dragOver, setDragOver] = useState(null)
  const [dragging, setDragging] = useState(null)
  const isFr = lang === 'fr'

  const form = editTask || { title: '', desc: '', status: 'todo', priority: 'moyenne', due: '', assignee: '' }

  function openNew() { setEditTask({ title: '', desc: '', status: 'todo', priority: 'moyenne', due: '', assignee: '' }); setShowModal(true) }
  function openEdit(t) { setEditTask({ ...t }); setShowModal(true) }

  function saveTask() {
    if (!editTask?.title) return
    if (editTask.id) {
      setTasks(prev => prev.map(t => t.id === editTask.id ? editTask : t))
      addLog?.('✏️ ' + (isFr ? 'Tâche modifiée: ' : 'Task edited: ') + editTask.title, 'info', 'tasks')
    } else {
      const newTask = { ...editTask, id: Date.now() }
      setTasks(prev => [...prev, newTask])
      addLog?.('✅ ' + (isFr ? 'Tâche créée: ' : 'Task created: ') + editTask.title, 'success', 'tasks')
    }
    setShowModal(false); setEditTask(null)
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
    addLog?.('🗑️ ' + (isFr ? 'Tâche supprimée' : 'Task deleted'), 'info', 'tasks')
  }

  function moveTask(taskId, newStatus) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  async function aiSuggestTasks() {
    setAiSuggesting(true)
    try {
      const result = await callClaude(
        isFr ? 'Suggère 3 nouvelles tâches administratives importantes pour une PME. Format JSON array: [{title, desc, priority, status:"todo"}]' : 'Suggest 3 important administrative tasks for a SME. JSON array format: [{title, desc, priority, status:"todo"}]',
        '', { maxTokens: 500 }
      )
      const match = result.match(/\[[\s\S]+\]/)
      if (match) {
        const suggestions = JSON.parse(match[0])
        const newTasks = suggestions.map(s => ({ ...s, id: Date.now() + Math.random(), due: '' }))
        setTasks(prev => [...prev, ...newTasks])
        addLog?.('🤖 ' + (isFr ? 'Tâches suggérées par IA ajoutées' : 'AI suggested tasks added'), 'success', 'tasks')
      }
    } catch {}
    setAiSuggesting(false)
  }

  const priorityColor = p => p === 'haute' ? '#ef4444' : p === 'moyenne' ? '#f59e0b' : '#6b7280'

  return (
    <div style={{ padding: 24, height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            {tasks.length} {isFr ? 'tâches au total' : 'total tasks'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={aiSuggestTasks} disabled={aiSuggesting} style={{ fontSize: 12 }}>
            🤖 {aiSuggesting ? (isFr ? 'Suggestion...' : 'Suggesting...') : (isFr ? 'Suggestions IA' : 'AI Suggest')}
          </button>
          <button className="btn-primary" onClick={openNew}>
            ➕ {isFr ? 'Nouvelle tâche' : 'New task'}
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, flex: 1, overflowY: 'auto' }}>
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id)
          return (
            <div key={col.id}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
              onDrop={e => { if (dragging) { moveTask(dragging, col.id); setDragging(null); setDragOver(null) } }}
              onDragLeave={() => setDragOver(null)}
              style={{
                background: dragOver === col.id ? 'rgba(100,112,241,0.05)' : '#0e1019',
                border: '1px solid ' + (dragOver === col.id ? 'rgba(100,112,241,0.3)' : 'rgba(255,255,255,0.04)'),
                borderRadius: 14, padding: 12,
                display: 'flex', flexDirection: 'column', gap: 8,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, padding: '0 4px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>
                  {isFr ? col.iconFr : col.iconEn}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, background: col.color + '22', color: col.color, padding: '2px 8px', borderRadius: 99 }}>
                  {colTasks.length}
                </span>
              </div>

              {colTasks.map(task => (
                <div key={task.id}
                  draggable
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => { setDragging(null); setDragOver(null) }}
                  style={{
                    background: '#12141f',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10, padding: 12,
                    cursor: 'grab',
                    transition: 'all 0.15s',
                    opacity: dragging === task.id ? 0.5 : 1,
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(100,112,241,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'white', lineHeight: 1.4 }}>{task.title}</span>
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      <button onClick={() => openEdit(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: 2 }}>✏️</button>
                      <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: 2 }}>🗑️</button>
                    </div>
                  </div>
                  {task.desc && <p style={{ margin: '0 0 8px', fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{task.desc}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: priorityColor(task.priority) + '22', color: priorityColor(task.priority), border: '1px solid ' + priorityColor(task.priority) + '44' }}>
                      {isFr ? task.priority : (task.priority === 'haute' ? 'high' : task.priority === 'moyenne' ? 'medium' : 'low')}
                    </span>
                    {task.due && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>📅 {task.due}</span>}
                    {task.assignee && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>👤 {task.assignee}</span>}
                  </div>
                </div>
              ))}

              <button onClick={openNew} style={{
                background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '8px', color: 'rgba(255,255,255,0.2)',
                cursor: 'pointer', fontSize: 12, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(100,112,241,0.3)'; e.currentTarget.style.color = '#a5b8fc' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}
              >+ {isFr ? 'Ajouter' : 'Add'}</button>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 20px', fontFamily: 'Outfit', fontWeight: 600, color: 'white' }}>
              {editTask?.id ? (isFr ? '✏️ Modifier la tâche' : '✏️ Edit task') : (isFr ? '➕ Nouvelle tâche' : '➕ New task')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input" placeholder={isFr ? 'Titre de la tâche *' : 'Task title *'} value={editTask?.title || ''} onChange={e => setEditTask(p => ({ ...p, title: e.target.value }))} />
              <textarea className="input" rows={3} placeholder={isFr ? 'Description...' : 'Description...'} value={editTask?.desc || ''} onChange={e => setEditTask(p => ({ ...p, desc: e.target.value }))} style={{ resize: 'vertical' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{isFr ? 'Priorité' : 'Priority'}</label>
                  <select className="input" value={editTask?.priority || 'moyenne'} onChange={e => setEditTask(p => ({ ...p, priority: e.target.value }))}>
                    <option value="haute">{isFr ? 'Haute' : 'High'}</option>
                    <option value="moyenne">{isFr ? 'Moyenne' : 'Medium'}</option>
                    <option value="faible">{isFr ? 'Faible' : 'Low'}</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{isFr ? 'Statut' : 'Status'}</label>
                  <select className="input" value={editTask?.status || 'todo'} onChange={e => setEditTask(p => ({ ...p, status: e.target.value }))}>
                    <option value="todo">{isFr ? 'À faire' : 'To Do'}</option>
                    <option value="inprogress">{isFr ? 'En cours' : 'In Progress'}</option>
                    <option value="validation">{isFr ? 'En validation' : 'In Validation'}</option>
                    <option value="done">{isFr ? 'Terminé' : 'Done'}</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{isFr ? 'Échéance' : 'Due date'}</label>
                  <input className="input" type="date" value={editTask?.due || ''} onChange={e => setEditTask(p => ({ ...p, due: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{isFr ? 'Assigné à' : 'Assignee'}</label>
                  <input className="input" placeholder={isFr ? 'Nom...' : 'Name...'} value={editTask?.assignee || ''} onChange={e => setEditTask(p => ({ ...p, assignee: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn-primary" onClick={saveTask}>✅ {isFr ? 'Enregistrer' : 'Save'}</button>
                <button className="btn-secondary" onClick={() => { setShowModal(false); setEditTask(null) }}>🚫 {isFr ? 'Annuler' : 'Cancel'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
