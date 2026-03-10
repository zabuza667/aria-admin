// Configuration Aria — clés sécurisées via variables d'environnement Vercel
export const CFG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  anthropicKey: import.meta.env.VITE_ANTHROPIC_KEY || '',
  resendKey: import.meta.env.VITE_RESEND_KEY || '',
}

export const ROLES = {
  ADMIN: 'admin',
  CEO: 'ceo',
  ASSISTANT: 'assistant',
  OFFICE_MANAGER: 'office_manager',
  HR: 'hr',
  ACCOUNTANT: 'accountant',
  SECRETARY: 'secretary',
  READER: 'reader',
}

export const ROLE_LABELS = {
  fr: {
    admin: 'Administrateur',
    ceo: 'Directeur / CEO',
    assistant: 'Assistant de direction',
    office_manager: 'Office Manager',
    hr: 'Responsable RH',
    accountant: 'Comptable',
    secretary: 'Secrétaire',
    reader: 'Lecteur',
  },
  en: {
    admin: 'Administrator',
    ceo: 'Director / CEO',
    assistant: 'Executive Assistant',
    office_manager: 'Office Manager',
    hr: 'HR Manager',
    accountant: 'Accountant',
    secretary: 'Secretary',
    reader: 'Reader',
  }
}

export const ROLE_PERMISSIONS = {
  admin:          ['dashboard','emails','excel','calendar','tasks','accounting','files','analytics','logs','settings','team','notifications','ceo','crm','hr'],
  ceo:            ['dashboard','emails','calendar','tasks','accounting','analytics','ceo','crm','notifications'],
  assistant:      ['dashboard','emails','excel','calendar','tasks','files','notifications','crm'],
  office_manager: ['dashboard','emails','excel','calendar','tasks','files','accounting','notifications','team','crm'],
  hr:             ['dashboard','emails','calendar','tasks','hr','files','notifications'],
  accountant:     ['dashboard','emails','excel','accounting','files','analytics'],
  secretary:      ['dashboard','emails','calendar','tasks','files'],
  reader:         ['dashboard','analytics'],
}

export const NAV_ITEMS = [
  { id: 'dashboard',     icon: '🏠', labelFr: 'Tableau de bord',   labelEn: 'Dashboard' },
  { id: 'emails',        icon: '📧', labelFr: 'Emails',             labelEn: 'Emails' },
  { id: 'calendar',      icon: '🗓️', labelFr: 'Calendrier',         labelEn: 'Calendar' },
  { id: 'tasks',         icon: '✅', labelFr: 'Tâches',             labelEn: 'Tasks' },
  { id: 'excel',         icon: '📊', labelFr: 'Excel / Données',    labelEn: 'Excel / Data' },
  { id: 'accounting',    icon: '💰', labelFr: 'Comptabilité',       labelEn: 'Accounting' },
  { id: 'crm',           icon: '👥', labelFr: 'Contacts / CRM',     labelEn: 'Contacts / CRM' },
  { id: 'hr',            icon: '🧑‍💼', labelFr: 'RH',                 labelEn: 'HR' },
  { id: 'files',         icon: '📁', labelFr: 'Fichiers',           labelEn: 'Files' },
  { id: 'analytics',     icon: '📈', labelFr: 'Analytics',          labelEn: 'Analytics' },
  { id: 'notifications', icon: '🔔', labelFr: 'Notifications',      labelEn: 'Notifications' },
  { id: 'team',          icon: '👔', labelFr: 'Équipe',             labelEn: 'Team' },
  { id: 'ceo',           icon: '🏆', labelFr: 'Vue CEO',            labelEn: 'CEO View' },
  { id: 'logs',          icon: '📜', labelFr: 'Logs',               labelEn: 'Logs' },
  { id: 'settings',      icon: '⚙️', labelFr: 'Paramètres',         labelEn: 'Settings' },
]
