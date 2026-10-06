import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const bundledDataDir = path.resolve(__dirname, '../data');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : bundledDataDir;
const contentPath = path.join(dataDir, 'content.json');
const draftPath = path.join(dataDir, 'draft.json');
const historyDir = path.join(dataDir, 'history');
const uploadDir = path.join(dataDir, 'uploads');
const PORT = Number(process.env.PORT || 8787);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'holosoft-dev');
const localOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];
const configuredOrigins = String(process.env.ALLOWED_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);
const allowedOrigins = new Set([...localOrigins, ...configuredOrigins]);
const sessions = new Map();
const loginAttempts = new Map();
const app = express();

async function pathExists(file) {
  try { await fs.access(file); return true; }
  catch { return false; }
}
async function ensureDataStore() {
  await Promise.all([
    fs.mkdir(dataDir, { recursive: true }),
    fs.mkdir(historyDir, { recursive: true }),
    fs.mkdir(uploadDir, { recursive: true })
  ]);
  if (!(await pathExists(contentPath))) {
    await fs.copyFile(path.join(bundledDataDir, 'content.json'), contentPath);
  }
  if (!(await pathExists(draftPath))) {
    await fs.copyFile(contentPath, draftPath);
  }
}

if (!ADMIN_PASSWORD) {
  console.error('ADMIN_PASSWORD is required when NODE_ENV=production.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(cors({
  origin(origin, callback) {
    const allowed = !origin || allowedOrigins.has(origin);
    callback(allowed ? null : new Error('Origin not allowed by CORS'), allowed);
  }
}));
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(uploadDir, { maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0, fallthrough: true }));

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}
function slugify(value) {
  return String(value || 'project').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project';
}
function normalizeProject(project, index) {
  const metrics = Array.isArray(project?.metrics) ? project.metrics.slice(0, 3) : [];
  while (metrics.length < 3) metrics.push({ value: '', label: '' });
  const gallery = Array.isArray(project?.gallery) ? project.gallery.slice(0, 6) : [];
  const chapters = Array.isArray(project?.chapters) ? project.chapters.slice(0, 4) : [];
  const architectureNodes = Array.isArray(project?.architectureNodes) ? project.architectureNodes.slice(0, 6) : [];
  return {
    ...project,
    slug: project?.slug || slugify(project?.id || project?.title || `project-${index + 1}`),
    caseStudyEnabled: project?.caseStudyEnabled !== false,
    client: project?.client || '',
    year: project?.year || '',
    disciplines: project?.disciplines || '',
    caseHeading: project?.caseHeading || '',
    caseIntro: project?.caseIntro || '',
    challenge: project?.challenge || '',
    approach: project?.approach || '',
    outcome: project?.outcome || '',
    metrics: metrics.map((metric) => ({ value: metric?.value || '', label: metric?.label || '' })),
    gallery: gallery.map((item, galleryIndex) => ({
      id: item?.id || `gallery-${galleryIndex + 1}`,
      caption: item?.caption || '',
      layout: ['wide','half','tall'].includes(item?.layout) ? item.layout : 'wide',
      media: { src:'', alt:'', position:'background', fit:'cover', ...(item?.media || {}) }
    })),
    chapters: chapters.map((item, chapterIndex) => ({
      id: item?.id || `chapter-${chapterIndex + 1}`,
      label: item?.label || '',
      title: item?.title || '',
      body: item?.body || '',
      media: { src:'', alt:'', position:'background', fit:'cover', ...(item?.media || {}) }
    })),
    architectureLabel: project?.architectureLabel || '',
    architectureHeading: project?.architectureHeading || '',
    architectureBody: project?.architectureBody || '',
    architectureNodes
  };
}
function normalizeContent(content) {
  return {
    ...content,
    projects: Array.isArray(content.projects) ? content.projects.map(normalizeProject) : [],
    pages: Array.isArray(content.pages) ? content.pages : [],
    partners: Array.isArray(content.partners) ? content.partners : [],
    team: Array.isArray(content.team) ? content.team : [],
    teamSection: { enabled: true, label: 'OUR TEAM', heading: 'The people behind the system.', description: '', ...(content.teamSection || {}) },
    partnerBanner: { enabled: true, label: 'TRUSTED NETWORK', heading: 'Partners connected to the Holosoft ecosystem.', speed: 30, ...(content.partnerBanner || {}) }
  };
}
async function readPublished() { return normalizeContent(await readJson(contentPath)); }
async function readDraft() {
  try { return normalizeContent(await readJson(draftPath)); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return readPublished();
  }
}
function comparable(content) {
  const copy = structuredClone(content);
  delete copy.meta;
  return JSON.stringify(copy);
}
function adminPayload(draft, published) {
  return {
    content: draft,
    publishedVersion: Number(published.meta?.version || 0),
    hasUnpublishedChanges: comparable(draft) !== comparable(published)
  };
}
function publicContent(content) {
  return {
    ...content,
    services: (content.services || []).filter((item) => item.enabled !== false),
    projects: (content.projects || []).filter((item) => item.published !== false),
    pages: (content.pages || []).filter((item) => item.published !== false),
    partners: (content.partners || []).filter((item) => item.enabled !== false),
    team: (content.team || []).filter((item) => item.enabled !== false)
  };
}
function validateContent(payload) {
  if (!payload || typeof payload !== 'object') return 'Payload must be an object.';
  if (!payload.site?.name || !Array.isArray(payload.hero?.headline) || !Array.isArray(payload.services) || !Array.isArray(payload.projects)) return 'Required content sections are missing.';
  if (!Array.isArray(payload.process)) return 'Process must be an array.';
  if (!Array.isArray(payload.pages)) return 'Pages must be an array.';
  if (!Array.isArray(payload.partners)) return 'Partners must be an array.';
  if (!Array.isArray(payload.team)) return 'Team must be an array.';
  const slugs = payload.pages.map((page) => String(page.slug || '').trim()).filter(Boolean);
  if (slugs.length !== new Set(slugs).size) return 'Page slugs must be unique.';
  if (payload.pages.some((page) => !page.title || !page.slug)) return 'Every page needs a title and slug.';
  const projectSlugs = payload.projects.map((project) => String(project.slug || '').trim()).filter(Boolean);
  if (projectSlugs.length !== payload.projects.length) return 'Every project needs a case-study slug.';
  if (projectSlugs.length !== new Set(projectSlugs).size) return 'Project case-study slugs must be unique.';
  if (payload.projects.some((project) => project.gallery && !Array.isArray(project.gallery))) return 'Project galleries must be arrays.';
  if (payload.projects.some((project) => Array.isArray(project.gallery) && project.gallery.length > 6)) return 'Project galleries support up to 6 frames.';
  if (payload.projects.some((project) => project.chapters && !Array.isArray(project.chapters))) return 'Project chapters must be arrays.';
  if (payload.projects.some((project) => Array.isArray(project.chapters) && project.chapters.length > 4)) return 'Project chapters support up to 4 entries.';
  if (payload.projects.some((project) => project.architectureNodes && (!Array.isArray(project.architectureNodes) || project.architectureNodes.length > 6))) return 'Project architecture supports up to 6 nodes.';
  if (payload.hero.headline.length < 1 || payload.hero.headline.length > 5) return 'Hero headline must contain 1–5 lines.';
  if (!payload.site.contactEmail) return 'A contact email is required.';
  return null;
}
async function createRevision(content) {
  await fs.mkdir(historyDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const revision = path.join(historyDir, `${stamp}-v${content.meta?.version || 0}.json`);
  await fs.writeFile(revision, JSON.stringify(content, null, 2));
}
function safeRevisionName(name) {
  return path.basename(name) === name && /^[0-9TZ-]+-v\d+\.json$/.test(name);
}
function requireAuth(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  session.expiresAt = Date.now() + 1000 * 60 * 60 * 8;
  next();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'holosoft-content-api', time: new Date().toISOString() }));

