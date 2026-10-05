import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPublishedContent } from './api.js';
import { fallbackContent } from './contentFallback.js';
import BootLoader from './components/BootLoader.jsx';
import CoreGraphic from './components/CoreGraphic.jsx';

function useReveal(dependency) {
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    nodes.forEach((node, i) => {
      node.style.setProperty('--reveal-delay', `${Math.min(i % 5, 4) * 70}ms`);
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, [dependency]);
}

const APP_BASE = import.meta.env.BASE_URL || '/';
const appAsset = (name) => `${APP_BASE}assets/${name}`;
const appHref = (href = '/') => {
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith('#')) return href;
  if (href === '/') return APP_BASE;
  if (href.startsWith('/')) return `${APP_BASE.replace(/\/$/, '')}${href}`;
  return href;
};

function BrandWordmark() {
  return <span className="brand-wordmark" aria-hidden="true"><img className="brand-wordmark-mono" src={appAsset('holosoft-wordmark-mono.svg')} alt="" /><img className="brand-wordmark-color" src={appAsset('holosoft-wordmark.svg')} alt="" /></span>;
}

function ProjectVisual({ type }) {
  if (type === 'ui') return <div className="mini-window"><div className="mini-bar" /><div className="mini-grid" /><span className="mini-block a" /><span className="mini-block b" /><span className="mini-block c" /></div>;
  if (type === 'console') return <pre>{`> connect system\n> authenticate node\n> map workflow\n> execute / clean_`}</pre>;
  return <><div className="network-grid" /><span className="network-node n1" /><span className="network-node n2" /><span className="network-node n3" /><span className="network-line l1" /><span className="network-line l2" /><span className="network-logo-stack"><img className="network-logo-mono" src={appAsset('holosoft-mark-mono.svg')} alt="" /><img className="network-logo-color" src={appAsset('holosoft-mark.svg')} alt="" /></span></>;
}

function normalizeHref(href, onHome) {
  if (!href) return '#';
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith('#')) return onHome ? href : `${APP_BASE}${href}`;
  return appHref(href);
}

function routePathFromLocation() {
  let pathname = window.location.pathname;
  const basePath = APP_BASE.replace(/\/$/, '');
  if (basePath && basePath !== '/' && pathname.startsWith(basePath)) pathname = pathname.slice(basePath.length) || '/';
  return pathname.replace(/\/+$/, '') || '/';
}

function resolveMedia(src) {
  if (!src) return '';
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (src.startsWith('/uploads/')) return `${base}${src}`;
  return src;
}

function Media({ media, className = '', decorative = false }) {
  const src = resolveMedia(media?.src);
  if (!src) return null;
  const position = media?.position || 'right';
  return <figure className={`section-media media-${position} ${className}`.trim()} aria-hidden={decorative ? 'true' : undefined}>
    <img src={src} alt={decorative ? '' : (media?.alt || '')} style={{ objectFit: media?.fit || 'cover' }} />
    <span className="media-scan" aria-hidden="true" />
  </figure>;
}

function SiteChrome({ content, currentPath, children }) {
  const onHome = currentPath === '/';
  const pageLinks = (content.pages || []).filter((page) => page.published !== false && page.showInNav !== false).map((page) => ({ label: page.navLabel || page.title, href: `/${page.slug}` }));
  const baseNav = [...(content.site.navigation || [])];
  const teamVisible = content.teamSection?.enabled !== false && (content.team || []).some((member) => member.enabled !== false);
  if (teamVisible && !baseNav.some((item) => item.href === '#team')) {
    const aboutIndex = baseNav.findIndex((item) => item.href === '#about');
    baseNav.splice(aboutIndex >= 0 ? aboutIndex : baseNav.length, 0, { label: 'Team', href: '#team' });
  }
  const navItems = [...baseNav, ...pageLinks];
  return <>
    <div className="noise" aria-hidden="true" /><div className="scanline" aria-hidden="true" />
    <header className="site-header" id="top">
      <a className="brand" href={APP_BASE} aria-label="Holosoft home"><BrandWordmark /></a>
      <nav className="desktop-nav">{navItems.map((item) => <a key={`${item.label}-${item.href}`} className={currentPath === item.href ? 'is-current' : ''} href={normalizeHref(item.href, onHome)}>{item.label}</a>)}</nav>
      <a className="header-cta" href={normalizeHref(content.site.headerCta?.href || '#contact', onHome)}><span>{content.site.headerCta?.label || 'Start a project'}</span><span>↗</span></a>
    </header>
    {children}
    <footer className="site-footer section-shell"><div className="footer-brand"><BrandWordmark /><p>© {new Date().getFullYear()} // ALL SYSTEMS RESERVED</p></div><div className="footer-meta"><span>CONTENT V{content.meta?.version ?? 0}</span><span>{content.site.statusLabel}</span><a href="#top">RETURN / TOP ↑</a></div></footer>
  </>;
}

