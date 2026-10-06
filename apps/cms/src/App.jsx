import { useEffect, useMemo, useState } from 'react';
import { getContent, getRevisions, getToken, login, logout, publishContent, restoreRevision, saveDraft, setToken, uploadMedia } from './api.js';

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || 'http://localhost:5173';
const cmsAsset = (name) => `${import.meta.env.BASE_URL || '/'}assets/${name}`;
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const nav = [
  ['overview', 'Overview', '01'],
  ['home', 'Homepage', '02'],
  ['pages', 'Pages', '03'],
  ['partners', 'Partners', '04'],
  ['team', 'Our Team', '05'],
  ['services', 'Services', '06'],
  ['work', 'Projects', '07'],
  ['process', 'Process', '08'],
  ['settings', 'Settings', '09'],
  ['revisions', 'Revisions', '10']
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const slugify = (value) => String(value || 'page').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `page-${Date.now()}`;
const blankMedia = (position = 'right', fit = 'cover') => ({ src: '', alt: '', position, fit });
const resolveMedia = (src) => src?.startsWith('/uploads/') ? `${API_URL}${src}` : (src || '');

function Field({ label, value, onChange, textarea = false, type = 'text', hint = null, placeholder = '' }) {
  const Tag = textarea ? 'textarea' : 'input';
  return <label className="field"><span>{label}</span><Tag type={textarea ? undefined : type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={textarea ? 5 : undefined} placeholder={placeholder} />{hint && <small>{hint}</small>}</label>;
}

function SelectField({ label, value, onChange, options, hint = null }) {
  return <label className="field"><span>{label}</span><select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>{options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}</select>{hint && <small>{hint}</small>}</label>;
}

function Toggle({ label, checked, onChange }) {
  return <button type="button" className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><span className="toggle-track"><i /></span><span>{label}</span></button>;
}

function SectionTitle({ index, eyebrow, title, action = null }) {
  return <div className="section-title"><div><span className="section-index">[{index}]</span><p>{eyebrow}</p><h1>{title}</h1></div>{action}</div>;
}

function MediaEditor({ label = 'OPTIONAL SECTION IMAGE', media, onChange, positions = [['right','Right'],['left','Left'],['background','Background']] }) {
  const value = { ...blankMedia(), ...(media || {}) };
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const patch = (key, next) => onChange({ ...value, [key]: next });
  const upload = async (file) => {
    if (!file) return;
    setUploading(true); setError('');
    try { const result = await uploadMedia(file); onChange({ ...value, src: result.url, alt: value.alt || file.name.replace(/\.[^.]+$/, '') }); }
    catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };
  return <div className="media-editor">
    <div className="media-editor-head"><div><span>{label}</span><small>{value.src ? 'MEDIA CONNECTED' : 'OPTIONAL / EMPTY'}</small></div>{value.src && <button type="button" onClick={() => onChange(blankMedia(value.position || 'right', value.fit || 'cover'))}>REMOVE IMAGE</button>}</div>
    <div className="media-editor-grid">
      <div className="media-preview">{value.src ? <img src={resolveMedia(value.src)} alt={value.alt || ''} style={{ objectFit: value.fit || 'cover' }} /> : <div><b>NO IMAGE</b><span>Upload or paste a URL.</span></div>}</div>
      <div className="media-fields">
        <Field label="IMAGE URL / UPLOADED PATH" value={value.src} onChange={(v)=>patch('src',v)} placeholder="https://... or /uploads/..." />
        <Field label="ALT TEXT" value={value.alt} onChange={(v)=>patch('alt',v)} hint="Describe the image for accessibility and SEO." />
        <div className="two-col"><SelectField label="PLACEMENT" value={value.position || 'right'} onChange={(v)=>patch('position',v)} options={positions} /><SelectField label="IMAGE FIT" value={value.fit || 'cover'} onChange={(v)=>patch('fit',v)} options={[["cover","Cover"],["contain","Contain"]]} /></div>
        <label className="file-upload"><span>{uploading ? 'UPLOADING…' : 'UPLOAD IMAGE'}</span><input disabled={uploading} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp,image/gif" onChange={(e)=>upload(e.target.files?.[0])} /></label>
        {error && <p className="media-error">ERR // {error}</p>}
      </div>
    </div>
  </div>;
}

function Login({ onLoggedIn }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await login(password); onLoggedIn(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <main className="login-screen">
    <div className="login-grid" /><div className="login-scan" />
    <div className="login-brand"><img src={cmsAsset('holosoft-wordmark-mono.svg')} alt="Holosoft" /><span>CMS // CONTROL NODE</span></div>
    <form className="login-panel" onSubmit={submit}>
      <div className="login-core"><div className="ring r1" /><div className="ring r2" /><img src={cmsAsset('holosoft-mark.svg')} alt="" /></div>
      <p className="kicker">SECURE ADMIN INTERFACE</p><h1>Authenticate<br/><span>operator.</span></h1>
      <label className="field"><span>ACCESS KEY</span><input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" /></label>
      {error && <p className="form-error">ERR // {error}</p>}
      <button className="primary-button" disabled={busy}>{busy ? 'VERIFYING…' : 'ENTER CONTROL'} <b>→</b></button>
      {import.meta.env.DEV && <small className="login-hint">Local development fallback key: <code>holosoft-dev</code></small>}
    </form>
    <div className="login-meta"><span>NODE / CMS_01</span><span>ENCRYPTED CHANNEL</span><span>HOLOSOFT © {new Date().getFullYear()}</span></div>
  </main>;
}

function Overview({ content, dirty, hasUnpublished, onNavigate }) {
  const enabledServices = content.services.filter((x) => x.enabled).length;
  const publishedProjects = content.projects.filter((x) => x.published).length;
  const publishedPages = (content.pages || []).filter((x) => x.published).length;
  const activePartners = (content.partners || []).filter((x) => x.enabled).length;
  const teamMembers = (content.team || []).filter((x) => x.enabled).length;
  return <>
    <SectionTitle index="01 / CONTROL" eyebrow="CONTENT OPERATIONS" title="System overview" />
    <div className="stat-grid stat-grid-expanded">
      <div className="stat-card"><span>SITE STATE</span><strong>{dirty ? 'UNSAVED' : hasUnpublished ? 'DRAFT' : 'SYNCED'}</strong><p>{dirty ? 'Changes exist only in this browser session.' : hasUnpublished ? 'A saved draft exists and is waiting to be published.' : 'Draft and public website content are synchronized.'}</p></div>
      <div className="stat-card"><span>CONTENT VERSION</span><strong>V{content.meta?.version ?? 0}</strong><p>Updated {content.meta?.updatedAt ? new Date(content.meta.updatedAt).toLocaleString() : '—'}</p></div>
      <div className="stat-card"><span>PAGES LIVE</span><strong>{publishedPages}/{(content.pages || []).length}</strong><p>Standalone CMS pages currently published.</p></div>
      <div className="stat-card"><span>PARTNER NODES</span><strong>{activePartners}/{(content.partners || []).length}</strong><p>Partner records active in the homepage banner.</p></div>
      <div className="stat-card"><span>TEAM LIVE</span><strong>{teamMembers}/{(content.team || []).length}</strong><p>Team members currently visible on the public site.</p></div>
      <div className="stat-card"><span>CAPABILITIES</span><strong>{enabledServices}/{content.services.length}</strong><p>Service modules currently visible on the public site.</p></div>
      <div className="stat-card"><span>PROJECTS LIVE</span><strong>{publishedProjects}/{content.projects.length}</strong><p>Project records currently published.</p></div>
    </div>
    <div className="overview-grid">
      <section className="panel terminal-panel"><div className="panel-head"><span>PUBLIC CONTENT SIGNAL</span><i>LIVE</i></div><div className="signal-core"><img src={cmsAsset('holosoft-mark.svg')} alt="" /><div className="signal-ring a"/><div className="signal-ring b"/></div><div className="terminal-copy"><span>&gt; section.media ......... enabled</span><span>&gt; dynamic.pages ......... enabled</span><span>&gt; team.directory ........ enabled</span><span>&gt; partner.media ......... enabled</span><span>&gt; revision.history ...... enabled</span><span>&gt; interface ............. ready_</span></div></section>
      <section className="panel quick-panel"><div className="panel-head"><span>QUICK ACCESS</span><i>08 MODULES</i></div>{[['home','Edit homepage'],['pages','Manage pages'],['partners','Manage partners'],['team','Manage team'],['services','Manage services'],['work','Manage projects'],['process','Edit process'],['settings','Global settings']].map(([id,label]) => <button key={id} onClick={() => onNavigate(id)}><span>{label}</span><b>↗</b></button>)}</section>
    </div>
  </>;
}

function HomeEditor({ content, update }) {
  const hero = content.hero;
  const manifesto = content.manifesto;
  const contact = content.contact;
  const sections = content.sections;
  return <>
    <SectionTitle index="02 / PAGE" eyebrow="PUBLIC WEBSITE" title="Homepage" />
    <section className="editor-block">
      <div className="block-head"><span>HERO / PRIMARY SIGNAL</span><em>LIVE MODULE</em></div>
      <div className="two-col"><Field label="EYEBROW" value={hero.eyebrow} onChange={(v) => update(['hero','eyebrow'], v)} /><Field label="OUTLINE LINE INDEX" type="number" value={hero.outlineIndex} onChange={(v) => update(['hero','outlineIndex'], Number(v))} /><Field label="SYSTEM META LEFT" value={hero.metaLeft} onChange={(v) => update(['hero','metaLeft'], v)} /><Field label="SYSTEM META RIGHT" value={hero.metaRight} onChange={(v) => update(['hero','metaRight'], v)} /></div>
      <div className="three-col">{hero.headline.map((line, i) => <Field key={i} label={`HEADLINE ${i + 1}`} value={line} onChange={(v) => update(['hero','headline',i], v)} />)}</div>
      <Field label="INTRO" textarea value={hero.intro} onChange={(v) => update(['hero','intro'], v)} />
      <div className="two-col"><Field label="PRIMARY CTA LABEL" value={hero.primaryCta.label} onChange={(v) => update(['hero','primaryCta','label'], v)} /><Field label="PRIMARY CTA LINK" value={hero.primaryCta.href} onChange={(v) => update(['hero','primaryCta','href'], v)} /><Field label="SECONDARY CTA LABEL" value={hero.secondaryCta.label} onChange={(v) => update(['hero','secondaryCta','label'], v)} /><Field label="SECONDARY CTA LINK" value={hero.secondaryCta.href} onChange={(v) => update(['hero','secondaryCta','href'], v)} /></div>
      <MediaEditor label="HERO IMAGE / OPTIONAL" media={hero.media} onChange={(v)=>update(['hero','media'],v)} positions={[["right","Right / core"],["left","Left / copy"],["background","Background"]]} />
    </section>
    <section className="editor-block">
      <div className="block-head"><span>CORE / MANIFESTO</span><em>SECTION 01</em></div>
      <Field label="LABEL" value={manifesto.label} onChange={(v) => update(['manifesto','label'], v)} />
      <Field label="HEADING" textarea value={manifesto.heading} onChange={(v) => update(['manifesto','heading'], v)} />
      <Field label="DESCRIPTION" textarea value={manifesto.description} onChange={(v) => update(['manifesto','description'], v)} />
      <div className="two-col">{(manifesto.terminalLines || []).map((line, i) => <Field key={i} label={`TERMINAL LINE ${i + 1}`} value={line} onChange={(v) => update(['manifesto','terminalLines',i], v)} />)}</div>
      <MediaEditor media={manifesto.media} onChange={(v)=>update(['manifesto','media'],v)} />
    </section>
    <section className="editor-block">
      <div className="block-head"><span>SECTION COPY + MEDIA</span><em>02 — 04</em></div>
      <div className="section-copy-grid">{['services','work','process'].map((key) => <div className="section-copy-card" key={key}><span>{key.toUpperCase()}</span><Field label="LABEL" value={sections[key].label} onChange={(v)=>update(['sections',key,'label'],v)} /><Field label="HEADING" textarea value={sections[key].heading} onChange={(v)=>update(['sections',key,'heading'],v)} /><MediaEditor label="SECTION IMAGE" media={sections[key].media} onChange={(v)=>update(['sections',key,'media'],v)} /></div>)}</div>
    </section>
    <section className="editor-block">
      <div className="block-head"><span>CONTACT / FINAL CTA</span><em>FINAL SECTION</em></div>
      <div className="two-col"><Field label="SECTION LABEL" value={contact.label} onChange={(v) => update(['contact','label'], v)} /><Field label="CTA DISPLAY" value={contact.ctaLabel} onChange={(v) => update(['contact','ctaLabel'], v)} /></div>
      <Field label="HEADING" value={contact.heading} onChange={(v) => update(['contact','heading'], v)} />
      <Field label="SUPPORTING TEXT" textarea value={contact.subheading} onChange={(v) => update(['contact','subheading'], v)} />
      <MediaEditor label="CONTACT IMAGE / BACKDROP" media={contact.media} onChange={(v)=>update(['contact','media'],v)} positions={[["background","Background"],["right","Right"],["left","Left"]]} />
    </section>
  </>;
}

function PagesEditor({ pages, setPages }) {
  const addPage = () => {
    const id = `page-${Date.now()}`;
    setPages([...pages, { id, slug: `new-page-${pages.length + 1}`, title: 'New Page', navLabel: 'New Page', eyebrow: 'HOLOSOFT / PAGE NODE', heading: 'New page heading.', intro: 'Add an introduction for this page.', media: blankMedia('right'), published: false, showInNav: false, showContact: true, seoTitle: 'New Page — Holosoft', seoDescription: '', sections: [{ id: `block-${Date.now()}`, label: 'MODULE / 01', heading: 'First content module.', body: 'Write the page content here.', layout: 'split', accent: 'blue', ctaLabel: '', ctaHref: '', media: blankMedia('right') }] }]);
  };
  const patch = (index, key, value) => { const next = clone(pages); next[index][key] = value; setPages(next); };
  const movePage = (index, delta) => { const target = index + delta; if (target < 0 || target >= pages.length) return; const next = clone(pages); [next[index], next[target]] = [next[target], next[index]]; setPages(next); };
  const removePage = (index) => { if (!confirm(`Delete page “${pages[index].title}”?`)) return; setPages(pages.filter((_, i) => i !== index)); };
  const patchBlock = (pageIndex, blockIndex, key, value) => { const next = clone(pages); next[pageIndex].sections[blockIndex][key] = value; setPages(next); };
  const addBlock = (pageIndex) => { const next = clone(pages); next[pageIndex].sections ||= []; next[pageIndex].sections.push({ id: `block-${Date.now()}`, label: `MODULE / ${String(next[pageIndex].sections.length + 1).padStart(2,'0')}`, heading: 'New content module.', body: 'Write the section content here.', layout: 'split', accent: 'violet', ctaLabel: '', ctaHref: '', media: blankMedia('right') }); setPages(next); };
  const removeBlock = (pageIndex, blockIndex) => { if (!confirm('Delete this page section?')) return; const next = clone(pages); next[pageIndex].sections.splice(blockIndex, 1); setPages(next); };
  const moveBlock = (pageIndex, blockIndex, delta) => { const next = clone(pages); const blocks = next[pageIndex].sections; const target = blockIndex + delta; if (target < 0 || target >= blocks.length) return; [blocks[blockIndex], blocks[target]] = [blocks[target], blocks[blockIndex]]; setPages(next); };
  return <>
    <SectionTitle index="03 / ROUTES" eyebrow="DYNAMIC CONTENT" title="Pages" action={<button className="outline-button" onClick={addPage}>+ NEW PAGE</button>} />
    <div className="module-notice"><span>AUTO ROUTING + MEDIA</span><p>Every page hero and every content block can optionally carry its own image. Published pages remain available at <code>/your-slug</code>.</p></div>
    <div className="item-stack">{pages.map((page, pageIndex) => <section className="content-item page-record" key={page.id}>
      <div className="item-rail"><span>/{page.slug}</span><div><button onClick={() => movePage(pageIndex,-1)}>↑</button><button onClick={() => movePage(pageIndex,1)}>↓</button></div></div>
      <div className="item-body">
        <div className="item-header"><div><p>PAGE ROUTE / {String(pageIndex + 1).padStart(2,'0')}</p><h2>{page.title}</h2><a className="record-route" href={`${WEBSITE_URL}/${page.slug}`} target="_blank" rel="noreferrer">/{page.slug} ↗</a></div><div className="toggle-stack"><Toggle label="Published" checked={page.published} onChange={(v)=>patch(pageIndex,'published',v)} /><Toggle label="Show in navigation" checked={page.showInNav} onChange={(v)=>patch(pageIndex,'showInNav',v)} /><Toggle label="Show contact CTA" checked={page.showContact !== false} onChange={(v)=>patch(pageIndex,'showContact',v)} /></div></div>
        <div className="two-col"><Field label="PAGE TITLE" value={page.title} onChange={(v)=>patch(pageIndex,'title',v)} /><Field label="URL SLUG" value={page.slug} onChange={(v)=>patch(pageIndex,'slug',slugify(v))} hint="Unique URL segment. Example: solutions" /><Field label="NAV LABEL" value={page.navLabel} onChange={(v)=>patch(pageIndex,'navLabel',v)} /><Field label="EYEBROW" value={page.eyebrow} onChange={(v)=>patch(pageIndex,'eyebrow',v)} /></div>
        <Field label="PAGE HEADING" value={page.heading} onChange={(v)=>patch(pageIndex,'heading',v)} />
        <Field label="INTRODUCTION" textarea value={page.intro} onChange={(v)=>patch(pageIndex,'intro',v)} />
        <MediaEditor label="PAGE HERO IMAGE / OPTIONAL" media={page.media} onChange={(v)=>patch(pageIndex,'media',v)} positions={[["right","Right"],["left","Left"],["background","Background"]]} />
        <div className="two-col"><Field label="SEO TITLE" value={page.seoTitle} onChange={(v)=>patch(pageIndex,'seoTitle',v)} /><Field label="SEO DESCRIPTION" textarea value={page.seoDescription} onChange={(v)=>patch(pageIndex,'seoDescription',v)} /></div>
        <div className="submodule-head"><div><span>CONTENT MODULES</span><em>{(page.sections || []).length} BLOCKS</em></div><button className="mini-action" onClick={()=>addBlock(pageIndex)}>+ ADD SECTION</button></div>
        <div className="page-block-editor">{(page.sections || []).map((block, blockIndex) => <div className="page-block-admin" key={block.id}>
          <div className="page-block-admin-head"><span>{String(blockIndex + 1).padStart(2,'0')} / {block.label || 'MODULE'}</span><div><button onClick={()=>moveBlock(pageIndex,blockIndex,-1)}>↑</button><button onClick={()=>moveBlock(pageIndex,blockIndex,1)}>↓</button><button className="danger-mini" onClick={()=>removeBlock(pageIndex,blockIndex)}>×</button></div></div>
          <div className="three-col"><Field label="MODULE LABEL" value={block.label} onChange={(v)=>patchBlock(pageIndex,blockIndex,'label',v)} /><SelectField label="LAYOUT" value={block.layout || 'split'} onChange={(v)=>patchBlock(pageIndex,blockIndex,'layout',v)} options={[["split","Split"],["wide","Wide"],["callout","Callout"]]} /><SelectField label="ACCENT" value={block.accent || 'blue'} onChange={(v)=>patchBlock(pageIndex,blockIndex,'accent',v)} options={[["blue","Holosoft Blue"],["violet","Holosoft Violet"],["deep","Deep Violet"]]} /></div>
          <Field label="HEADING" value={block.heading} onChange={(v)=>patchBlock(pageIndex,blockIndex,'heading',v)} />
          <Field label="BODY" textarea value={block.body} onChange={(v)=>patchBlock(pageIndex,blockIndex,'body',v)} hint="Use line breaks to create separate paragraphs." />
          <MediaEditor label="SECTION IMAGE / OPTIONAL" media={block.media} onChange={(v)=>patchBlock(pageIndex,blockIndex,'media',v)} />
          <div className="two-col"><Field label="OPTIONAL CTA LABEL" value={block.ctaLabel || ''} onChange={(v)=>patchBlock(pageIndex,blockIndex,'ctaLabel',v)} /><Field label="OPTIONAL CTA LINK" value={block.ctaHref || ''} onChange={(v)=>patchBlock(pageIndex,blockIndex,'ctaHref',v)} /></div>
        </div>)}</div>
        <button className="danger-button" onClick={() => removePage(pageIndex)}>DELETE PAGE</button>
      </div>
    </section>)}</div>
  </>;
}

function PartnersEditor({ content, update }) {
  const partners = content.partners || [];
  const settings = content.partnerBanner || {};
  const [uploading, setUploading] = useState('');
  const [uploadError, setUploadError] = useState('');
  const setPartners = (next) => update(['partners'], next);
  const add = () => setPartners([...partners, { id: `partner-${Date.now()}`, name: 'New Partner', logo: '', href: '', tagline: 'CONNECTED NODE', enabled: true }]);
  const patch = (index, key, value) => { const next = clone(partners); next[index][key] = value; setPartners(next); };
  const move = (index, delta) => { const target = index + delta; if (target < 0 || target >= partners.length) return; const next = clone(partners); [next[index], next[target]] = [next[target], next[index]]; setPartners(next); };
  const remove = (index) => { if (!confirm(`Delete partner “${partners[index].name}”?`)) return; setPartners(partners.filter((_, i) => i !== index)); };
  const handleUpload = async (index, file) => {
    if (!file) return;
    setUploading(partners[index].id); setUploadError('');
    try { const result = await uploadMedia(file); patch(index, 'logo', result.url); }
    catch (err) { setUploadError(err.message); }
    finally { setUploading(''); }
  };
  return <>
    <SectionTitle index="04 / NETWORK" eyebrow="PARTNER BANNER" title="Partners" action={<button className="outline-button" onClick={add}>+ NEW PARTNER</button>} />
    <section className="editor-block partner-settings">
      <div className="block-head"><span>BANNER / GLOBAL CONTROL</span><em>HOMEPAGE MODULE</em></div>
      <div className="settings-toggle-row"><Toggle label="Show partner banner" checked={settings.enabled !== false} onChange={(v)=>update(['partnerBanner','enabled'],v)} /></div>
      <div className="two-col"><Field label="BANNER LABEL" value={settings.label || ''} onChange={(v)=>update(['partnerBanner','label'],v)} /><Field label="SCROLL SPEED / SECONDS" type="number" value={settings.speed || 30} onChange={(v)=>update(['partnerBanner','speed'],Math.max(12, Number(v) || 30))} /></div>
      <Field label="BANNER HEADING" value={settings.heading || ''} onChange={(v)=>update(['partnerBanner','heading'],v)} />
      <MediaEditor label="PARTNER SECTION IMAGE / OPTIONAL" media={settings.media} onChange={(v)=>update(['partnerBanner','media'],v)} positions={[["background","Background"],["right","Right"],["left","Left"]]} />
      <p className="editor-hint">Partner logos run as a smooth horizontal system banner. Hovering the banner pauses it for easier reading.</p>
    </section>
    {uploadError && <div className="error-banner"><span>UPLOAD //</span>{uploadError}<button onClick={()=>setUploadError('')}>×</button></div>}
    <div className="item-stack">{partners.map((partner,index)=><section className="content-item partner-record" key={partner.id}>
      <div className="item-rail"><span>NODE_{String(index + 1).padStart(2,'0')}</span><div><button onClick={()=>move(index,-1)}>↑</button><button onClick={()=>move(index,1)}>↓</button></div></div>
      <div className="item-body">
        <div className="item-header"><div><p>PARTNER NODE</p><h2>{partner.name}</h2></div><Toggle label="Visible" checked={partner.enabled} onChange={(v)=>patch(index,'enabled',v)} /></div>
        <div className="partner-admin-grid">
          <div className="partner-preview"><span>LOGO PREVIEW</span><div>{partner.logo ? <img src={resolveMedia(partner.logo)} alt={partner.name} /> : <strong>{partner.name}</strong>}</div><small>{partner.logo || 'No logo uploaded — text fallback active.'}</small></div>
          <div className="partner-fields"><Field label="PARTNER NAME" value={partner.name} onChange={(v)=>patch(index,'name',v)} /><Field label="TAGLINE / TYPE" value={partner.tagline || ''} onChange={(v)=>patch(index,'tagline',v)} /><Field label="PARTNER WEBSITE" value={partner.href || ''} onChange={(v)=>patch(index,'href',v)} placeholder="https://..." /><Field label="LOGO URL / UPLOADED PATH" value={partner.logo || ''} onChange={(v)=>patch(index,'logo',v)} hint="Paste a URL, use a local public path, or upload below." /><label className="file-upload"><span>{uploading === partner.id ? 'UPLOADING…' : 'UPLOAD PARTNER LOGO'}</span><input disabled={Boolean(uploading)} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp,image/gif" onChange={(e)=>handleUpload(index,e.target.files?.[0])} /></label></div>
        </div>
        <button className="danger-button" onClick={()=>remove(index)}>DELETE PARTNER</button>
      </div>
    </section>)}</div>
  </>;
}

function TeamEditor({ content, update }) {
  const members = content.team || [];
  const settings = content.teamSection || {};
  const setMembers = (next) => update(['team'], next);
  const add = () => setMembers([...members, { id: `team-${Date.now()}`, name: 'New Team Member', role: 'Role / Discipline', bio: 'Add a short bio.', email: '', linkedin: '', enabled: true, media: blankMedia('top') }]);
  const patch = (index, key, value) => { const next = clone(members); next[index][key] = value; setMembers(next); };
  const move = (index, delta) => { const target = index + delta; if (target < 0 || target >= members.length) return; const next = clone(members); [next[index], next[target]] = [next[target], next[index]]; setMembers(next); };
  const remove = (index) => { if (!confirm(`Delete team member “${members[index].name}”?`)) return; setMembers(members.filter((_, i)=>i !== index)); };
  return <>
    <SectionTitle index="05 / PEOPLE" eyebrow="TEAM DIRECTORY" title="Our Team" action={<button className="outline-button" onClick={add}>+ NEW MEMBER</button>} />
    <section className="editor-block">
      <div className="block-head"><span>TEAM SECTION / GLOBAL</span><em>HOMEPAGE MODULE</em></div>
      <div className="settings-toggle-row"><Toggle label="Show Our Team section" checked={settings.enabled !== false} onChange={(v)=>update(['teamSection','enabled'],v)} /></div>
      <div className="two-col"><Field label="SECTION LABEL" value={settings.label || ''} onChange={(v)=>update(['teamSection','label'],v)} /><Field label="SECTION HEADING" value={settings.heading || ''} onChange={(v)=>update(['teamSection','heading'],v)} /></div>
      <Field label="SECTION DESCRIPTION" textarea value={settings.description || ''} onChange={(v)=>update(['teamSection','description'],v)} />
      <MediaEditor label="TEAM SECTION IMAGE / OPTIONAL" media={settings.media} onChange={(v)=>update(['teamSection','media'],v)} positions={[["background","Background"],["right","Right"],["left","Left"]]} />
    </section>
    <div className="item-stack">{members.map((member,index)=><section className="content-item team-record" key={member.id}>
      <div className="item-rail"><span>PERSON_{String(index+1).padStart(2,'0')}</span><div><button onClick={()=>move(index,-1)}>↑</button><button onClick={()=>move(index,1)}>↓</button></div></div>
      <div className="item-body">
        <div className="item-header"><div><p>TEAM MEMBER</p><h2>{member.name}</h2></div><Toggle label="Visible" checked={member.enabled !== false} onChange={(v)=>patch(index,'enabled',v)} /></div>
        <div className="two-col"><Field label="NAME" value={member.name} onChange={(v)=>patch(index,'name',v)} /><Field label="ROLE / TITLE" value={member.role} onChange={(v)=>patch(index,'role',v)} /><Field label="EMAIL / OPTIONAL" value={member.email || ''} onChange={(v)=>patch(index,'email',v)} /><Field label="LINKEDIN / PROFILE URL" value={member.linkedin || ''} onChange={(v)=>patch(index,'linkedin',v)} placeholder="https://..." /></div>
        <Field label="SHORT BIO" textarea value={member.bio || ''} onChange={(v)=>patch(index,'bio',v)} />
        <MediaEditor label="MEMBER PHOTO / OPTIONAL" media={member.media} onChange={(v)=>patch(index,'media',v)} positions={[["top","Top / portrait"],["left","Left"],["right","Right"]]} />
        <button className="danger-button" onClick={()=>remove(index)}>DELETE MEMBER</button>
      </div>
    </section>)}</div>
  </>;
}

function ListEditor({ type, items, setItems }) {
  const isService = type === 'services';
  const add = () => {
    const no = String(items.length + 1).padStart(2, '0');
    const item = isService
      ? { id: `service-${Date.now()}`, no, title: 'New Capability', description: 'Describe the capability.', tag: 'TECH / BUILD', href: '', linkNewTab: false, enabled: true, media: blankMedia('right') }
      : { id: `project-${Date.now()}`, code: `CASE_${String(items.length + 1).padStart(3,'0')}`, slug: `new-project-${items.length + 1}`, type: 'DIGITAL SYSTEM', title: 'New Project', description: 'Describe the system and outcome.', visual: 'network', featured: false, published: false, caseStudyEnabled: true, client: '', year: '', disciplines: '', caseHeading: '', caseIntro: '', challenge: '', approach: '', outcome: '', metrics: [{value:'',label:''},{value:'',label:''},{value:'',label:''}], gallery: [], chapters: [], architectureLabel: '', architectureHeading: '', architectureBody: '', architectureNodes: [], media: blankMedia('background') };
    setItems([...items, item]);
  };
  const patch = (index, key, value) => { const next = clone(items); next[index][key] = value; setItems(next); };
  const patchMetric = (index, metricIndex, key, value) => { const next = clone(items); next[index].metrics ||= [{value:'',label:''},{value:'',label:''},{value:'',label:''}]; while (next[index].metrics.length < 3) next[index].metrics.push({value:'',label:''}); next[index].metrics[metricIndex] = { ...next[index].metrics[metricIndex], [key]: value }; setItems(next); };
  const patchGallery = (index, galleryIndex, key, value) => { const next = clone(items); next[index].gallery ||= []; next[index].gallery[galleryIndex] = { ...next[index].gallery[galleryIndex], [key]: value }; setItems(next); };
  const addGallery = (index) => { const next = clone(items); next[index].gallery ||= []; if (next[index].gallery.length >= 6) return; next[index].gallery.push({ id:`gallery-${Date.now()}`, caption:'', layout:'wide', media:blankMedia('background') }); setItems(next); };
  const removeGallery = (index, galleryIndex) => { const next = clone(items); next[index].gallery ||= []; next[index].gallery.splice(galleryIndex,1); setItems(next); };
  const moveGallery = (index, galleryIndex, delta) => { const next = clone(items); const gallery = next[index].gallery || []; const target = galleryIndex + delta; if (target < 0 || target >= gallery.length) return; [gallery[galleryIndex],gallery[target]]=[gallery[target],gallery[galleryIndex]]; setItems(next); };
  const patchChapter = (index, chapterIndex, key, value) => { const next = clone(items); next[index].chapters ||= []; next[index].chapters[chapterIndex] = { ...next[index].chapters[chapterIndex], [key]: value }; setItems(next); };
  const addChapter = (index) => { const next = clone(items); next[index].chapters ||= []; if (next[index].chapters.length >= 4) return; next[index].chapters.push({ id:`chapter-${Date.now()}`, label:`CHAPTER / ${String(next[index].chapters.length + 1).padStart(2,'0')}`, title:'New story chapter', body:'', media:blankMedia('background') }); setItems(next); };
  const removeChapter = (index, chapterIndex) => { const next = clone(items); next[index].chapters ||= []; next[index].chapters.splice(chapterIndex,1); setItems(next); };
  const moveChapter = (index, chapterIndex, delta) => { const next = clone(items); const chapters = next[index].chapters || []; const target = chapterIndex + delta; if (target < 0 || target >= chapters.length) return; [chapters[chapterIndex],chapters[target]]=[chapters[target],chapters[chapterIndex]]; setItems(next); };
  const patchArchitectureNode = (index, nodeIndex, value) => { const next = clone(items); next[index].architectureNodes ||= []; while(next[index].architectureNodes.length <= nodeIndex) next[index].architectureNodes.push(''); next[index].architectureNodes[nodeIndex] = value; setItems(next); };
  const remove = (index) => { if (!confirm('Delete this content item?')) return; setItems(items.filter((_, i) => i !== index)); };
  const move = (index, delta) => { const target = index + delta; if (target < 0 || target >= items.length) return; const next = clone(items); [next[index], next[target]] = [next[target], next[index]]; setItems(next); };

  return <>
    <SectionTitle index={isService ? '06 / MODULES' : '07 / SYSTEMS'} eyebrow={isService ? 'CAPABILITIES' : 'CASE STUDIES'} title={isService ? 'Services' : 'Projects'} action={<button className="outline-button" onClick={add}>+ NEW {isService ? 'SERVICE' : 'PROJECT'}</button>} />
    {!isService && <div className="module-notice"><span>CASE STUDY ENGINE / V2</span><p>Build cinematic project stories with gallery frames, scroll chapters and architecture maps. Every module is optional and hidden automatically when empty.</p></div>}
    <div className="item-stack">{items.map((item, index) => <section className={`content-item ${!isService ? 'project-record' : ''}`} key={item.id}>
      <div className="item-rail"><span>{isService ? item.no : item.code}</span><div><button onClick={() => move(index,-1)}>↑</button><button onClick={() => move(index,1)}>↓</button></div></div>
      <div className="item-body">
        <div className="item-header"><div><p>{isService ? 'SERVICE MODULE' : 'PROJECT RECORD'}</p><h2>{item.title}</h2>{!isService && item.slug && <a className="record-route" href={`${WEBSITE_URL.replace(/\/$/,'')}/work/${item.slug}`} target="_blank" rel="noreferrer">/work/{item.slug} ↗</a>}</div><div className="toggle-stack"><Toggle label={isService ? 'Visible' : 'Published'} checked={isService ? item.enabled : item.published} onChange={(v) => patch(index, isService ? 'enabled' : 'published', v)} />{!isService && <Toggle label="Case study page" checked={item.caseStudyEnabled !== false} onChange={(v)=>patch(index,'caseStudyEnabled',v)} />}</div></div>
        <div className="two-col"><Field label={isService ? 'NUMBER' : 'CASE CODE'} value={isService ? item.no : item.code} onChange={(v) => patch(index, isService ? 'no' : 'code', v)} /><Field label="TITLE" value={item.title} onChange={(v) => patch(index,'title',v)} />{isService ? <Field label="TAG" value={item.tag} onChange={(v) => patch(index,'tag',v)} /> : <><Field label="TYPE" value={item.type} onChange={(v) => patch(index,'type',v)} /><SelectField label="VISUAL MODE" value={item.visual} onChange={(v) => patch(index,'visual',v)} options={[["network","Network"],["ui","Interface"],["console","Console"]]} /></>}</div>
        <Field label="DESCRIPTION" textarea value={item.description} onChange={(v) => patch(index,'description',v)} />
        {isService && <div className="service-link-admin"><div className="submodule-head"><div><span>SERVICE LINK / OPTIONAL</span><em>ROW ACTION</em></div></div><Field label="LINK TARGET" value={item.href || ''} onChange={(v)=>patch(index,'href',v)} placeholder="#contact, /about-holosoft, /work/project-slug, https://..." hint="Leave blank to keep this service non-clickable. Supports page routes, section anchors, external URLs, mailto: and tel: links." /><Toggle label="Open in new tab" checked={Boolean(item.linkNewTab)} onChange={(v)=>patch(index,'linkNewTab',v)} /></div>}
        <MediaEditor label={`${isService ? 'SERVICE' : 'PROJECT'} IMAGE / OPTIONAL`} media={item.media} onChange={(v)=>patch(index,'media',v)} positions={isService ? [["right","Right thumbnail"],["left","Left thumbnail"],["background","Background"]] : [["background","Visual background"],["right","Right"],["left","Left"]]} />
        {!isService && <>
          <div className="case-study-admin">
            <div className="submodule-head"><div><span>CASE STUDY PAGE</span><em>STORY / PROOF / ROUTE</em></div></div>
            <div className="three-col"><Field label="URL SLUG" value={item.slug || slugify(item.title)} onChange={(v)=>patch(index,'slug',slugify(v))} /><Field label="CLIENT / OPTIONAL" value={item.client || ''} onChange={(v)=>patch(index,'client',v)} /><Field label="YEAR / OPTIONAL" value={item.year || ''} onChange={(v)=>patch(index,'year',v)} /></div>
            <Field label="DISCIPLINES / SERVICES" value={item.disciplines || ''} onChange={(v)=>patch(index,'disciplines',v)} placeholder="Strategy / UX / Engineering" />
            <Field label="CASE STUDY HEADING / OPTIONAL" value={item.caseHeading || ''} onChange={(v)=>patch(index,'caseHeading',v)} />
            <Field label="CASE STUDY INTRO / OPTIONAL" textarea value={item.caseIntro || ''} onChange={(v)=>patch(index,'caseIntro',v)} />
            <div className="case-story-admin-grid"><Field label="CHALLENGE" textarea value={item.challenge || ''} onChange={(v)=>patch(index,'challenge',v)} /><Field label="APPROACH" textarea value={item.approach || ''} onChange={(v)=>patch(index,'approach',v)} /><Field label="OUTCOME" textarea value={item.outcome || ''} onChange={(v)=>patch(index,'outcome',v)} /></div>

            <div className="submodule-head"><div><span>CINEMATIC GALLERY</span><em>{(item.gallery || []).length} / 6 FRAMES</em></div><button className="mini-action" type="button" disabled={(item.gallery || []).length >= 6} onClick={()=>addGallery(index)}>+ ADD FRAME</button></div>
            <div className="case-gallery-admin-list">{(item.gallery || []).map((frame,frameIndex) => <div className="case-gallery-admin" key={frame.id || frameIndex}>
              <div className="case-module-toolbar"><span>FRAME {String(frameIndex + 1).padStart(2,'0')}</span><div><button onClick={()=>moveGallery(index,frameIndex,-1)}>↑</button><button onClick={()=>moveGallery(index,frameIndex,1)}>↓</button><button className="danger-mini" onClick={()=>removeGallery(index,frameIndex)}>×</button></div></div>
              <div className="two-col"><Field label="CAPTION" value={frame.caption || ''} onChange={(v)=>patchGallery(index,frameIndex,'caption',v)} /><SelectField label="LAYOUT" value={frame.layout || 'wide'} onChange={(v)=>patchGallery(index,frameIndex,'layout',v)} options={[["wide","Wide / Cinematic"],["half","Half width"],["tall","Tall / Portrait"]]} /></div>
              <MediaEditor label="GALLERY IMAGE" media={frame.media} onChange={(v)=>patchGallery(index,frameIndex,'media',v)} positions={[["background","Frame"]]} />
            </div>)}</div>

            <div className="submodule-head"><div><span>SCROLL STORY</span><em>{(item.chapters || []).length} / 4 CHAPTERS</em></div><button className="mini-action" type="button" disabled={(item.chapters || []).length >= 4} onClick={()=>addChapter(index)}>+ ADD CHAPTER</button></div>
            <div className="case-chapter-admin-list">{(item.chapters || []).map((chapter,chapterIndex) => <div className="case-chapter-admin" key={chapter.id || chapterIndex}>
              <div className="case-module-toolbar"><span>CHAPTER {String(chapterIndex + 1).padStart(2,'0')}</span><div><button onClick={()=>moveChapter(index,chapterIndex,-1)}>↑</button><button onClick={()=>moveChapter(index,chapterIndex,1)}>↓</button><button className="danger-mini" onClick={()=>removeChapter(index,chapterIndex)}>×</button></div></div>
              <div className="two-col"><Field label="LABEL" value={chapter.label || ''} onChange={(v)=>patchChapter(index,chapterIndex,'label',v)} /><Field label="TITLE" value={chapter.title || ''} onChange={(v)=>patchChapter(index,chapterIndex,'title',v)} /></div>
              <Field label="BODY" textarea value={chapter.body || ''} onChange={(v)=>patchChapter(index,chapterIndex,'body',v)} />
              <MediaEditor label="CHAPTER VISUAL / OPTIONAL" media={chapter.media} onChange={(v)=>patchChapter(index,chapterIndex,'media',v)} positions={[["background","Pinned visual"]]} />
            </div>)}</div>

            <div className="submodule-head"><div><span>ARCHITECTURE MAP</span><em>OPTIONAL / 6 NODES</em></div></div>
            <div className="two-col"><Field label="MAP LABEL" value={item.architectureLabel || ''} onChange={(v)=>patch(index,'architectureLabel',v)} /><Field label="MAP HEADING" value={item.architectureHeading || ''} onChange={(v)=>patch(index,'architectureHeading',v)} /></div>
            <Field label="MAP DESCRIPTION" textarea value={item.architectureBody || ''} onChange={(v)=>patch(index,'architectureBody',v)} />
            <div className="architecture-node-admin-grid">{[0,1,2,3,4,5].map((nodeIndex) => <Field key={nodeIndex} label={`NODE ${String(nodeIndex + 1).padStart(2,'0')}`} value={item.architectureNodes?.[nodeIndex] || ''} onChange={(v)=>patchArchitectureNode(index,nodeIndex,v)} placeholder="API / CLOUD / DEVICE..." />)}</div>

            <div className="submodule-head"><div><span>VERIFIED RESULTS</span><em>OPTIONAL / UP TO 3</em></div></div>
            <div className="case-metric-admin-grid">{[0,1,2].map((metricIndex) => <div className="case-metric-admin" key={metricIndex}><span>METRIC {String(metricIndex + 1).padStart(2,'0')}</span><Field label="VALUE" value={item.metrics?.[metricIndex]?.value || ''} onChange={(v)=>patchMetric(index,metricIndex,'value',v)} placeholder="42%" /><Field label="LABEL" value={item.metrics?.[metricIndex]?.label || ''} onChange={(v)=>patchMetric(index,metricIndex,'label',v)} placeholder="Faster workflow" /></div>)}</div>
          </div>
          <Toggle label="Feature as large card" checked={item.featured} onChange={(v) => patch(index,'featured',v)} />
        </>}
        <button className="danger-button" onClick={() => remove(index)}>DELETE RECORD</button>
      </div>
    </section>)}</div>
  </>;
}

function ProcessEditor({ items, setItems }) {
  const patch = (index, key, value) => { const next = clone(items); next[index][key] = value; setItems(next); };
  return <><SectionTitle index="08 / PROTOCOL" eyebrow="DELIVERY SYSTEM" title="Process" /><div className="process-admin-grid">{items.map((item,index)=><section className="editor-block compact" key={item.id}><div className="block-head"><span>STEP {item.no}</span><em>{item.id.toUpperCase()}</em></div><Field label="TITLE" value={item.title} onChange={(v)=>patch(index,'title',v)} /><Field label="DESCRIPTION" textarea value={item.description} onChange={(v)=>patch(index,'description',v)} /><MediaEditor label="STEP IMAGE / OPTIONAL" media={item.media} onChange={(v)=>patch(index,'media',v)} positions={[["right","Right"],["left","Left"],["background","Background"]]} /></section>)}</div></>;
}

function SettingsEditor({ content, update }) {
  return <>
    <SectionTitle index="09 / GLOBAL" eyebrow="SITE CONFIGURATION" title="Settings" />
    <section className="editor-block"><div className="block-head"><span>IDENTITY / META</span><em>GLOBAL</em></div><div className="two-col"><Field label="SITE NAME" value={content.site.name} onChange={(v)=>update(['site','name'],v)} /><Field label="BROWSER TITLE" value={content.site.title} onChange={(v)=>update(['site','title'],v)} /><Field label="CONTACT EMAIL" value={content.site.contactEmail} onChange={(v)=>update(['site','contactEmail'],v)} /><Field label="STATUS LABEL" value={content.site.statusLabel} onChange={(v)=>update(['site','statusLabel'],v)} /><Field label="HEADER CTA LABEL" value={content.site.headerCta?.label || ''} onChange={(v)=>update(['site','headerCta','label'],v)} /><Field label="HEADER CTA LINK" value={content.site.headerCta?.href || ''} onChange={(v)=>update(['site','headerCta','href'],v)} /></div><Field label="META DESCRIPTION" textarea value={content.site.description} onChange={(v)=>update(['site','description'],v)} /></section>
    <section className="editor-block"><div className="block-head"><span>HOMEPAGE NAVIGATION</span><em>{content.site.navigation.length} LINKS</em></div><p className="editor-hint nav-hint">These are homepage anchor links. CMS pages marked “Show in navigation” are added automatically after these links.</p>{content.site.navigation.map((item,index)=><div className="nav-edit-row" key={index}><Field label={`LABEL ${index+1}`} value={item.label} onChange={(v)=>update(['site','navigation',index,'label'],v)} /><Field label="ANCHOR" value={item.href} onChange={(v)=>update(['site','navigation',index,'href'],v)} /></div>)}</section>
  </>;
}

function Revisions({ revisions, loading, onRestore, restoring }) {
  return <><SectionTitle index="10 / HISTORY" eyebrow="CONTENT SAFETY" title="Revision snapshots" /><section className="panel revisions-panel"><div className="panel-head"><span>PUBLISHED SNAPSHOTS</span><i>AUTO ON PUBLISH</i></div>{loading ? <p className="empty-state">Reading revision log…</p> : revisions.length ? revisions.map((name,i)=><div className="revision-row" key={name}><span>{String(i+1).padStart(2,'0')}</span><code>{name}</code><button disabled={restoring===name} onClick={()=>onRestore(name)}>{restoring===name ? 'RESTORING…' : 'RESTORE'}</button></div>) : <p className="empty-state">No revisions yet. The previous live version is archived automatically each time you publish.</p>}</section></>;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [content, setContent] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [section, setSection] = useState('overview');
  const [status, setStatus] = useState('CONNECTING');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [hasUnpublished, setHasUnpublished] = useState(false);
  const [restoring, setRestoring] = useState('');
  const [revisions, setRevisions] = useState([]);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const dirty = useMemo(() => content && baseline ? JSON.stringify(content) !== JSON.stringify(baseline) : false, [content, baseline]);

  const hydrate = (value) => ({
    ...value,
    pages: value.pages || [],
    partners: value.partners || [],
    team: value.team || [],
    teamSection: { enabled: true, label: 'OUR TEAM', heading: 'The people behind the system.', description: '', media: blankMedia('background'), ...(value.teamSection || {}) },
    partnerBanner: { enabled: true, label: 'TRUSTED NETWORK', heading: 'Partners connected to the Holosoft ecosystem.', speed: 30, media: blankMedia('background'), ...(value.partnerBanner || {}) }
  });
  const load = async () => {
    setStatus('SYNCING'); setError('');
    try { const data = await getContent(); const next = hydrate(data.content); setContent(next); setBaseline(clone(next)); setHasUnpublished(Boolean(data.hasUnpublishedChanges)); setAuthenticated(true); setStatus('ONLINE'); }
    catch (err) { if (err.status === 401) { setToken(null); setAuthenticated(false); } else { setError(err.message); setStatus('ERROR'); } }
  };
  useEffect(() => { if (authenticated) load(); }, [authenticated]);
  useEffect(() => { if (authenticated && section === 'revisions') { setRevisionLoading(true); getRevisions().then((r)=>setRevisions(r.revisions || [])).catch((e)=>setError(e.message)).finally(()=>setRevisionLoading(false)); } }, [section, authenticated]);

  const update = (path, value) => { setContent((current) => { const next = clone(current); let target = next; path.slice(0,-1).forEach((key) => { if (target[key] == null) target[key] = {}; target = target[key]; }); target[path.at(-1)] = value; return next; }); };
  const save = async () => { setSaving(true); setError(''); try { const result = await saveDraft(content); const next = hydrate(result.content); setContent(next); setBaseline(clone(next)); setHasUnpublished(Boolean(result.hasUnpublishedChanges)); setStatus('DRAFT SAVED'); } catch (err) { setError(err.message); if (err.status === 401) { setToken(null); setAuthenticated(false); } } finally { setSaving(false); } };
  const publish = async () => { setPublishing(true); setError(''); try { const result = await publishContent(content); const next = hydrate(result.content); setContent(next); setBaseline(clone(next)); setHasUnpublished(false); setStatus('ONLINE'); } catch (err) { setError(err.message); if (err.status === 401) { setToken(null); setAuthenticated(false); } } finally { setPublishing(false); } };
  const restore = async (name) => { if (!confirm(`Restore published revision ${name}? Current live content will be snapshotted first.`)) return; setRestoring(name); setError(''); try { const result = await restoreRevision(name); const next = hydrate(result.content); setContent(next); setBaseline(clone(next)); setHasUnpublished(false); setStatus('RESTORED'); const r = await getRevisions(); setRevisions(r.revisions || []); } catch (err) { setError(err.message); } finally { setRestoring(''); } };
  const doLogout = async () => { await logout(); setAuthenticated(false); setContent(null); };

  if (!authenticated) return <Login onLoggedIn={() => setAuthenticated(true)} />;
  if (!content) return <main className="loading-screen"><div className="loading-core"><img src={cmsAsset('holosoft-mark.svg')} alt="" /></div><span>CMS / {status}</span>{error && <p>{error}</p>}</main>;

  let page;
  if (section === 'overview') page = <Overview content={content} dirty={dirty} hasUnpublished={hasUnpublished} onNavigate={setSection} />;
  else if (section === 'home') page = <HomeEditor content={content} update={update} />;
  else if (section === 'pages') page = <PagesEditor pages={content.pages} setPages={(items)=>update(['pages'],items)} />;
  else if (section === 'partners') page = <PartnersEditor content={content} update={update} />;
  else if (section === 'team') page = <TeamEditor content={content} update={update} />;
  else if (section === 'services') page = <ListEditor type="services" items={content.services} setItems={(items)=>update(['services'],items)} />;
  else if (section === 'work') page = <ListEditor type="projects" items={content.projects} setItems={(items)=>update(['projects'],items)} />;
  else if (section === 'process') page = <ProcessEditor items={content.process} setItems={(items)=>update(['process'],items)} />;
  else if (section === 'settings') page = <SettingsEditor content={content} update={update} />;
  else page = <Revisions revisions={revisions} loading={revisionLoading} onRestore={restore} restoring={restoring} />;

  return <div className="cms-shell">
    <aside className="sidebar"><a className="cms-brand" href="#"><img src={cmsAsset('holosoft-wordmark-mono.svg')} alt="Holosoft"/><span>CMS / CONTROL</span></a><div className="node-state"><i/><div><span>CONTENT NODE</span><b>{status}</b></div></div><nav>{nav.map(([id,label,no])=><button className={section===id?'active':''} key={id} onClick={()=>setSection(id)}><span>{no}</span>{label}<b>↗</b></button>)}</nav><div className="sidebar-bottom"><a href={WEBSITE_URL} target="_blank" rel="noreferrer"><span>VIEW WEBSITE</span><b>↗</b></a><button onClick={doLogout}><span>DISCONNECT</span><b>×</b></button></div></aside>
    <div className="cms-main"><header className="cms-topbar"><div><span className="pulse"/><span>NODE CMS_01</span><i>/</i><span>LIVE V{content.meta?.version ?? 0}</span></div><div className="top-actions">{dirty ? <span className="unsaved">● UNSAVED DRAFT</span> : hasUnpublished ? <span className="unsaved">● DRAFT NOT LIVE</span> : <span className="synced">● LIVE SYNCED</span>}<button className="draft-button" disabled={!dirty || saving || publishing} onClick={save}>{saving ? 'SAVING…' : 'SAVE DRAFT'}</button><button className="save-button" disabled={dirty || !hasUnpublished || publishing || saving} onClick={publish}>{publishing ? 'PUBLISHING…' : 'PUBLISH LIVE'} <b>↗</b></button></div></header><main className="cms-content">{error && <div className="error-banner"><span>ERR //</span>{error}<button onClick={()=>setError('')}>×</button></div>}{page}</main></div>
  </div>;
}
