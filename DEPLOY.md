# Déployer VEFA Vision V1 — Guide pas à pas

## Prérequis (comptes gratuits)

1. **GitHub** → github.com
2. **Supabase** → supabase.com (stockage images)
3. **Vercel** → vercel.com (hébergement app)
4. **OpenAI** → platform.openai.com (IA — nécessite ~5€ de crédit)

---

## Étape 1 : Configurer Supabase (3 min)

1. Va sur https://supabase.com → **New Project**
2. Donne un nom (ex: "vefa-vision") → région EU → crée un mot de passe
3. Attends que le projet se crée (~30 secondes)

### Créer le bucket de stockage :
4. Menu gauche → **Storage** → **New Bucket**
5. Nom : `plans`
6. Coche **Public bucket** → **Create bucket**

### Récupérer tes clés :
7. **Settings** → **API**
8. Note ces 3 valeurs :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (clique "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`

---

## Étape 2 : Clé OpenAI (2 min)

1. Va sur https://platform.openai.com/api-keys
2. **Create new secret key** → donne un nom → **Create**
3. **Copie la clé immédiatement** → c'est ta `OPENAI_API_KEY`

⚠️ Ajoute du crédit : Billing → Add payment method → minimum 5€

---

## Étape 3 : Déployer sur Vercel (5 min)

1. Va sur https://vercel.com → **Add New** → **Project**
2. Connecte ton GitHub → clique **Import** à côté de `vefa-vision`
3. **Environment Variables** — ajoute ces 4 variables :

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de ton projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role |
| `OPENAI_API_KEY` | ta clé OpenAI |

4. Clique **Deploy** → attends 1-2 min
5. 🎉 Ton app est en ligne sur `https://vefa-vision-xxxxx.vercel.app`

---

## Coûts

| Service | Gratuit jusqu'à |
|---------|----------------|
| Vercel | 100 GB/mois |
| Supabase | 1 GB stockage |
| OpenAI | ~0.20€ par plan décoré |

**100 plans/mois ≈ 20€ total**