function PartnerBanner({ content }) {
  const settings = content.partnerBanner || {};
  const partners = (content.partners || []).filter((partner) => partner.enabled !== false);
  if (settings.enabled === false || partners.length === 0) return null;
  const repeated = partners.length < 6 ? [...partners, ...partners, ...partners, ...partners] : [...partners, ...partners];
  return <section className={`partners section-shell ${settings.media?.src ? 'has-section-media' : ''}`} id="partners">
    <Media media={settings.media} className="partners-section-media reveal" decorative={settings.media?.position === 'background'} />
    <div className="partners-head reveal"><div><p className="micro-label">{settings.label || 'TRUSTED NETWORK'}</p><h2>{settings.heading || 'Partners connected to the Holosoft ecosystem.'}</h2></div><span>{String(partners.length).padStart(2, '0')} / ACTIVE NODES</span></div>
    <div className="partner-marquee reveal" style={{ '--partner-duration': `${Math.max(12, Number(settings.speed) || 28)}s` }}>
      <div className="partner-track">{repeated.map((partner, index) => {
        const logo = resolveMedia(partner.logo);
        const body = <><span className="partner-logo-wrap">{logo ? <img src={logo} alt={partner.name} /> : <b>{partner.name}</b>}</span><span className="partner-meta"><strong>{partner.name}</strong>{partner.tagline && <small>{partner.tagline}</small>}</span></>;
        return partner.href ? <a className="partner-node" href={partner.href} target="_blank" rel="noreferrer" key={`${partner.id}-${index}`}>{body}</a> : <div className="partner-node" key={`${partner.id}-${index}`}>{body}</div>;
      })}</div>
    </div>
  </section>;
}

function TeamSection({ content }) {
  const settings = content.teamSection || {};
  const members = (content.team || []).filter((member) => member.enabled !== false);
  if (settings.enabled === false || members.length === 0) return null;
  return <section className={`team section-shell ${settings.media?.src ? 'has-section-media' : ''}`} id="team">
    <Media media={settings.media} className="team-section-media reveal" decorative={settings.media?.position === 'background'} />
    <div className="section-head reveal"><div className="section-index">[ 05 / PEOPLE ]</div><div><p className="micro-label">{settings.label || 'OUR TEAM'}</p><h2>{settings.heading || 'The people behind the system.'}</h2>{settings.description && <p className="section-description">{settings.description}</p>}</div></div>
    <div className="team-grid">{members.map((member, index) => <article className="team-card reveal" key={member.id || index}>
      <div className="team-photo">{member.media?.src ? <Media media={{ ...member.media, position: 'top' }} className="team-member-media" /> : <div className="team-placeholder"><img src={appAsset('holosoft-mark.svg')} alt="" /><span>{String(index + 1).padStart(2,'0')}</span></div>}</div>
      <div className="team-card-meta"><span>{String(index + 1).padStart(2,'0')} / TEAM NODE</span><h3>{member.name}</h3><strong>{member.role}</strong>{member.bio && <p>{member.bio}</p>}<div className="team-links">{member.email && <a href={`mailto:${member.email}`}>EMAIL ↗</a>}{member.linkedin && <a href={member.linkedin} target="_blank" rel="noreferrer">PROFILE ↗</a>}</div></div>
    </article>)}</div>
  </section>;
}

function SectionHead({ index, label, heading, media }) {
  return <div className={`section-head reveal ${media?.src ? 'with-media' : ''}`}><div className="section-index">[ {index} ]</div><div className="section-heading-copy"><p className="micro-label">{label}</p><h2>{heading}</h2>{media?.src && media?.position !== 'background' && <Media media={media} className="section-head-media" />}</div>{media?.src && media?.position === 'background' && <Media media={media} className="section-head-backdrop" decorative />}</div>;
}

