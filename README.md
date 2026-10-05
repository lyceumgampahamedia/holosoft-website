# Holosoft React Suite

> **GitHub deployment:** This version includes a GitHub Pages workflow and production API deployment support. See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the current GitHub Pages + Railway production setup.


A clean split between two Vite + React applications, powered by one shared content API.

## Systems

### 1. Public website — `apps/website`
- Vite + React
- Black/white cyber visual system with a persistent Holosoft blue/violet signal layer
- Holosoft system-boot loading animation
- Content fetched from the **published** API only
- Dynamic hero, manifesto, partner banner, services, projects, process, Our Team and contact sections
- CMS-created standalone pages with automatic `/slug` routing and SEO fields
- Responsive layouts and reduced-motion support

### 2. CMS — `apps/cms`
- Separate Vite + React admin application
- Password authentication with 8-hour in-memory sessions
- Homepage content editor
- **Dynamic Pages**: create/delete pages, unique URL slugs, SEO, navigation visibility, publish state and reorderable content blocks
- **Partner Banner Manager**: partner CRUD, ordering, visibility, external links, marquee controls and direct logo uploads (SVG/PNG/JPG/WEBP/GIF)
- **Our Team Manager**: team section copy, ordering, visibility, roles, bios, contact/profile links and member-photo uploads
- **Reusable Section Media**: optional uploaded/external images for homepage modules, custom pages, page blocks, services, projects, process steps, partner/team sections and contact
- Services CRUD, ordering and visibility controls
- Project CRUD, ordering, publish toggles, featured state and visual modes
- Process editor
- Global site/meta/navigation settings
- **Save Draft** and **Publish Live** are separate operations
- Published revision snapshots with one-click restore

### Shared content API — `server`
This is infrastructure shared by the two systems rather than a third user-facing interface.

- Express API
- Public read-only route: `/api/content`
- Authenticated CMS routes under `/api/admin/*`
- `server/data/draft.json` = CMS draft
- `server/data/content.json` = live/published website content
- `server/data/history/` = automatic snapshots of previous live versions
- `server/data/uploads/` = CMS-uploaded partner/media assets

## Requirements

- Node.js 22.12+
- npm 10+

## Start locally

```bash
cp .env.example .env
npm install
npm run dev
```

Then open:

- Website: http://localhost:5173
- CMS: http://localhost:5174
- API health: http://localhost:8787/api/health

For local development, leave `ADMIN_PASSWORD` blank in `.env`. The API then uses the development password:

```text
holosoft-dev
```

If you already created `.env` from an older copy and it contains `ADMIN_PASSWORD=change-this-before-deploying`, either use that value to log in or change it to `ADMIN_PASSWORD=` and restart the API.

Set a real `ADMIN_PASSWORD` before deployment. In production, the API refuses to start if the password is blank.

## Editorial workflow

1. Log into the CMS.
2. Make changes.
3. **Save Draft** — persists work but does not affect the public site.
4. **Publish Live** — snapshots the previous live version and publishes the current saved draft.
5. If necessary, open **Revisions** and restore an earlier live snapshot.

## Dynamic pages

Open **CMS → Pages** to create standalone site pages without touching React code. Each page includes:

- Page title and URL slug (`/your-slug`)
- Separate navigation label
- Publish/unpublish toggle
- Optional automatic inclusion in the public header navigation
- Page eyebrow, hero heading and introduction
- SEO title and meta description
- Optional final contact CTA
- Reorderable content modules with Split, Wide and Callout layouts
- Per-module Holosoft Blue, Violet or Deep Violet accent
- Optional module CTA label/link
- Optional image for the page hero and every content module
- Image placement (left/right/background) and cover/contain controls

The public app resolves these records directly from published CMS content. For production static hosting, configure the web host to rewrite unknown page routes to `apps/website/dist/index.html` so direct visits such as `/solutions` load the React app.

## Partner banner and logo uploads

Open **CMS → Partners** to control the homepage partner banner. You can:

- Enable/disable the whole banner
- Edit the banner label and heading
- Set the marquee duration/speed
- Add, remove and reorder partner nodes
- Toggle each partner's visibility
- Add a website URL and short partner type/tagline
- Paste an external/logo path **or upload a logo directly**

Uploaded images are stored under `server/data/uploads/` and served from `/uploads/*`. The current prototype supports SVG, PNG, JPG, WEBP and GIF files up to 5 MB. For a scaled production deployment, move these files to object storage (for example S3/R2) while keeping the CMS field/API contract.

## Optional section images

The CMS now exposes the same reusable media control throughout the content system. An image is always optional. Editors can paste an image URL or upload SVG/PNG/JPG/WEBP/GIF files up to 5 MB, add alt text, choose placement, and select cover/contain behavior.

Media controls are available for:

- Homepage hero
- Manifesto/About section
- Services, Work and Process section headers
- Individual services, projects and process steps
- Partner banner section
- Our Team section and every team member
- Contact section
- Standalone-page heroes
- Every custom-page content block

On the public site, media is automatically treated with the Holosoft visual system: lower resting saturation, subtle blue/violet overlays, scan treatment and smoother color recovery on interaction.

## Our Team

Open **CMS → Our Team** to manage the people section. You can enable/disable the entire section, edit its label/heading/description, add optional section artwork, and create/reorder team members. Each member supports name, role/title, bio, optional email, optional profile/LinkedIn URL, visibility and an optional uploaded portrait.

The public site only renders enabled members. If a member has no image, the design uses a Holosoft system-node placeholder rather than a broken/empty photo frame.

## Motion system V2

The public interface now uses a unified motion curve instead of many short generic transitions. Reveal animations use longer eased acceleration/deceleration, the custom cursor and hero core interpolate toward pointer movement, boot-stage color/progress changes blend over time, and hover states use softer transform/color transitions. `prefers-reduced-motion` still disables non-essential movement.

## Build

```bash
npm run build
```

Static builds are produced separately:

- `apps/website/dist`
- `apps/cms/dist`

The API runs separately with:

```bash
npm start
```

## Production direction

For a real hosted deployment, point both Vite apps at the deployed API using `VITE_API_URL`, set `ALLOWED_ORIGINS`, serve everything over HTTPS, and move JSON persistence to PostgreSQL/object storage when multiple editors or horizontal scaling are required. The frontend/API separation is already in place for that migration.

## Brand-energy interaction layer

Black/white remains the structural canvas, while Holosoft's original identity colors now stay visibly present as a powered signal layer and intensify during interaction:

- Deep violet `#3F1658`
- Violet `#6F2081`
- Blue `#2153A1`

The public website uses these colors in the boot charge sequence, the gradient hero word, persistent core/orbit energy, section rails, coded labels, low-power project/process states, button and card interactions, CTA atmosphere, and a custom Holosoft cursor. The cursor combines a white targeting point, independently rotating blue/violet orbital rings, crosshair ticks, active-state expansion, and a softer trailing brand-energy field. It is enabled only for fine-pointer/desktop devices; touch devices keep native behavior. The CMS retains the same palette for authentication/core motion, field focus, active navigation, draft/live state, publish interactions, and system pulses.
