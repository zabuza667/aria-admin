// Système de rôles et permissions d'Aria
export const ROLES = {
  admin: {
    id: 'admin',
    label: { fr: 'Administrateur', en: 'Administrator' },
    color: '#6470f1',
    level: 10,
    sections: ['dashboard','emails','excel','calendar','tasks','accounting','files','analytics','logs','settings','team','notifications','ceo','crm','hr'],
  },
  director: {
    id: 'director',
    label: { fr: 'Directeur / CEO', en: 'Director / CEO' },
    color: '#f59e0b',
    level: 9,
    sections: ['dashboard','emails','excel','calendar','tasks','accounting','files','analytics','logs','notifications','ceo','crm','hr'],
  },
  assistant: {
    id: 'assistant',
    label: { fr: 'Assistant de direction', en: 'Executive Assistant' },
    color: '#10b981',
    level: 7,
    sections: ['dashboard','emails','excel','calendar','tasks','files','logs','notifications','crm'],
  },
  officeManager: {
    id: 'officeManager',
    label: { fr: 'Office Manager', en: 'Office Manager' },
    color: '#06b6d4',
    level: 6,
    sections: ['dashboard','emails','calendar','tasks','accounting','files','logs','notifications','hr'],
  },
  hrManager: {
    id: 'hrManager',
    label: { fr: 'Responsable RH', en: 'HR Manager' },
    color: '#ec4899',
    level: 6,
    sections: ['dashboard','emails','calendar','tasks','files','logs','notifications','hr'],
  },
  accountant: {
    id: 'accountant',
    label: { fr: 'Comptable', en: 'Accountant' },
    color: '#84cc16',
    level: 5,
    sections: ['dashboard','emails','excel','files','accounting','logs','notifications'],
  },
  secretary: {
    id: 'secretary',
    label: { fr: 'Secrétaire', en: 'Secretary' },
    color: '#f97316',
    level: 4,
    sections: ['dashboard','emails','calendar','tasks','files','logs','notifications'],
  },
  reader: {
    id: 'reader',
    label: { fr: 'Lecteur', en: 'Reader' },
    color: '#94a3b8',
    level: 1,
    sections: ['dashboard','logs'],
  },
}

export const NAV_ITEMS = [
  { id: 'dashboard', icon: '🏠', labelFr: 'Tableau de bord', labelEn: 'Dashboard' },
  { id: 'emails', icon: '📧', labelFr: 'Emails', labelEn: 'Emails' },
  { id: 'calendar', icon: '🗓️', labelFr: 'Calendrier', labelEn: 'Calendar' },
  { id: 'tasks', icon: '✅', labelFr: 'Tâches', labelEn: 'Tasks' },
  { id: 'excel', icon: '📊', labelFr: 'Excel', labelEn: 'Excel' },
  { id: 'accounting', icon: '💰', labelFr: 'Comptabilité', labelEn: 'Accounting' },
  { id: 'hr', icon: '👥', labelFr: 'RH', labelEn: 'HR' },
  { id: 'crm', icon: '🤝', labelFr: 'CRM', labelEn: 'CRM' },
  { id: 'files', icon: '📁', labelFr: 'Fichiers', labelEn: 'Files' },
  { id: 'analytics', icon: '📈', labelFr: 'Analytiques', labelEn: 'Analytics' },
  { id: 'notifications', icon: '🔔', labelFr: 'Notifications', labelEn: 'Notifications' },
  { id: 'team', icon: '👤', labelFr: 'Équipe', labelEn: 'Team' },
  { id: 'ceo', icon: '👔', labelFr: 'Vue Directeur', labelEn: 'Director View' },
  { id: 'logs', icon: '📜', labelFr: 'Journaux', labelEn: 'Logs' },
  { id: 'settings', icon: '⚙️', labelFr: 'Paramètres', labelEn: 'Settings' },
]

export function canAccess(userRole, section) {
  const role = ROLES[userRole]
  if (!role) return false
  return role.sections.includes(section)
}

export function getNavItems(userRole, lang = 'fr') {
  const role = ROLES[userRole]
  if (!role) return []
  return NAV_ITEMS
    .filter(item => role.sections.includes(item.id))
    .map(item => ({
      ...item,
      label: lang === 'fr' ? item.labelFr : item.labelEn,
    }))
}
