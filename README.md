# Aria — Assistant Administratif IA

## Déploiement en 3 étapes

### Étape 1 — Supabase (base de données)
1. Va sur supabase.com → ton projet
2. Clique sur "SQL Editor"
3. Colle tout le contenu du fichier `supabase/schema.sql`
4. Clique "Run"

### Étape 2 — GitHub
1. Va sur github.com → New repository
2. Nom: `aria-admin`
3. Dézipe ce projet sur ton PC
4. Dans le dossier aria/, ouvre un terminal:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/zabuza667/aria-admin.git
   git push -u origin main
   ```

### Étape 3 — Vercel
1. Va sur vercel.com
2. "New Project" → importe ton repo GitHub `aria-admin`
3. Dans "Environment Variables", ajoute:
   - VITE_SUPABASE_URL = https://fbobbeztduoxudughxls.supabase.co
   - VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_sLxC-Kngnmq3eHkBZl7ZTA_61Hu1vBe
   - VITE_GOOGLE_CLIENT_ID = 824232058482-hdj7dsipcouhvlbfuuj8fr6ps9nk2ju8.apps.googleusercontent.com
4. Clique "Deploy"

✅ Ton app sera en ligne sur aria-admin.vercel.app
