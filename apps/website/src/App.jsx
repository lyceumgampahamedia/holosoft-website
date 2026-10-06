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
const SITE_URL = (import.meta.env.VITE_WEBSITE_URL || `${window.location.origin}${APP_BASE}`).replace(/\/$/, '');
const appAsset = (name) => `${APP_BASE}assets/${name}`;
const absoluteUrl = (value = '') => {
  if (!value) return `${SITE_URL}/assets/holosoft-mark.svg`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/uploads/')) return resolveMedia(value);
  try { return new URL(value.replace(/^\//,''), `${SITE_URL}/`).href; }
  catch { return value; }
};
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

function Media({ media, className = '', decorative = false, priority = false }) {
  const src = resolveMedia(media?.src);
  if (!src) return null;
  const position = media?.position || 'right';
  return <figure className={`section-media media-${position} ${className}`.trim()} aria-hidden={decorative ? 'true' : undefined}>
    <img src={src} alt={decorative ? '' : (media?.alt || '')} style={{ objectFit: media?.fit || 'cover' }} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />
    <span className="media-scan" aria-hidden="true" />
  </figure>;
}

function ScrollSystem({ currentPath }) {
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState(currentPath === '/' ? 'HOME' : currentPath.replace(/^\//,'').toUpperCase());

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const root = document.documentElement;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      setProgress(Math.max(0, Math.min(1, window.scrollY / max)));
      if (currentPath === '/') {
        const sections = [...document.querySelectorAll('main section[id]')];
        const active = sections.filter((section) => section.getBoundingClientRect().top <= Math.min(220, window.innerHeight * .28)).at(-1);
        setLabel((active?.id || 'home').toUpperCase());
      }
      raf = 0;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive:true });
    window.addEventListener('resize', schedule, { passive:true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [currentPath]);

  return <div className="scroll-system" aria-hidden="true"><span className="scroll-system-label">{label}</span><span className="scroll-system-track"><i style={{ transform:`scaleX(${progress})` }} /></span><span className="scroll-system-percent">{String(Math.round(progress * 100)).padStart(3,'0')}%</span></div>;
}

function SiteChrome({ content, currentPath, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const onHome = currentPath === '/';
  const pageLinks = (content.pages || []).filter((page) => page.published !== false && page.showInNav !== false).map((page) => ({ label: page.navLabel || page.title, href: `/${page.slug}` }));
  const baseNav = [...(content.site.navigation || [])];
  const teamVisible = content.teamSection?.enabled !== false && (content.team || []).some((member) => member.enabled !== false);
  if (teamVisible && !baseNav.some((item) => item.href === '#team')) {
    const aboutIndex = baseNav.findIndex((item) => item.href === '#about');
    baseNav.splice(aboutIndex >= 0 ? aboutIndex : baseNav.length, 0, { label: 'Team', href: '#team' });
  }
  const navItems = [...baseNav, ...pageLinks];

  useEffect(() => {
    document.body.classList.toggle('nav-open', menuOpen);
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('nav-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return <>
    <a className="skip-link" href="#main-content">SKIP TO CONTENT</a>
    <ScrollSystem currentPath={currentPath} />
    <div className="noise" aria-hidden="true" /><div className="scanline" aria-hidden="true" />
    <header className="site-header" id="top">
      <a className="brand" href={APP_BASE} aria-label="Holosoft home" onClick={() => setMenuOpen(false)}><BrandWordmark /></a>
      <nav className="desktop-nav" aria-label="Primary navigation">{navItems.map((item) => <a key={`${item.label}-${item.href}`} className={currentPath === item.href ? 'is-current' : ''} aria-current={currentPath === item.href ? 'page' : undefined} href={normalizeHref(item.href, onHome)}>{item.label}</a>)}</nav>
      <a className="header-cta" href={normalizeHref(content.site.headerCta?.href || '#contact', onHome)}><span>{content.site.headerCta?.label || 'Start a project'}</span><span>↗</span></a>
      <button className={`mobile-menu-button ${menuOpen ? 'is-open' : ''}`} type="button" aria-expanded={menuOpen} aria-controls="mobile-command-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen((value) => !value)}>
        <span /><span /><b>{menuOpen ? 'CLOSE' : 'MENU'}</b>
      </button>
    </header>
    <aside className={`mobile-command-menu ${menuOpen ? 'is-open' : ''}`} id="mobile-command-menu" aria-hidden={!menuOpen}>
      <div className="mobile-command-grid" aria-hidden="true" />
      <div className="mobile-command-core" aria-hidden="true"><img src={appAsset('holosoft-mark.svg')} alt="" /><i /><i /></div>
      <div className="mobile-command-meta"><span>HOLOSOFT / COMMAND</span><span>{content.site.statusLabel || 'SYSTEMS ONLINE'}</span></div>
      <nav className="mobile-command-links" aria-label="Mobile navigation">
        {navItems.map((item, index) => <a key={`mobile-${item.label}-${item.href}`} href={normalizeHref(item.href, onHome)} onClick={() => setMenuOpen(false)}><span>{String(index + 1).padStart(2,'0')}</span><strong>{item.label}</strong><i>↗</i></a>)}
      </nav>
      <a className="mobile-command-cta" href={normalizeHref(content.site.headerCta?.href || '#contact', onHome)} onClick={() => setMenuOpen(false)}><span>{content.site.headerCta?.label || 'Start a project'}</span><b>INITIATE ↗</b></a>
    </aside>
    {children}
    <footer className="site-footer section-shell"><div className="footer-brand"><BrandWordmark /><p>© {new Date().getFullYear()} // ALL SYSTEMS RESERVED</p></div><div className="footer-system"><span>HOLOSOFT / DIGITAL SYSTEMS</span><a href={`mailto:${content.site.contactEmail}`}>{content.site.contactEmail}</a></div><div className="footer-meta"><span>CONTENT V{content.meta?.version ?? 0}</span><span>{content.site.statusLabel}</span><a href="#top">RETURN / TOP ↑</a></div></footer>
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

function ProjectCard({ project }) {
  const body = <><div className="card-top"><span>{project.code}</span><span>{project.type}</span></div><div className={`card-visual visual-${project.visual}`}>{project.media?.src ? <Media media={project.media} className="project-card-media" /> : <ProjectVisual type={project.visual} />}</div><div className="card-copy"><div><h3>{project.title}</h3><p>{project.description}</p></div>{project.caseStudyEnabled !== false && <span className="case-card-link">VIEW CASE / ↗</span>}</div></>;
  const className = `work-card reveal ${project.featured ? 'featured' : ''}`;
  if (project.caseStudyEnabled === false) return <article className={className}>{body}</article>;
  return <a className={className} href={appHref(`/work/${project.slug || project.id}`)} aria-label={`Open case study: ${project.title}`}>{body}</a>;
}

function HomePage({ content, apiState }) {
  const tickerItems = useMemo(() => content.services?.map((service) => service.title.toUpperCase()) || [], [content.services]);
  const heroMedia = content.hero?.media;
  return <main id="main-content">
    <section className={`hero section-shell ${heroMedia?.src ? 'has-hero-media' : ''}`}>
      {heroMedia?.src && heroMedia.position === 'background' && <Media media={heroMedia} className="hero-media-background" decorative priority />}
      <div className="hero-meta reveal"><span className="status-dot" /><span>{content.hero.metaLeft}</span><span>{content.hero.metaRight}</span><span className="content-state">{apiState}</span></div>
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow reveal">{content.hero.eyebrow}</p>
          <h1 className="reveal">{content.hero.headline.map((line, i) => <span key={`${line}-${i}`} className={i === Number(content.hero.outlineIndex) ? 'outline' : ''}>{line}</span>)}</h1>
          <p className="hero-intro reveal">{content.hero.intro}</p>
          <div className="hero-actions reveal"><a className="button button-solid" href={content.hero.primaryCta.href}>{content.hero.primaryCta.label}<span>↓</span></a><a className="button button-ghost" href={content.hero.secondaryCta.href}>{content.hero.secondaryCta.label}<span>↗</span></a></div>
          {heroMedia?.src && heroMedia.position === 'left' && <Media media={heroMedia} className="hero-inline-media reveal" priority />}
        </div>
        <div className="hero-core reveal">{heroMedia?.src && heroMedia.position === 'right' && <Media media={heroMedia} className="hero-core-media" priority />}<CoreGraphic services={content.services} /></div>
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
      <div className="service-list">{content.services.map((service) => {
        const rowBody = <><div className="service-no">{service.no}</div><h3>{service.title}</h3><p>{service.description}</p><span className="service-tag">{service.tag}</span>{service.media?.src && <Media media={service.media} className="service-row-media" decorative={!service.media.alt} />}{service.href && <span className="row-arrow">↗</span>}</>;
        const className = `service-row reveal ${service.media?.src ? 'has-item-media' : ''} ${service.href ? 'is-linked' : ''}`;
        if (!service.href) return <article className={className} key={service.id}>{rowBody}</article>;
        const external = /^(https?:)?\/\//i.test(service.href);
        return <a className={className} href={normalizeHref(service.href, true)} target={service.linkNewTab ? '_blank' : undefined} rel={service.linkNewTab || external ? 'noreferrer' : undefined} key={service.id}>{rowBody}</a>;
      })}</div>
    </section>

    <section className="work section-shell" id="work">
      <SectionHead index="03 / SYSTEMS" label={content.sections?.work?.label} heading={content.sections?.work?.heading} media={content.sections?.work?.media} />
      <div className="work-grid">{content.projects.map((project) => <ProjectCard project={project} key={project.id} />)}</div>
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
  const [copyState, setCopyState] = useState('COPY EMAIL');
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(content.site.contactEmail);
      setCopyState('COPIED ✓');
    } catch {
      setCopyState('COPY FAILED');
    }
    window.setTimeout(() => setCopyState('COPY EMAIL'), 1700);
  };
  return <section className={`cta section-shell ${media?.src ? 'has-contact-media' : ''}`} id="contact">
    {media?.src && <Media media={media} className="contact-section-media reveal" decorative={media.position === 'background'} />}
    <span className="cta-core-stack" aria-hidden="true"><img className="cta-core cta-core-mono" src={appAsset('holosoft-mark-mono.svg')} alt="" /><img className="cta-core cta-core-color" src={appAsset('holosoft-mark.svg')} alt="" /></span>
    <div className="contact-system-meta reveal"><span>DIRECT CHANNEL</span><i>● {content.site.statusLabel || 'SYSTEMS ONLINE'}</i></div>
    <p className="micro-label reveal">{content.contact.label}</p><h2 className="reveal">{content.contact.heading}</h2><p className="cta-sub reveal">{content.contact.subheading}</p>
    <div className="contact-action-grid reveal"><a className="cta-link" href={`mailto:${content.site.contactEmail}`}><span>{content.contact.ctaLabel || content.site.contactEmail}</span><span>↗</span></a><button className="contact-copy" type="button" onClick={copyEmail}><span>{content.site.contactEmail}</span><b>{copyState}</b></button></div>
  </section>;
}

function CaseGallery({ items = [] }) {
  const gallery = items.filter((item) => item?.media?.src);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (expanded === null) return undefined;
    const close = (event) => { if (event.key === 'Escape') setExpanded(null); };
    document.body.classList.add('case-lightbox-open');
    window.addEventListener('keydown', close);
    return () => {
      document.body.classList.remove('case-lightbox-open');
      window.removeEventListener('keydown', close);
    };
  }, [expanded]);

  if (!gallery.length) return null;
  const active = expanded === null ? null : gallery[expanded];
  return <>
    <section className="case-gallery section-shell">
      <div className="case-gallery-head reveal"><div><span className="section-index">[ VISUAL / SYSTEM ]</span><p className="micro-label">PROJECT FRAMES</p></div><span>{String(gallery.length).padStart(2,'0')} / MEDIA NODES</span></div>
      <div className="case-gallery-grid">{gallery.map((item,index) => <button className={`case-gallery-item reveal layout-${item.layout || 'wide'}`} type="button" onClick={() => setExpanded(index)} key={item.id || index}>
        <Media media={item.media} className="case-gallery-media" />
        <span className="case-gallery-caption"><b>{String(index + 1).padStart(2,'0')}</b><em>{item.caption || item.media.alt || 'PROJECT FRAME'}</em><i>EXPAND ↗</i></span>
      </button>)}</div>
    </section>
    <div className={`case-lightbox ${active ? 'is-open' : ''}`} aria-hidden={!active} onClick={() => setExpanded(null)}>
      <button className="case-lightbox-close" type="button" onClick={() => setExpanded(null)}>CLOSE ×</button>
      {active && <div className="case-lightbox-stage" onClick={(event) => event.stopPropagation()}><Media media={active.media} className="case-lightbox-media" /><div className="case-lightbox-meta"><span>{String((expanded || 0) + 1).padStart(2,'0')} / {String(gallery.length).padStart(2,'0')}</span><p>{active.caption || active.media.alt || 'PROJECT FRAME'}</p></div></div>}
    </div>
  </>;
}

function CaseChapterExperience({ chapters = [] }) {
  const items = chapters.filter((chapter) => chapter?.title || chapter?.body || chapter?.media?.src);
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    if (!items.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) {
        const index = Number(visible.target.dataset.chapterIndex || 0);
        setActive(index);
      }
    }, { threshold:[0.25,0.45,0.65], rootMargin:'-20% 0px -40% 0px' });
    refs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [items.length]);

  if (!items.length) return null;
  const activeItem = items[Math.min(active,items.length - 1)] || items[0];
  return <section className="case-chapters section-shell">
    <div className="case-chapters-head reveal"><span className="section-index">[ SCROLL / STORY ]</span><div><p className="micro-label">SYSTEM JOURNEY</p><h2>Inside the build.</h2></div></div>
    <div className="case-chapters-layout">
      <div className="case-chapter-stage">
        <div className="case-chapter-stage-inner">
          <div className="case-chapter-stage-meta"><span>{String(active + 1).padStart(2,'0')} / {String(items.length).padStart(2,'0')}</span><strong>{activeItem.label || activeItem.title || 'PROJECT SYSTEM'}</strong></div>
          <div className="case-chapter-visual">{activeItem.media?.src ? <Media media={activeItem.media} className="case-chapter-media" /> : <div className="case-chapter-placeholder"><img src={appAsset('holosoft-mark.svg')} alt="" /><span>VISUAL NODE / OPTIONAL</span></div>}</div>
        </div>
      </div>
      <div className="case-chapter-copy">{items.map((chapter,index) => <article className={`case-chapter reveal ${active === index ? 'is-active' : ''}`} data-chapter-index={index} ref={(node) => { refs.current[index] = node; }} key={chapter.id || index}>
        <div className="case-chapter-index"><span>{String(index + 1).padStart(2,'0')}</span><i /></div>
        <p className="micro-label">{chapter.label || `CHAPTER / ${String(index + 1).padStart(2,'0')}`}</p>
        <h3>{chapter.title || 'Project chapter'}</h3>
        <div>{String(chapter.body || '').split('\n').map((line,lineIndex) => line ? <p key={lineIndex}>{line}</p> : <br key={lineIndex} />)}</div>
      </article>)}</div>
    </div>
  </section>;
}

function CaseArchitecture({ project }) {
  const nodes = (project.architectureNodes || []).map((node) => String(node || '').trim()).filter(Boolean).slice(0,6);
  if (!nodes.length && !project.architectureHeading && !project.architectureBody) return null;
  return <section className="case-architecture section-shell">
    <div className="case-architecture-copy reveal"><span className="section-index">[ ARCHITECTURE / MAP ]</span><p className="micro-label">{project.architectureLabel || 'CONNECTED SYSTEM'}</p><h2>{project.architectureHeading || 'One connected operating layer.'}</h2>{project.architectureBody && <p>{project.architectureBody}</p>}</div>
    <div className="case-architecture-map reveal">
      <div className="architecture-core"><span className="architecture-ring architecture-ring-a" /><span className="architecture-ring architecture-ring-b" /><img src={appAsset('holosoft-mark.svg')} alt="" /><b>HOLOSOFT<br/>CORE</b></div>
      <div className="architecture-lines" aria-hidden="true">{nodes.map((_,index) => <i style={{ '--architecture-angle': `${-90 + (360 / Math.max(nodes.length,1)) * index}deg` }} key={index} />)}</div>
      {nodes.map((node,index) => <div className="architecture-node" style={{ '--architecture-angle': `${-90 + (360 / Math.max(nodes.length,1)) * index}deg` }} key={`${node}-${index}`}><span>{String(index + 1).padStart(2,'0')}</span><strong>{node}</strong></div>)}
    </div>
  </section>;
}

function ProjectCaseStudy({ project, content }) {
  const caseProjects = (content.projects || []).filter((item) => item.published !== false && item.caseStudyEnabled !== false);
  const currentProjectIndex = caseProjects.findIndex((item) => (item.slug || item.id) === (project.slug || project.id));
  const previousProject = currentProjectIndex > 0 ? caseProjects[currentProjectIndex - 1] : null;
  const nextProject = currentProjectIndex >= 0 && currentProjectIndex < caseProjects.length - 1 ? caseProjects[currentProjectIndex + 1] : null;
  const metrics = (project.metrics || []).filter((metric) => metric?.value || metric?.label);
  const story = [
    ['01', 'CHALLENGE', project.challenge],
    ['02', 'APPROACH', project.approach],
    ['03', 'OUTCOME', project.outcome]
  ].filter(([, , body]) => body);
  return <main id="main-content" className="case-study">
    <section className="case-hero section-shell">
      <div className="case-hero-meta reveal"><a href={`${APP_BASE}#work`}>← SELECTED WORK</a><span>{project.code} / {project.type}</span></div>
      <div className="case-hero-grid">
        <div className="case-hero-copy">
          <p className="eyebrow reveal">HOLOSOFT / CASE STUDY</p>
          <h1 className="reveal">{project.title}</h1>
          <p className="case-hero-intro reveal">{project.description}</p>
          <span className="case-scroll-cue reveal">SCROLL / EXPLORE <i>↓</i></span>
        </div>
        <div className="case-orbit-card reveal">
          <span>PROJECT NODE</span><strong>{project.code}</strong><i>{project.year || 'ACTIVE SYSTEM'}</i>
          <div className="case-orbit-visual">{project.media?.src ? <Media media={project.media} className="case-hero-media" priority /> : <ProjectVisual type={project.visual} />}</div>
        </div>
      </div>
      <div className="case-facts reveal">
        <div><span>CLIENT</span><strong>{project.client || 'CONFIDENTIAL / INTERNAL'}</strong></div>
        <div><span>YEAR</span><strong>{project.year || '—'}</strong></div>
        <div><span>DISCIPLINES</span><strong>{project.disciplines || project.type}</strong></div>
      </div>
    </section>
    <section className="case-overview section-shell">
      <div className="section-index reveal">[ SYSTEM / OVERVIEW ]</div>
      <div className="case-overview-copy reveal"><p className="micro-label">THE BRIEF</p><h2>{project.caseHeading || 'A system designed around the work, not around the software.'}</h2><p>{project.caseIntro || project.description}</p></div>
    </section>
    {(project.gallery || []).some((item) => item?.media?.src) ? <CaseGallery items={project.gallery || []} /> : <section className="case-signature-frame section-shell reveal"><div className="case-signature-meta"><span>[ VISUAL / SYSTEM ]</span><strong>{project.code}</strong><i>{project.visual?.toUpperCase() || 'SYSTEM'}</i></div><div className={`case-signature-visual visual-${project.visual}`}><ProjectVisual type={project.visual} /></div></section>}
    {story.length > 0 && <section className="case-story section-shell">{story.map(([no, label, body]) => <article className="case-story-row reveal" key={label}><span className="case-story-no">{no}</span><p className="micro-label">{label}</p><div>{String(body).split('\n').map((line,index) => line ? <p key={index}>{line}</p> : <br key={index} />)}</div></article>)}</section>}
    <CaseChapterExperience chapters={project.chapters || []} />
    <CaseArchitecture project={project} />
    {metrics.length > 0 && <section className="case-metrics section-shell"><div className="case-metrics-head reveal"><span className="section-index">[ VERIFIED / RESULTS ]</span><p>Only published project metrics appear here.</p></div><div className="case-metrics-grid">{metrics.map((metric,index) => <div className="case-metric reveal" key={`${metric.label}-${index}`}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}</div></section>}
    <nav className="case-project-nav section-shell reveal" aria-label="Case study navigation">
      <a className="case-project-all" href={`${APP_BASE}#work`}><span>ALL WORK</span><strong>SELECTED SYSTEMS</strong></a>
      {previousProject ? <a className="case-project-direction previous" href={appHref(`/work/${previousProject.slug || previousProject.id}`)}><span>← PREVIOUS</span><strong>{previousProject.title}</strong></a> : <span className="case-project-direction is-empty" />}
      {nextProject ? <a className="case-project-direction next" href={appHref(`/work/${nextProject.slug || nextProject.id}`)}><span>NEXT →</span><strong>{nextProject.title}</strong></a> : <a className="case-project-direction next" href={`${APP_BASE}#work`}><span>BACK TO</span><strong>ALL WORK</strong></a>}
    </nav>
    <section className="case-next section-shell reveal"><p className="micro-label">NEXT CONNECTION</p><h2>Have a system that needs this level of thinking?</h2><a className="cta-link" href={`mailto:${content.site.contactEmail}`}><span>{content.contact?.ctaLabel || content.site.contactEmail}</span><span>↗</span></a></section>
  </main>;
}

function DynamicPage({ page, content }) {
  return <main id="main-content" className="dynamic-page">
    <section className={`page-hero section-shell ${page.media?.src ? 'has-page-media' : ''}`}>
      {page.media?.src && page.media.position === 'background' && <Media media={page.media} className="page-hero-backdrop" decorative priority />}
      <div className="page-hero-grid">
        <div>{page.media?.src && page.media.position === 'left' && <Media media={page.media} className="page-hero-inline reveal" priority />}<p className="eyebrow reveal">{page.eyebrow || 'HOLOSOFT / PAGE NODE'}</p><h1 className="reveal">{page.heading || page.title}</h1><p className="page-intro reveal">{page.intro}</p></div>
        <div className="page-system-card reveal">{page.media?.src && page.media.position === 'right' ? <Media media={page.media} className="page-system-media" priority /> : <><span>PAGE_NODE</span><strong>/{page.slug}</strong><i>LIVE / V{content.meta?.version ?? 0}</i><div className="page-orbit"><img src={appAsset('holosoft-mark.svg')} alt="" /></div></>}</div>
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
  return <main id="main-content" className="dynamic-page"><section className="page-hero section-shell"><div className="page-hero-grid"><div><p className="eyebrow reveal">ERR / ROUTE NOT FOUND</p><h1 className="reveal">404.<br/>UNKNOWN NODE.</h1><p className="page-intro reveal">The requested Holosoft page is not published or does not exist.</p><a className="button button-solid reveal" href={APP_BASE}>RETURN HOME <span>↗</span></a></div><div className="page-system-card reveal"><span>ROUTE_STATE</span><strong>OFFLINE</strong><i>RECOVER / HOME</i><div className="page-orbit"><img src={appAsset('holosoft-mark.svg')} alt="" /></div></div></div></section><ContactSection content={content} /></main>;
}

export default function App() {
  const [content, setContent] = useState(fallbackContent);
  const [booting, setBooting] = useState(() => {
    try { return sessionStorage.getItem('holosoft-booted') !== '1'; }
    catch { return true; }
  });
  const [apiState, setApiState] = useState('SYNCING');
  const [routeLeaving, setRouteLeaving] = useState(false);
  const cursorRef = useRef(null);
  const cursorCoreRef = useRef(null);
  const endBoot = useCallback(() => {
    try { sessionStorage.setItem('holosoft-booted', '1'); } catch {}
    setBooting(false);
  }, []);
  const currentPath = routePathFromLocation();
  const projectMatch = currentPath.match(/^\/work\/([^/]+)$/);
  const activeProject = projectMatch ? (content.projects || []).find((project) => project.published !== false && project.caseStudyEnabled !== false && (project.slug || project.id) === decodeURIComponent(projectMatch[1])) : null;
  const activePage = currentPath === '/' || projectMatch ? null : (content.pages || []).find((page) => page.published !== false && `/${page.slug}` === currentPath);

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
    let lastFrame = performance.now();
    const damp = (speed, delta) => 1 - Math.exp(-speed * delta);

    const animate = (time) => {
      const delta = Math.min(Math.max((time - lastFrame) / 1000, 0), 0.05);
      lastFrame = time;
      const coreEase = reduced ? 1 : damp(28, delta);
      const trailEase = reduced ? 1 : damp(9.5, delta);
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
    const handleInternalNavigation = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      let url;
      try { url = new URL(anchor.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      const sameDocumentHash = url.pathname === window.location.pathname && url.search === window.location.search && url.hash;
      if (sameDocumentHash) return;
      event.preventDefault();
      setRouteLeaving(true);
      try {
        sessionStorage.setItem('holosoft-booted', '1');
        sessionStorage.setItem('holosoft-route-navigation', '1');
      } catch {}
      window.setTimeout(() => window.location.assign(url.href), 560);
    };
    document.addEventListener('click', handleInternalNavigation);
    return () => document.removeEventListener('click', handleInternalNavigation);
  }, []);

  useEffect(() => {
    getPublishedContent().then((data) => {
      setContent(data);
      setApiState('LIVE CONTENT');
    }).catch(() => setApiState('LOCAL FALLBACK'));
  }, []);

  useEffect(() => {
    const page = currentPath === '/' ? null : (content.pages || []).find((item) => item.published !== false && `/${item.slug}` === currentPath);
    const caseProject = currentPath.startsWith('/work/') ? (content.projects || []).find((item) => `/work/${item.slug || item.id}` === currentPath) : null;
    const title = caseProject ? `${caseProject.title} — Holosoft Case Study` : page?.seoTitle || page?.title || content.site?.title || fallbackContent.site.title;
    const description = caseProject?.description || page?.seoDescription || page?.intro || content.site?.description || '';
    const canonical = currentPath === '/' ? `${SITE_URL}/` : `${SITE_URL}${currentPath}`;
    const image = absoluteUrl(caseProject?.media?.src || page?.media?.src || 'assets/holosoft-mark.svg');
    const setMeta = (selector, attribute, value) => {
      let node = document.head.querySelector(selector);
      if (!node) {
        node = document.createElement('meta');
        const [key, keyValue] = attribute;
        node.setAttribute(key, keyValue);
        document.head.appendChild(node);
      }
      node.setAttribute('content', value || '');
    };
    document.title = title;
    setMeta('meta[name="description"]', ['name','description'], description);
    setMeta('meta[property="og:title"]', ['property','og:title'], title);
    setMeta('meta[property="og:description"]', ['property','og:description'], description);
    setMeta('meta[property="og:type"]', ['property','og:type'], caseProject ? 'article' : 'website');
    setMeta('meta[property="og:url"]', ['property','og:url'], canonical);
    setMeta('meta[property="og:image"]', ['property','og:image'], image);
    setMeta('meta[name="twitter:card"]', ['name','twitter:card'], caseProject?.media?.src || page?.media?.src ? 'summary_large_image' : 'summary');
    setMeta('meta[name="twitter:title"]', ['name','twitter:title'], title);
    setMeta('meta[name="twitter:description"]', ['name','twitter:description'], description);
    setMeta('meta[name="twitter:image"]', ['name','twitter:image'], image);
    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    let schema = document.getElementById('holosoft-jsonld');
    if (!schema) {
      schema = document.createElement('script');
      schema.type = 'application/ld+json';
      schema.id = 'holosoft-jsonld';
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      '@context':'https://schema.org',
      '@graph':[
        { '@type':'Organization', '@id':`${SITE_URL}/#organization`, name:content.site?.name || 'Holosoft', url:`${SITE_URL}/`, logo:`${SITE_URL}/assets/holosoft-mark.svg`, email:content.site?.contactEmail || undefined },
        { '@type':'WebSite', '@id':`${SITE_URL}/#website`, url:`${SITE_URL}/`, name:content.site?.name || 'Holosoft', description:content.site?.description || undefined, publisher:{ '@id':`${SITE_URL}/#organization` } },
        caseProject ? { '@type':'CreativeWork', name:caseProject.title, description:caseProject.description, url:canonical, image:caseProject.media?.src ? image : undefined, creator:{ '@id':`${SITE_URL}/#organization` } } : { '@type':'WebPage', name:title, description, url:canonical, isPartOf:{ '@id':`${SITE_URL}/#website` } }
      ]
    });
  }, [content, currentPath]);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return undefined;
    let registration;
    navigator.serviceWorker.register(`${APP_BASE}sw.js`, { scope:APP_BASE }).then((result) => {
      registration = result;
      registration.update().catch(() => {});
    }).catch(() => {});
    return () => { void registration; };
  }, []);

    useReveal(`${currentPath}-${content.meta?.version ?? 0}`);

  return <>
    {booting && <BootLoader onComplete={endBoot} />}
    <div className={`route-transition ${routeLeaving ? 'is-leaving' : ''}`} aria-hidden="true"><span className="route-panel route-panel-top" /><span className="route-panel route-panel-bottom" /><div className="route-transition-mark"><img src={appAsset('holosoft-mark.svg')} alt="" /><span>SHIFTING NODE</span></div></div>
    <div ref={cursorRef} className="cursor-orb" aria-hidden="true" />
    <div ref={cursorCoreRef} className="site-cursor" aria-hidden="true"><span className="cursor-ring" /><span className="cursor-ring cursor-ring-secondary" /><span className="cursor-dot" /><span className="cursor-tick cursor-tick-x" /><span className="cursor-tick cursor-tick-y" /><span className="cursor-label">ACT</span></div>
    <SiteChrome content={content} currentPath={currentPath}>
      {currentPath === '/' ? <HomePage content={content} apiState={apiState} /> : activeProject ? <ProjectCaseStudy project={activeProject} content={content} /> : activePage ? <DynamicPage page={activePage} content={content} /> : <NotFound content={content} />}
    </SiteChrome>
  </>;
}