app.post('/api/auth/login', (req, res) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const existing = loginAttempts.get(key);
  const attempt = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + windowMs } : existing;
  if (attempt.count >= 8) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  const password = String(req.body?.password || '');
  const supplied = Buffer.from(password);
  const expected = Buffer.from(ADMIN_PASSWORD);
  const valid = supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
  if (!valid) {
    attempt.count += 1;
    loginAttempts.set(key, attempt);
    return res.status(401).json({ error: 'Invalid password' });
  }

  loginAttempts.delete(key);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { createdAt: now, expiresAt: now + 1000 * 60 * 60 * 8 });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ token, expiresInHours: 8 });
});
app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/content', async (_req, res, next) => {
  try { res.setHeader('Cache-Control', 'no-cache'); res.json(publicContent(await readPublished())); }
  catch (error) { next(error); }
});

app.get('/api/admin/content', requireAuth, async (_req, res, next) => {
  try {
    const [draft, published] = await Promise.all([readDraft(), readPublished()]);
    res.json(adminPayload(draft, published));
  } catch (error) { next(error); }
});

app.put('/api/admin/draft', requireAuth, async (req, res, next) => {
  try {
    const validationError = validateContent(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    const published = await readPublished();
    const previousDraft = await readDraft();
    const nextDraft = {
      ...req.body,
      meta: {
        ...(req.body.meta || {}),
        version: Number(published.meta?.version || 0),
        draftVersion: Number(previousDraft.meta?.draftVersion || previousDraft.meta?.version || 0) + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: 'cms-admin'
      }
    };
    await fs.writeFile(draftPath, JSON.stringify(nextDraft, null, 2));
    res.json(adminPayload(nextDraft, published));
  } catch (error) { next(error); }
});

app.post('/api/admin/publish', requireAuth, async (req, res, next) => {
  try {
    const validationError = validateContent(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    const published = await readPublished();
    await createRevision(published);
    const now = new Date().toISOString();
    const nextPublished = {
      ...req.body,
      meta: {
        ...(req.body.meta || {}),
        version: Number(published.meta?.version || 0) + 1,
        draftVersion: Number(req.body.meta?.draftVersion || 0),
        updatedAt: now,
        publishedAt: now,
        updatedBy: 'cms-admin'
      }
    };
    await Promise.all([
      fs.writeFile(contentPath, JSON.stringify(nextPublished, null, 2)),
      fs.writeFile(draftPath, JSON.stringify(nextPublished, null, 2))
    ]);
    res.json(adminPayload(nextPublished, nextPublished));
  } catch (error) { next(error); }
});


app.post('/api/admin/media', requireAuth, async (req, res, next) => {
  try {
    const fileName = String(req.body?.fileName || 'asset').slice(0, 120);
    const mimeType = String(req.body?.mimeType || '');
    const dataUrl = String(req.body?.dataUrl || '');
    const allowed = new Map([
      ['image/png', '.png'],
      ['image/jpeg', '.jpg'],
      ['image/webp', '.webp'],
      ['image/gif', '.gif'],
      ['image/svg+xml', '.svg']
    ]);
    const extension = allowed.get(mimeType);
    if (!extension) return res.status(400).json({ error: 'Unsupported image type. Use SVG, PNG, JPG, WEBP or GIF.' });
    const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid upload payload.' });
    const buffer = Buffer.from(match[1], 'base64');
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'Image must be between 1 byte and 5 MB.' });
    await fs.mkdir(uploadDir, { recursive: true });
    const stem = path.basename(fileName, path.extname(fileName)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'asset';
    const stored = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${stem}${extension}`;
    await fs.writeFile(path.join(uploadDir, stored), buffer);
    res.status(201).json({ url: `/uploads/${stored}`, fileName: stored, size: buffer.length });
  } catch (error) { next(error); }
});

app.get('/api/admin/revisions', requireAuth, async (_req, res, next) => {
  try {
    await fs.mkdir(historyDir, { recursive: true });
    const files = (await fs.readdir(historyDir)).filter((name) => name.endsWith('.json')).sort().reverse().slice(0, 20);
    res.json({ revisions: files });
  } catch (error) { next(error); }
});

app.post('/api/admin/revisions/:name/restore', requireAuth, async (req, res, next) => {
  try {
    const name = req.params.name;
    if (!safeRevisionName(name)) return res.status(400).json({ error: 'Invalid revision name' });
    const restored = await readJson(path.join(historyDir, name));
    const current = await readPublished();
    await createRevision(current);
    const now = new Date().toISOString();
    const nextPublished = {
      ...restored,
      meta: {
        ...(restored.meta || {}),
        version: Number(current.meta?.version || 0) + 1,
        updatedAt: now,
        publishedAt: now,
        updatedBy: 'cms-restore'
      }
    };
    await Promise.all([
      fs.writeFile(contentPath, JSON.stringify(nextPublished, null, 2)),
      fs.writeFile(draftPath, JSON.stringify(nextPublished, null, 2))
    ]);
    res.json(adminPayload(nextPublished, nextPublished));
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'Revision not found' });
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

await ensureDataStore();

app.listen(PORT, () => console.log(`Holosoft API running on http://localhost:${PORT}`));
