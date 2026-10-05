# Holosoft Site + CMS Architecture

```text
                 ┌──────────────────────────┐
                 │   PUBLIC VITE + REACT    │
                 │     localhost:5173       │
                 └────────────┬─────────────┘
                              │ GET /api/content
                              ▼
┌──────────────────────┐   ┌──────────────────────────┐
│ CMS VITE + REACT     │   │  HOLOSOFT CONTENT API    │
│ localhost:5174       │──▶│     localhost:8787       │
└──────────────────────┘   └────────────┬─────────────┘
  auth / draft / publish                │
                                        ├── data/draft.json
                                        ├── data/content.json  ← live
                                        └── data/history/*.json
```

## Separation of responsibility

### Public website
The website is read-only. It never receives the CMS authentication token and never writes content. It requests `/api/content`, which returns only the published content state and filters hidden services, unpublished projects/pages, disabled partners, and disabled team members. Published CMS pages are routed by slug inside the React app.

### CMS
The CMS is a completely separate Vite application. It authenticates against the API and edits the draft state. The two main editorial actions are intentionally different:

- **Save Draft** → writes `draft.json`; public website is unchanged.
- **Publish Live** → snapshots the current `content.json`, then replaces the live content with the saved draft.

### API
The API is the boundary between both apps. Authenticated writes live under `/api/admin/*`; the public read route is isolated at `/api/content`. The authenticated media endpoint stores validated reusable section, team-photo and partner-logo uploads under `server/data/uploads/`, which are served read-only from `/uploads/*`.

## Current persistence
JSON storage is deliberate for this prototype because it keeps the project runnable with almost no infrastructure. It is appropriate for one editor / one server. When Holosoft needs multiple editors, audit users, cloud deployment, or horizontal scaling, replace the JSON repository with PostgreSQL while keeping the same API contract.

## Production hardening path

1. Deploy website and CMS to separate origins/subdomains.
2. Deploy the API behind HTTPS.
3. Set `ADMIN_PASSWORD` and `ALLOWED_ORIGINS` in the server environment.
4. Set `VITE_API_URL` for both frontends and `VITE_WEBSITE_URL` for CMS.
5. Move persistence to PostgreSQL and revision payloads to database/object storage.
6. Upgrade single-admin access to user accounts/roles if multiple people will edit content.
7. Move `server/data/uploads/` to managed object storage/CDN before multi-instance deployment.
8. Add richer reusable page-block types, video media, focal-point cropping and a dedicated asset library as the content model grows.


## Content model additions in v1.3

- `teamSection` controls the public Our Team module and optional section artwork.
- `team[]` stores ordered/visible member records and optional portrait media.
- Reusable `media` objects use `{ src, alt, position, fit }` and are available throughout homepage modules and CMS-created page blocks.
- Uploaded media continues to live under `server/data/uploads/`, so draft/publish/revision payloads only store stable media paths and metadata rather than binary data.
