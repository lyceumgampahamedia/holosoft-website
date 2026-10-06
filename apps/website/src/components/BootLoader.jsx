import { useEffect, useState } from 'react';
const asset = (name) => `${import.meta.env.BASE_URL || '/'}assets/${name}`;

const stages = [
  { at: 0, text: 'INITIALIZING CORE', line: 0, accent: '#2153a1' },
  { at: 24, text: 'MAPPING SYSTEM', line: 1, accent: '#3f1658' },
  { at: 52, text: 'SYNCING MODULES', line: 2, accent: '#6f2081' },
  { at: 78, text: 'OPENING INTERFACE', line: 3, accent: '#2153a1' },
  { at: 100, text: 'CORE ONLINE', line: 3, accent: '#6f2081' }
];

export default function BootLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 350 : 2850;
    let start;
    let raf;
    const tick = (time) => {
      start ??= time;
      const raw = Math.min((time - start) / duration, 1);
      const eased = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
      setProgress(eased * 100);
      if (raw < 1) raf = requestAnimationFrame(tick);
      else {
        setProgress(100);
        window.setTimeout(() => setExiting(true), reduced ? 30 : 360);
        window.setTimeout(onComplete, reduced ? 180 : 1450);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  const active = [...stages].reverse().find((stage) => progress >= stage.at) || stages[0];
  const lines = ['WAKE_CORE', 'MAP_SYSTEM', 'SYNC_MODULES', 'OPEN_INTERFACE'];

  return (
    <div
      className={`boot-loader ${progress === 100 ? 'is-ready' : ''} ${exiting ? 'is-exiting' : ''}`}
      style={{ '--boot-accent': active.accent }}
      role="status"
      aria-live="polite"
    >
      <div className="boot-grid" />
      <div className="boot-scan" />
      <div className="boot-top"><span>HOLOSOFT // SYS.BOOT</span><span className="boot-top-right">SECURE CHANNEL / 01</span></div>
      <div className="boot-center" aria-hidden="true">
        <div className="boot-cross boot-cross-x" /><div className="boot-cross boot-cross-y" />
        <div className="boot-orbit boot-orbit-a"><i /></div>
        <div className="boot-orbit boot-orbit-b"><i /></div>
        <div className="boot-orbit boot-orbit-c" />
        <div className="boot-logo-wrap">
          <img className="boot-logo boot-logo-mono" src={asset('holosoft-mark-mono.svg')} alt="" />
          <img
            className="boot-logo boot-logo-color"
            src={asset('holosoft-mark.svg')}
            alt=""
            style={{ clipPath: `inset(${100 - progress}% 0 0 0)` }}
          />
        </div>
        <span className="boot-coordinate coord-a">X / 00.042</span>
        <span className="boot-coordinate coord-b">Y / 19.284</span>
        <span className="boot-coordinate coord-c">CORE_01</span>
      </div>
      <div className="boot-diagnostics" aria-hidden="true">
        {lines.map((line, i) => (
          <span className={`boot-line ${i <= active.line ? 'is-on' : ''}`} key={line}>
            <b>{String(i + 1).padStart(2, '0')}</b>{line}<em>{i < active.line || progress === 100 ? 'OK' : i === active.line ? 'RUN' : '...'}</em>
          </span>
        ))}
      </div>
      <div className="boot-bottom">
        <div className="boot-state"><span>STATUS</span><strong key={active.text}>{active.text}</strong></div>
        <div className="boot-progress-wrap"><div className="boot-progress-track"><span style={{ width: `${progress}%` }} /></div><span className="boot-percent">{String(Math.round(progress)).padStart(3, '0')}%</span></div>
      </div>
      <div className="boot-shutter boot-shutter-top" /><div className="boot-shutter boot-shutter-bottom" />
    </div>
  );
}
