# Holosoft production deployment

## Architecture

- GitHub repository: source control for the whole monorepo.
- GitHub Pages: builds and serves the public website at the repository Pages URL and the CMS under `/cms/`.
- Railway: runs only `server/`, which provides auth, content APIs, publishing/revisions, and uploaded media.
- Railway volume mounted at `/data`: persists `content.json`, `draft.json`, revision snapshots, and uploaded images.

## Recommended names

- GitHub repository: `holosoft-website`
- Railway project: `Holosoft`
- Railway service: `holosoft-api`

## Railway API service

Connect this GitHub repository to Railway and create one service for the API.

Service settings:

- Root Directory: `/server`
- Config file path: `/server/railway.toml`
- Generate a public domain after the first successful deployment.
- Attach a persistent volume at `/data`.

Variables:

```env
NODE_ENV=production
ADMIN_PASSWORD=<use-a-long-random-password>
ALLOWED_ORIGINS=https://YOUR_GITHUB_USERNAME.github.io
DATA_DIR=/data
```

`ALLOWED_ORIGINS` is an origin only. Do not add the repository path.

Health check:

```text
/api/health
```

## GitHub Pages

In the GitHub repository, create these **Actions repository variables**:

- `API_URL` = the Railway public service URL, with no trailing slash.
- `WEBSITE_URL` = optional. Leave blank for the normal project Pages URL, or set the final custom domain later.

Then open:

`Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`

Push to `main` or manually run **Deploy Holosoft to GitHub Pages**.

The workflow builds both apps and publishes:

```text
https://YOUR_GITHUB_USERNAME.github.io/holosoft-website/
https://YOUR_GITHUB_USERNAME.github.io/holosoft-website/cms/
```

The workflow creates a `404.html` SPA fallback, so CMS-created pages such as `/services/cloud` can resolve on GitHub Pages.

## First production CMS login

Open the `/cms/` URL and enter the value used for Railway's `ADMIN_PASSWORD`.

The local-only fallback password `holosoft-dev` is intentionally disabled when `NODE_ENV=production`.

## Custom domain later

When a real Holosoft domain is ready:

1. Set it in GitHub Pages settings.
2. Set `WEBSITE_URL` to the final site URL.
3. Add the final site origin to Railway `ALLOWED_ORIGINS` (comma-separated if keeping the GitHub Pages origin too).
4. Redeploy the API if Railway requires it and rerun the Pages workflow.
