import React, { useState, useEffect, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  done: boolean;
}

// ─── Keyframes ───────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes cascadeIn { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
@keyframes checkDraw { from { stroke-dashoffset:20 } to { stroke-dashoffset:0 } }
@keyframes strikeIn { from { width:0 } to { width:100% } }
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
`;

// ─── Gauge SVG ───────────────────────────────────────────────────
const Gauge: React.FC<{ pct: number; arcColor: string; arcColorLight: string }> = ({ pct, arcColor, arcColorLight }) => {
  const cx = 110, cy = 105, r = 90;
  const arcD = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;

  return (
    <svg viewBox="0 0 220 115" width={220} height={115} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={arcColor} />
          <stop offset="100%" stopColor={arcColorLight} />
        </linearGradient>
        <mask id="gaugeMask">
          <path d={arcD} fill="none" stroke="white" strokeWidth={14} strokeLinecap="round" />
        </mask>
      </defs>
      <path d={arcD} fill="none" stroke="color-mix(in oklch, var(--foreground) 6%, transparent)" strokeWidth={14} strokeLinecap="round" />
      {pct > 0 && (
        <path d={arcD} fill="none" stroke="url(#gaugeGrad)" strokeWidth={16} strokeLinecap="round"
          pathLength={100} strokeDasharray={`${pct} 100`} mask="url(#gaugeMask)" />
      )}
    </svg>
  );
};

// ─── Color logic ─────────────────────────────────────────────────
function getColors(pct: number) {
  if (pct >= 80) return { arc: '#10B981', arcLight: '#34D399', glow: 'rgba(16,185,129,' };
  if (pct >= 40) return { arc: '#3B82F6', arcLight: '#60A5FA', glow: 'rgba(59,130,246,' };
  return { arc: '#F59E0B', arcLight: '#FBBF24', glow: 'rgba(245,158,11,' };
}

const dateLabel = () =>
  new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

// ─── Main Screen ─────────────────────────────────────────────────
interface Props {
  tasks: Task[];
  onClose: () => void;
}

export const PodsumowanieScreen: React.FC<Props> = ({ tasks, onClose }) => {
  const [animPct, setAnimPct] = useState(0);
  const rafRef = useRef<number | null>(null);
  const styleInjected = useRef(false);

  const done = tasks.filter(t => t.done);
  const notDone = tasks.filter(t => !t.done);
  const total = tasks.length;
  const realPct = total > 0 ? Math.round((done.length / total) * 100) : 0;
  const colors = getColors(realPct);

  useEffect(() => {
    if (!styleInjected.current) {
      const style = document.createElement('style');
      style.textContent = KEYFRAMES;
      document.head.appendChild(style);
      styleInjected.current = true;
    }
  }, []);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimPct(Math.round(eased * realPct));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => { rafRef.current = requestAnimationFrame(tick); }, 400);
    return () => { clearTimeout(timer); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [realPct]);

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      overflow: 'hidden', color: 'var(--foreground)', display: 'flex', flexDirection: 'column',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      background: 'var(--background)',
    }}>
      {/* Accent glow (same as body::before) */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(86% 50% at 50% 22%, color-mix(in oklab, var(--primary) 15%, transparent) 0%, transparent 60%),
          radial-gradient(100% 56% at 50% 70%, color-mix(in oklab, var(--primary) 20%, transparent) 0%, color-mix(in oklab, var(--primary) 8%, transparent) 42%, transparent 72%)
        `,
      }} />

      {/* Scrollable content */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '24px 20px 16px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28, animation: 'cascadeIn 0.5s ease-out both' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, marginBottom: 6 }}>{dateLabel()}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--foreground)', letterSpacing: -0.5 }}>Podsumowanie dnia</div>
        </div>

        {/* Gauge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32, animation: 'cascadeIn 0.5s ease-out 0.15s both' }}>
          <div style={{ position: 'relative', width: 220, height: 130 }}>
            <Gauge pct={animPct} arcColor={colors.arc} arcColorLight={colors.arcLight} />
            <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, color: 'var(--foreground)', lineHeight: 1 }}>{animPct}%</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginTop: 2 }}>ukończone</div>
            </div>
          </div>
        </div>

        {/* Two-column card */}
        <div style={{
          borderRadius: 20,
          padding: '16px 14px', marginBottom: 24,
          animation: 'cascadeIn 0.5s ease-out 0.3s both',
          display: 'flex', gap: 12,
          background: 'color-mix(in oklch, var(--foreground) 5%, transparent)',
        }}>
          {/* Done column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Zrobione ({done.length})</span>
            </div>
            {done.map((task, i) => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5,
                animation: `cascadeIn 0.4s ease-out ${0.4 + i * 0.08}s both`,
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#10B981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff"
                    strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ strokeDasharray: 20, animation: `checkDraw 0.4s ease-out ${0.6 + i * 0.08}s both` }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div style={{ position: 'relative', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{task.title}</span>
                  <div style={{
                    position: 'absolute', top: '50%', left: 0, height: 1,
                    background: 'var(--muted-foreground)', borderRadius: 1,
                    animation: `strikeIn 0.35s ease-out ${0.7 + i * 0.08}s both`, width: '100%',
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />

          {/* Not done column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted-foreground)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Niezrobione ({notDone.length})</span>
            </div>
            {notDone.map((task, i) => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5,
                animation: `cascadeIn 0.4s ease-out ${0.6 + i * 0.08}s both`,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--muted-foreground)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', flex: 1, minWidth: 0 }}>{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom button */}
      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0, padding: '0 20px 20px' }}>
        <div
          onClick={onClose}
          style={{
            backgroundImage: 'var(--gradient-primary)',
            borderRadius: 28, padding: 16, textAlign: 'center',
            cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--primary-foreground)',
            transition: 'all 0.2s', animation: 'fadeIn 0.5s ease-out 0.8s both',
          }}
        >
          Gotowe
        </div>
      </div>
    </div>
  );
};

export default PodsumowanieScreen;