function HomePage({ content, apiState }) {
  const tickerItems = useMemo(() => content.services?.map((service) => service.title.toUpperCase()) || [], [content.services]);
  const heroMedia = content.hero?.media;
  return <main>
    <section className={`hero section-shell ${heroMedia?.src ? 'has-hero-media' : ''}`}>
      {heroMedia?.src && heroMedia.position === 'background' && <Media media={heroMedia} className="hero-media-background" decorative />}
      <div className="hero-meta reveal"><span className="status-dot" /><span>{content.hero.metaLeft}</span><span>{content.hero.metaRight}</span><span className="content-state">{apiState}</span></div>
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow reveal">{content.hero.eyebrow}</p>
          <h1 className="reveal">{content.hero.headline.map((line, i) => <span key={`${line}-${i}`} className={i === Number(content.hero.outlineIndex) ? 'outline' : ''}>{line}</span>)}</h1>
          <p className="hero-intro reveal">{content.hero.intro}</p>
          <div className="hero-actions reveal"><a className="button button-solid" href={content.hero.primaryCta.href}>{content.hero.primaryCta.label}<span>↓</span></a><a className="button button-ghost" href={content.hero.secondaryCta.href}>{content.hero.secondaryCta.label}<span>↗</span></a></div>
          {heroMedia?.src && heroMedia.position === 'left' && <Media media={heroMedia} className="hero-inline-media reveal" />}
        </div>
        <div className="hero-core reveal">{heroMedia?.src && heroMedia.position === 'right' && <Media media={heroMedia} className="hero-core-media" />}<CoreGraphic /></div>
      </div>
      <div className="hero-ticker reveal"><div className="ticker-track">{[...tickerItems, ...tickerItems].map((item, i) => <span key={`${item}-${i}`}>{item}<i>◇</i></span>)}</div></div>
    </section>

    <section className={`manifesto section-shell reveal ${content.manifesto.media?.src ? 'has-section-media' : ''}`} id="about">
      {content.manifesto.media?.src && content.manifesto.media.position === 'background' && <Media media={content.manifesto.media} className="manifesto-backdrop" decorative />}
      <div className="section-index">[ 01 / CORE ]</div>
      <div className="manifesto-copy"><p className="micro-label">{content.manifesto.label}</p><h2>{content.manifesto.heading}</h2>{content.manifesto.media?.src && content.manifesto.media.position !== 'background' && <Media media={content.manifesto.media} className="manifesto-media" />}<div className="manifesto-bottom"><p>{content.manifesto.description}</p><div className="terminal-card"><div className="terminal-top"><span>SYS_STATUS</span><span>● LIVE</span></div><div className="terminal-lines">{(content.manifesto.terminalLines || []).map((line) => <span key={line}>{line}</span>)}</div></div></div></div>
    </section>

    <PartnerBanner content={content} />

    <section className="services section-shell" id="services">
      <SectionHead index="02 / CAPABILITIES" label={content.sections?.services?.label} heading={content.sections?.services?.heading} media={content.sections?.services?.media} />
      <div className="service-list">{content.services.map((service) => <article className={`service-row reveal ${service.media?.src ? 'has-item-media' : ''}`} key={service.id}><div className="service-no">{service.no}</div><h3>{service.title}</h3><p>{service.description}</p><span className="service-tag">{service.tag}</span>{service.media?.src && <Media media={service.media} className="service-row-media" decorative={!service.media.alt} />}<span className="row-arrow">↗</span></article>)}</div>
    </section>

    <section className="work section-shell" id="work">
      <SectionHead index="03 / SYSTEMS" label={content.sections?.work?.label} heading={content.sections?.work?.heading} media={content.sections?.work?.media} />
      <div className="work-grid">{content.projects.map((project) => <article className={`work-card reveal ${project.featured ? 'featured' : ''}`} key={project.id}><div className="card-top"><span>{project.code}</span><span>{project.type}</span></div><div className={`card-visual visual-${project.visual}`}>{project.media?.src ? <Media media={project.media} className="project-card-media" /> : <ProjectVisual type={project.visual} />}</div><div className="card-copy"><h3>{project.title}</h3><p>{project.description}</p></div></article>)}</div>
    </section>

    <section className="process section-shell" id="process">
      <SectionHead index="04 / PROTOCOL" label={content.sections?.process?.label} heading={content.sections?.process?.heading} media={content.sections?.process?.media} />
      <div className="process-grid">{content.process.map((step) => <article className={`process-step reveal ${step.media?.src ? 'has-step-media' : ''}`} key={step.id}><span className="step-no">{step.no}</span>{step.media?.src ? <Media media={step.media} className="process-step-media" /> : <div className="step-marker" />}<h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
    </section>

    <TeamSection content={content} />
    <ContactSection content={content} />
  </main>;
}

function ContactSection({ content }) {
  const media = content.contact?.media;
  return <section className={`cta section-shell ${media?.src ? 'has-contact-media' : ''}`} id="contact">
    {media?.src && <Media media={media} className="contact-section-media reveal" decorative={media.position === 'background'} />}
    <span className="cta-core-stack" aria-hidden="true"><img className="cta-core cta-core-mono" src={appAsset('holosoft-mark-mono.svg')} alt="" /><img className="cta-core cta-core-color" src={appAsset('holosoft-mark.svg')} alt="" /></span><p className="micro-label reveal">{content.contact.label}</p><h2 className="reveal">{content.contact.heading}</h2><p className="cta-sub reveal">{content.contact.subheading}</p><a className="cta-link reveal" href={`mailto:${content.site.contactEmail}`}><span>{content.contact.ctaLabel || content.site.contactEmail}</span><span>↗</span></a>
  </section>;
}

function DynamicPage({ page, content }) {
  return <main className="dynamic-page">
    <section className={`page-hero section-shell ${page.media?.src ? 'has-page-media' : ''}`}>
      {page.media?.src && page.media.position === 'background' && <Media media={page.media} className="page-hero-backdrop" decorative />}
      <div className="page-hero-grid">
        <div>{page.media?.src && page.media.position === 'left' && <Media media={page.media} className="page-hero-inline reveal" />}<p className="eyebrow reveal">{page.eyebrow || 'HOLOSOFT / PAGE NODE'}</p><h1 className="reveal">{page.heading || page.title}</h1><p className="page-intro reveal">{page.intro}</p></div>
        <div className="page-system-card reveal">{page.media?.src && page.media.position === 'right' ? <Media media={page.media} className="page-system-media" /> : <><span>PAGE_NODE</span><strong>/{page.slug}</strong><i>LIVE / V{content.meta?.version ?? 0}</i><div className="page-orbit"><img src={appAsset('holosoft-mark.svg')} alt="" /></div></>}</div>
      </div>
    </section>
    <section className="page-blocks section-shell">
      {(page.sections || []).map((block, index) => <article className={`page-block reveal layout-${block.layout || 'split'} accent-${block.accent || 'blue'} media-${block.media?.position || 'none'} ${block.media?.src ? 'has-media' : ''}`} key={block.id || index}>
        {block.media?.src && block.media.position === 'background' && <Media media={block.media} className="page-block-background" decorative />}
        <div className="page-block-index">[{String(index + 1).padStart(2, '0')} / {block.label || 'MODULE'}]</div>
        <div className="page-block-content">{block.media?.src && block.media.position === 'left' && <Media media={block.media} className="page-block-media" />}<div className="page-block-copy"><p className="micro-label">{block.label}</p><h2>{block.heading}</h2><div className="page-body">{String(block.body || '').split('\n').map((line, i) => line ? <p key={i}>{line}</p> : <br key={i} />)}</div>{block.ctaLabel && block.ctaHref && <a className="page-block-link" href={block.ctaHref}>{block.ctaLabel}<span>↗</span></a>}</div>{block.media?.src && block.media.position === 'right' && <Media media={block.media} className="page-block-media" />}</div>
      </article>)}
    </section>
    {page.showContact !== false && <ContactSection content={content} />}
  </main>;
}

function NotFound({ content }) {
  return <main className="dynamic-page"><section className="page-hero section-shell"><div className="page-hero-grid"><div><p className="eyebrow reveal">ERR / ROUTE NOT FOUND</p><h1 className="reveal">404.<br/>UNKNOWN NODE.</h1><p className="page-intro reveal">The requested Holosoft page is not published or does not exist.</p><a className="button button-solid reveal" href={APP_BASE}>RETURN HOME <span>↗</span></a></div><div className="page-system-card reveal"><span>ROUTE_STATE</span><strong>OFFLINE</strong><i>RECOVER / HOME</i><div className="page-orbit"><img src={appAsset('holosoft-mark.svg')} alt="" /></div></div></div></section><ContactSection content={content} /></main>;
}

export default function App() {
  const [content, setContent] = useState(fallbackContent);
  const [booting, setBooting] = useState(true);
  const [apiState, setApiState] = useState('SYNCING');
  const cursorRef = useRef(null);
  const cursorCoreRef = useRef(null);
  const endBoot = useCallback(() => setBooting(false), []);
  const currentPath = routePathFromLocation();
  const activePage = currentPath === '/' ? null : (content.pages || []).find((page) => page.published !== false && `/${page.slug}` === currentPath);

  useEffect(() => {
    const orb = cursorRef.current;
    const cursor = cursorCoreRef.current;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!orb || !cursor || !finePointer) return undefined;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let coreX = targetX;
    let coreY = targetY;
    let trailX = targetX;
    let trailY = targetY;
    let raf;

    const animate = () => {
      const coreEase = reduced ? 1 : 0.34;
      const trailEase = reduced ? 1 : 0.105;
      coreX += (targetX - coreX) * coreEase;
      coreY += (targetY - coreY) * coreEase;
      trailX += (targetX - trailX) * trailEase;
      trailY += (targetY - trailY) * trailEase;
      cursor.style.transform = `translate3d(${coreX}px, ${coreY}px, 0) translate(-50%, -50%)`;
      orb.style.transform = `translate3d(${trailX}px, ${trailY}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(animate);
    };

    const move = (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      cursor.classList.add('is-visible');
      const hot = event.target.closest?.('a, button, .service-row, .work-card, .process-step, .core-stage, .terminal-card, .partner-node, .page-block, .team-card, .section-media');
      const textTarget = event.target.closest?.('p, h1, h2, h3, .micro-label, .eyebrow');
      orb.classList.toggle('is-hot', Boolean(hot));
      cursor.classList.toggle('is-hot', Boolean(hot));
      cursor.classList.toggle('is-text', Boolean(textTarget) && !hot);
    };
    const down = () => cursor.classList.add('is-down');
    const up = () => cursor.classList.remove('is-down');
    const leave = () => { cursor.classList.remove('is-visible', 'is-hot', 'is-text'); orb.classList.remove('is-hot'); };
    const enter = () => cursor.classList.add('is-visible');

    document.documentElement.classList.add('custom-cursor-enabled');
    raf = requestAnimationFrame(animate);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    document.documentElement.addEventListener('mouseleave', leave);
    document.documentElement.addEventListener('mouseenter', enter);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove('custom-cursor-enabled');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.documentElement.removeEventListener('mouseleave', leave);
      document.documentElement.removeEventListener('mouseenter', enter);
    };
  }, []);

  useEffect(() => {
    getPublishedContent().then((data) => {
      setContent(data);
      setApiState('LIVE CONTENT');
    }).catch(() => setApiState('LOCAL FALLBACK'));
  }, []);

  useEffect(() => {
    const page = currentPath === '/' ? null : (content.pages || []).find((item) => item.published !== false && `/${item.slug}` === currentPath);
    document.title = page?.seoTitle || page?.title || content.site?.title || fallbackContent.site.title;
    const description = document.querySelector('meta[name="description"]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'description' }));
    description.content = page?.seoDescription || page?.intro || content.site?.description || '';
  }, [content, currentPath]);

  useReveal(`${currentPath}-${content.meta?.version ?? 0}`);

  return <>
    {booting && <BootLoader onComplete={endBoot} />}
    <div ref={cursorRef} className="cursor-orb" aria-hidden="true" />
    <div ref={cursorCoreRef} className="site-cursor" aria-hidden="true"><span className="cursor-ring" /><span className="cursor-ring cursor-ring-secondary" /><span className="cursor-dot" /><span className="cursor-tick cursor-tick-x" /><span className="cursor-tick cursor-tick-y" /><span className="cursor-label">ACT</span></div>
    <SiteChrome content={content} currentPath={currentPath}>
      {currentPath === '/' ? <HomePage content={content} apiState={apiState} /> : activePage ? <DynamicPage page={activePage} content={content} /> : <NotFound content={content} />}
    </SiteChrome>
  </>;
}
