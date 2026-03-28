# Cloudflare Pages (Plan A)

Connect this repo to **Cloudflare Pages** so everyone gets a public URL. Database and auth stay in **Supabase**.

## 1. Push to GitHub

Create a new empty repository on GitHub, then from this folder:

```bash
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Replace with your real repo URL.

## 2. Create the Pages project

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the GitHub repo and authorize if asked.
3. Configure the build:

| Setting | Value |
|--------|--------|
| **Root directory** | `web` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

4. **Project name:** try `budgio-iq`. If Cloudflare says it’s taken, pick another name (e.g. `budgio-iq-family`) and use that hostname everywhere below.

5. **Environment variables** (Production and Preview):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → URL |
| `VITE_SUPABASE_ANON_KEY` | Same page → anon / publishable key |
| `VITE_VAPID_PUBLIC_KEY` | Optional — web push only |

6. Save and deploy. Note your site URL, e.g. `https://budgio-iq.pages.dev`.

## 3. Supabase auth URLs

Supabase → **Authentication** → **URL Configuration**:

- **Site URL:** `https://YOUR_PROJECT.pages.dev` (your real Pages URL).
- **Redirect URLs:** add the same URL. If the UI allows a wildcard, add `https://YOUR_PROJECT.pages.dev/**`.

Redeploy Pages after changing env vars if needed.

## 4. Optional: CLI deploy

From `web/` after `npm install`:

```bash
npx wrangler login
npm run pages:deploy
```

Update `--project-name` in `web/package.json` if your Cloudflare project name is not `budgio-iq`.
