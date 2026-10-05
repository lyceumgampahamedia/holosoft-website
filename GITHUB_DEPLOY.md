# Holosoft GitHub deployment

This repository is prepared as one GitHub monorepo:

- Public site: GitHub Pages root
- CMS: GitHub Pages `/cms/`
- API: separate Node runtime (GitHub Pages cannot run the Express server)

## 1. Push this folder to GitHub

Create a repository (recommended name: `holosoft-website`) and push the entire project to the `main` branch.

Do **not** commit `.env`.

## 2. Deploy the API

Deploy the `server/` directory to a Node/Docker host such as Railway or Render.

Required production variables:

```env
NODE_ENV=production
ADMIN_PASSWORD=<strong-random-password>
ALLOWED_ORIGINS=https://YOUR-GITHUB-USERNAME.github.io
DATA_DIR=/data
```

If your GitHub Pages project URL uses an origin other than the default (for example a custom domain), put that origin in `ALLOWED_ORIGINS`. Multiple origins can be comma-separated.

Persistent storage is required because the CMS writes content, revisions, and uploaded images. Mount a persistent volume at `/data` when using `DATA_DIR=/data`.

The API exposes `/api/health`; use it as the host health check.

## 3. Configure GitHub repository variables

Repository → Settings → Secrets and variables → Actions → Variables.

Create:

- `API_URL` = the API public URL, e.g. `https://holosoft-api.example.app`
- `WEBSITE_URL` = optional. Leave it unset to use the default GitHub Pages project URL, or set your custom production domain.

These are public frontend build values, so repository **variables** are appropriate; do not put the CMS password here.

## 4. Enable GitHub Pages

Repository → Settings → Pages → Build and deployment → Source → **GitHub Actions**.

The included `.github/workflows/deploy-pages.yml` builds both Vite apps and publishes:

- `https://USERNAME.github.io/REPOSITORY/`
- `https://USERNAME.github.io/REPOSITORY/cms/`

The workflow also copies the public app entry point to `404.html`, allowing CMS-created page slugs to resolve on GitHub Pages.

## 5. API CORS

For the default GitHub Pages URL, `ALLOWED_ORIGINS` only needs the **origin**:

```env
ALLOWED_ORIGINS=https://USERNAME.github.io
```

Do not include `/REPOSITORY/` because CORS origins do not contain URL paths.

## 6. First login

Use the production `ADMIN_PASSWORD` you set on the API host. The local `holosoft-dev` fallback is intentionally unavailable when `NODE_ENV=production`.

## 7. Custom domain later

If you point `www.holosoft...` at GitHub Pages:

1. Configure the custom domain in GitHub Pages.
2. Set repository variable `WEBSITE_URL` to the final URL.
3. Add the final website origin to API `ALLOWED_ORIGINS`.
4. Re-run the GitHub Pages workflow.
