import { useEffect, useRef } from 'react';
const asset = (name) => `${import.meta.env.BASE_URL || '/'}assets/${name}`;

export default function CoreGraphic() {
  const ref = useRef(null);
  const state = useRef({ tx: 0, ty: 0, x: 0, y: 0, active: false, raf: 0 });

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return undefined;
    let lastFrame = performance.now();
    const frame = (time) => {
      const node = ref.current;
      if (!node) return;
      const delta = Math.min(Math.max((time - lastFrame) / 1000, 0), 0.05);
      lastFrame = time;
      const ease = 1 - Math.exp(-8.5 * delta);
      const s = state.current;
      s.x += (s.tx - s.x) * ease;
      s.y += (s.ty - s.y) * ease;
      node.style.transform = `perspective(950px) rotateY(${s.x * 5.5}deg) rotateX(${s.y * -5.5}deg) translate3d(0,0,0)`;
      node.style.setProperty('--core-x', `${(s.x + 0.5) * 100}%`);
      node.style.setProperty('--core-y', `${(s.y + 0.5) * 100}%`);
      s.raf = requestAnimationFrame(frame);
    };
    state.current.raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(state.current.raf);
  }, []);

  const move = (event) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    state.current.tx = (event.clientX - rect.left) / rect.width - 0.5;
    state.current.ty = (event.clientY - rect.top) / rect.height - 0.5;
    state.current.active = true;
  };
  const reset = () => {
    state.current.tx = 0;
    state.current.ty = 0;
    state.current.active = false;
  };

  return (
    <div className="core-stage" ref={ref} onPointerMove={move} onPointerLeave={reset}>
      <div className="core-energy" />
      <div className="core-ring ring-a" /><div className="core-ring ring-b" /><div className="core-ring ring-c" />
      <div className="core-logo-stack">
        <img className="core-logo core-logo-mono" src={asset('holosoft-mark-mono.svg')} alt="" />
        <img className="core-logo core-logo-color" src={asset('holosoft-mark.svg')} alt="" />
      </div>
      <div className="axis axis-x" /><div className="axis axis-y" />
      <span className="core-label label-a">NODE_01</span><span className="core-label label-b">CORE ONLINE</span><span className="core-label label-c">00.0001ms</span>
    </div>
  );
}
