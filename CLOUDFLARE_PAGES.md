# Cloudflare Pages — connect Budgio IQ

Your app code is on GitHub: **`sssamiam2-prog/Budgio-IQ`**. The Vite app lives in the **`web/`** folder. Supabase still holds **auth + database**; Cloudflare only **hosts the static site**.

---

## What you will do (overview)

1. Log into Cloudflare and create a **Pages** project linked to GitHub.  
2. Point the build at **`web/`** and set **environment variables** so the build bakes in Supabase settings.  
3. Copy your **`.pages.dev`** URL into **Supabase → Authentication → URL Configuration**.  
4. Open the live site and sign in.

---

## Step 1 — Cloudflare account

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign in (create a free account if needed).

---

## Step 2 — Start “Connect to Git”

1. In the left sidebar, open **Workers & Pages** (or **Compute (Workers)** → **Workers & Pages** depending on the UI).  
2. Click **Create application** or **Create** → choose **Pages**.  
3. Click **Connect to Git**.  
4. If this is your first time: choose **GitHub**, then **Authorize Cloudflare** / **Install** the Cloudflare GitHub App.  
5. Grant access to **All repositories** *or* only **`sssamiam2-prog/Budgio-IQ`** (minimum needed).

---

## Step 3 — Select the repository

1. Find and select **`sssamiam2-prog/Budgio-IQ`**.  
2. Click **Begin setup** (or **Configure build**).

---

## Step 4 — Build settings (critical)

Use exactly these values:

| Field | Value |
|--------|--------|
| **Project name** | e.g. `budgio-iq` (becomes `https://budgio-iq.pages.dev`; if taken, try `budgio-iq-app`) |
| **Production branch** | `main` |
| **Framework preset** | **None** or **Vite** — if you pick Vite, still verify paths below |
| **Root directory (advanced)** | **`web`** ← must not be empty / root of repo |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

**Why “Root directory” = `web`:** `package.json` and `vite.config.ts` are inside `web/`. If you leave root at `/`, the build will fail.

Optional: Cloudflare may pick up **`web/.nvmrc`** (Node 20) for the build environment.

---

## Step 5 — Environment variables (before or after first deploy)

`VITE_*` values are embedded **at build time**. Set them for **Production** and (recommended) **Preview**:

| Variable name | Where to get the value |
|---------------|-------------------------|
| `VITE_SUPABASE_URL` | Supabase → **Project Settings** → **API** → **Project URL** |
| `VITE_SUPABASE_ANON_KEY` | Same page → **anon public** / **publishable** key (safe for the browser) |
| `VITE_VAPID_PUBLIC_KEY` | Optional — only for browser push notifications |

Do **not** put the Supabase **service_role** key in these variables.

If you already deployed without env vars: add them under **Settings → Environment variables**, then **Deployments → Retry deployment** (or push a small commit) so a new build runs.

---

## Step 6 — Save and deploy

1. Click **Save and Deploy**.  
2. Wait for the build to finish (green check).  
3. Open the **`*.pages.dev`** URL Cloudflare shows.

If the build fails, open the failed deployment log — common issues are wrong **root directory** (`web`) or wrong **output** (`dist`).

---

## Step 7 — Supabase auth URLs (required for login on the live site)

1. Supabase → **Authentication** → **URL Configuration**.  
2. **Site URL:** your Pages URL, e.g. `https://budgio-iq.pages.dev` (use your real hostname).  
3. **Redirect URLs:** add the same URL. If Supabase offers wildcards, add `https://YOUR-PROJECT.pages.dev/**`.

Save in Supabase, then test **Sign up / Sign in** on the live site again.

---

## Step 8 — Quick test

- Open the live URL in a private/incognito window.  
- You should see the app with **login** (not offline-only mode), assuming `VITE_SUPABASE_*` was set at build time.  
- Create a household or join with your partner using **Settings → join code**.

---

## Optional: CLI deploy (not required if you use Git)

From `web/` after `npm install`:

```bash
npx wrangler login
npm run pages:deploy
```

Match **`--project-name`** in `web/package.json` to your real Cloudflare project name.

---

## Repo files that help Cloudflare

| File | Purpose |
|------|---------|
| `web/public/_redirects` | SPA fallback so `/settings`, `/join`, etc. load `index.html` |
| `web/.nvmrc` | Hints Node 20 for the build |
