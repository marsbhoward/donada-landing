'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useSyncExternalStore, ReactNode } from 'react';

const APP_URL  = 'https://app.donada.io';
const MINT_URL = 'https://mint.donada.io';

// ── Scroll-triggered fade-up ──────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));
        } else {
          el.classList.remove('visible');
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`fade-up ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

// ── Count-Up Animation ────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number, active: boolean): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, active]);

  return value;
}

function CountUpStat({
  target,
  format,
  label,
  estimated,
}: {
  target: number;
  format: (n: number) => string;
  label: string;
  estimated: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const value = useCountUp(target, 1500, active);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(true); },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="glass p-5 rounded-xl flex flex-col items-center gap-1 text-center">
      <p className="text-2xl font-bold tracking-tight">
        {format(value)}
        {estimated && <span className="text-sm text-white/70 ml-2">*</span>}
      </p>
      <p className="text-xs text-[#888] leading-snug">{label}</p>
    </div>
  );
}

const STATS = [
  { target: 1000,  format: (n: number) => n.toLocaleString(),              label: 'Piece NFT Collection on Cardano', estimated: false },
  { target: 49800, format: (n: number) => `${(n / 1000).toFixed(1)}k ₳`,  label: 'ADA donated to charity',          estimated: true  },
  { target: 99600, format: (n: number) => `${(n / 1000).toFixed(1)}k ₳`,  label: 'ADA awarded to winners',          estimated: true  },
  { target: 1,     format: (n: number) => String(n),                        label: 'Quarterly prize winner',          estimated: false },
];

// ── Mint-live hook ────────────────────────────────────────────────────────────

function useMintLive() {
  const [live, setLive] = useState(() => Date.now() >= MINT_DATE.getTime());
  useEffect(() => {
    if (live) return;
    const id = setInterval(() => { if (Date.now() >= MINT_DATE.getTime()) setLive(true); }, 1000);
    return () => clearInterval(id);
  }, [live]);
  return live;
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  ['#how-it-works', 'How It Works'],
  ['#faq',          'FAQ'],
  ['#collection',   'Collection'],
  ['#roadmap',      'Roadmap'],
] as const;

function Nav() {
  const [open, setOpen] = useState(false);
  const mintLive = useMintLive();
  const navHref  = mintLive ? APP_URL  : MINT_URL;
  const navLabel = mintLive ? 'Launch App' : 'Mint';

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] backdrop-blur-sm bg-[#0d0d0d]/80">
        {/* Logo — doubles as mobile menu toggle */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          className="flex items-center gap-3 sm:cursor-default"
        >
          <Image src="/Donada_Logo.png" alt="DONADA" width={32} height={32} className="rounded-full" />
          <span className="font-semibold tracking-widest text-base"><span className="text-stroke">DON</span>ADA</span>
          {/* Chevron — mobile only */}
          <svg
            className="sm:hidden w-3 h-3 text-[#888] transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <polyline points="2,4 6,8 10,4" />
          </svg>
        </button>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-8 text-sm text-[#888]">
          {NAV_LINKS.map(([href, label]) => (
            <a key={href} href={href} className="nav-link hover:text-white transition-colors">{label}</a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href={navHref}
            className="nav-launch text-sm font-medium px-4 py-2 rounded-full border border-white/20 text-white hover:bg-white hover:text-black transition-all"
          >
            {navLabel}
          </a>
        </div>
      </nav>

      {/* Mobile backdrop — closes menu on outside tap */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      {/* Mobile dropdown */}
      <div
        className={`sm:hidden fixed left-0 right-0 z-40 glass border-b border-white/[0.06] px-6 overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'top-[65px] max-h-72 py-5 opacity-100' : 'top-[65px] max-h-0 py-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col gap-5">
          {NAV_LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              {label}
            </a>
          ))}
          <div className="border-t border-white/[0.06] pt-4">
            <a
              href={navHref}
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-medium px-4 py-2.5 rounded-full border border-white/20 text-white hover:bg-white hover:text-black transition-all"
            >
              {navLabel}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

const ORBIT_LIGHT: React.CSSProperties = {
  position: 'absolute',
  right: -4,
  top: -4,
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: 'var(--orbit-fill)',
  boxShadow: 'var(--orbit-glow)',
};

// Conic-gradient arc that fades from white (at 100% = bright head) to transparent
// over 90°. Masked to a thin ring at the orbit radius (70 px from centre).
// The 140×140 div is offset -10 px so its centre aligns with the 120×120 logo centre.
const TRAIL_RING: React.CSSProperties = {
  position: 'absolute',
  top: -10,
  left: -10,
  width: 140,
  height: 140,
  borderRadius: '50%',
  background: 'conic-gradient(from 0deg, transparent 0%, transparent 75%, var(--orbit-trail-far) 80%, var(--orbit-trail-near) 88%, var(--orbit-trail-mid) 95%, var(--orbit-trail-end) 100%)',
  WebkitMask: 'radial-gradient(circle at center, transparent 67px, white 68px, white 72px, transparent 73px)',
  mask:        'radial-gradient(circle at center, transparent 67px, white 68px, white 72px, transparent 73px)',
  transformOrigin: 'center',
  pointerEvents: 'none',
};

function Hero() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const arm1Ref       = useRef<HTMLDivElement>(null);
  const arm2Ref       = useRef<HTMLDivElement>(null);
  const trail1Ref     = useRef<HTMLDivElement>(null);
  const trail2Ref     = useRef<HTMLDivElement>(null);
  const rafRef        = useRef<number>(0);
  const orbitState    = useRef({ angle: 0, hovering: false });
  const mintLive      = useMintLive();

  useEffect(() => {
    const SPEED = 0.35;
    const state = orbitState.current;
    const tick = () => {
      if (!state.hovering) state.angle = (state.angle + SPEED) % 360;
      if (arm1Ref.current)   arm1Ref.current.style.transform   = `rotate(${state.angle}deg)`;
      if (arm2Ref.current)   arm2Ref.current.style.transform   = `rotate(${state.angle + 180}deg)`;
      // +90 shifts the conic bright-end (at 12 o'clock) to align with the light head
      if (trail1Ref.current) trail1Ref.current.style.transform = `rotate(${state.angle + 90}deg)`;
      if (trail2Ref.current) trail2Ref.current.style.transform = `rotate(${state.angle + 270}deg)`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleOrbitMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    orbitState.current.angle = Math.atan2(
      e.clientY - rect.top  - rect.height / 2,
      e.clientX - rect.left - rect.width  / 2
    ) * (180 / Math.PI);
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden">
      {/* Ambient glow behind logo */}
      <div aria-hidden="true" className="hero-ambient pointer-events-none absolute inset-0" />

      {/* Logo + orbiting lights */}
      <div
        ref={containerRef}
        className="relative mb-10 animate-float"
        style={{ width: 120, height: 120 }}
        onMouseMove={handleOrbitMouseMove}
        onMouseEnter={() => { orbitState.current.hovering = true; }}
        onMouseLeave={() => { orbitState.current.hovering = false; }}
      >
        <Image src="/Donada_Logo.png" alt="DONADA" width={120} height={120} className="rounded-full" priority />
        {/* Fading arc trails — rendered before main arms so they sit underneath */}
        <div ref={trail1Ref} aria-hidden="true" className="orbit-trail absolute pointer-events-none" style={TRAIL_RING} />
        <div ref={trail2Ref} aria-hidden="true" className="orbit-trail absolute pointer-events-none" style={TRAIL_RING} />
        {/* Orbit arm 1 */}
        <div ref={arm1Ref} aria-hidden="true" className="absolute pointer-events-none"
          style={{ top: '50%', left: '50%', width: 70, height: 0, transformOrigin: '0 0' }}>
          <div className="orbit-light" style={ORBIT_LIGHT} />
        </div>
        {/* Orbit arm 2 — starts 180° opposite */}
        <div ref={arm2Ref} aria-hidden="true" className="absolute pointer-events-none"
          style={{ top: '50%', left: '50%', width: 70, height: 0, transformOrigin: '0 0' }}>
          <div className="orbit-light" style={ORBIT_LIGHT} />
        </div>
      </div>

      <h1 className="hero-shimmer text-5xl sm:text-7xl font-bold tracking-tight leading-none mb-6 animate-fade-up [animation-delay:100ms]">
        DONADA NFTs.
      </h1>
      <p className="text-3xl sm:text-4xl font-light text-white/60 mb-4 tracking-wide animate-fade-up [animation-delay:250ms]">
        Buy. Rent. Enter. Win.
      </p>
      <p className="text-base sm:text-lg text-[#888] max-w-md mb-12 leading-relaxed animate-fade-up [animation-delay:400ms]">
        Smart contracts. Trustless draws. Built on Cardano.
      </p>
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 animate-fade-up [animation-delay:550ms]">
        {mintLive ? (
          <a
            href={APP_URL}
            className="btn-primary px-8 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Launch App
          </a>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[10px] text-[#888] uppercase tracking-widest">App Opens</p>
            <div className="relative inline-flex">
              <span
                aria-disabled="true"
                className="px-8 py-3.5 rounded-full bg-white/10 cursor-not-allowed select-none border border-white/10 font-semibold text-sm text-transparent"
              >
                Launch App
              </span>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Countdown compact />
              </div>
            </div>
          </div>
        )}
        <a
          href="#how-it-works"
          className="hero-secondary px-8 py-3.5 rounded-full border border-white/20 text-sm font-medium hover:bg-white hover:text-black transition-colors"
        >
          How It Works
        </a>
        <a
          href={MINT_URL}
          className="btn-primary px-8 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Mint
        </a>
      </div>
      <div className="flex items-center gap-6 mt-8 animate-fade-up [animation-delay:700ms]">
        <a href="https://x.com/donada_nft" className="text-xs text-[#888] hover:text-white transition-colors tracking-wide">X</a>
        <span className="w-px h-3 bg-white/10" />
        <a href="https://instagram.com/donada_nft" className="text-xs text-[#888] hover:text-white transition-colors tracking-wide">Instagram</a>
        <span className="w-px h-3 bg-white/10" />
        <a href="https://discord.gg/r4UNu5qTU" className="text-xs text-[#888] hover:text-white transition-colors tracking-wide">Discord</a>
      </div>
    </section>
  );
}

// ── Theme Toggle ──────────────────────────────────────────────────────────────

function subscribeToTheme(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}
const getTheme       = () => (document.documentElement.getAttribute('data-theme') ?? 'dark') as 'dark' | 'light';
const getServerTheme = () => 'dark' as const;

function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, getServerTheme);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      suppressHydrationWarning
      className="text-[#888] hover:text-white transition-colors p-1"
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning>
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

// ── Countdown ─────────────────────────────────────────────────────────────────

const MINT_DATE = new Date('2026-07-31T20:00:00.000Z'); // 3pm CDT

function Countdown({ compact = false }: { compact?: boolean }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const tick = () => {
      const diff = MINT_DATE.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className={compact ? 'flex items-end gap-2.5' : 'flex flex-col gap-2'}>
      {!compact && <p className="text-xs text-[#888] uppercase tracking-widest">Mint Opens</p>}
      <div className={compact ? 'contents' : 'flex items-end gap-3'}>
        {[{ v: timeLeft.d, l: 'Days' }, { v: timeLeft.h, l: 'Hrs' }, { v: timeLeft.m, l: 'Min' }, { v: timeLeft.s, l: 'Sec' }].map(({ v, l }) => (
          <div key={l} className="flex flex-col items-center">
            <span className={`font-mono font-bold tabular-nums ${compact ? 'text-sm' : 'text-xl'}`}>{String(v).padStart(2, '0')}</span>
            <span className={`text-[#888] ${compact ? 'text-[9px]' : 'text-xs'}`}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mission & About ───────────────────────────────────────────────────────────

function MissionAbout() {
  return (
    <section className="py-32 px-6 border-t border-white/[0.06]">
      <div className="max-w-2xl mx-auto flex flex-col gap-16">
        <FadeUp>
          <div className="glass flex flex-col gap-4 p-8 rounded-2xl">
            <p className="text-xs text-[#888] uppercase tracking-widest">Mission</p>
            <p className="text-2xl sm:text-3xl font-light leading-snug text-white/90">
              DONADA exists on a single principle: equivalent exchange.
            </p>
            <p className="text-[#888] text-sm leading-relaxed max-w-lg">
              We believe on-chain value should move in both directions — rewarding participants who engage, and returning value to the physical world through donations to verified 501(c) nonprofits. Every transaction, every draw, every rental is part of that cycle.
            </p>
            <p className="text-amber text-sm italic">Nothing given without something returned.</p>
          </div>
        </FadeUp>

      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────

const ENTRY_PATHS = [
  {
    label: 'Own an NFT',
    body: 'Hold a DONADA NFT for a permanent entry in every draw.',
  },
  {
    label: 'Rent an NFT',
    body: 'Pay the rental fee to borrow an NFT. The owner earns yield — you get the entry.',
  },
  {
    label: 'Register a Wallet',
    body: 'No NFT needed. Register your wallet through our socials — no purchase necessary.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 px-6 border-t border-white/[0.06]">
      <div className="max-w-3xl mx-auto flex flex-col">
        <FadeUp>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-center tracking-tight">
            How It Works
          </h2>
          <p className="text-[#888] text-sm text-center mb-14 max-w-lg mx-auto leading-relaxed">DONADA is a Cardano-native sweepstakes and rental platform. NFT holders list their assets for rent and earn yield. Renters pay a fee and receive a stake in the draw. Free entry can also be obtained through our socials — no purchase necessary.</p>
        </FadeUp>

        {/* Entry paths */}
        <div className="grid sm:grid-cols-3 gap-4">
          {ENTRY_PATHS.map((path, i) => (
            <FadeUp key={path.label} delay={i * 100}>
              <div className="glass h-full p-5 rounded-xl flex flex-col gap-2">
                <p className="text-sm font-semibold">{path.label}</p>
                <p className="text-xs text-[#888] leading-relaxed">{path.body}</p>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* Desktop: three arrows | Mobile: one */}
        <FadeUp delay={350}>
          <div className="hidden sm:grid sm:grid-cols-3 py-4">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="flex justify-center text-xl animate-arrow-drip"
                style={{ animationDelay: `${i * 150}ms` }}
              >↓</div>
            ))}
          </div>
          <div className="sm:hidden flex justify-center py-4 text-xl animate-arrow-drip">↓</div>
        </FadeUp>

        {/* Enter the Draw */}
        <FadeUp delay={450}>
          <div className="p-6 rounded-xl border border-white/25 bg-white/[0.04] backdrop-blur-sm text-center animate-glow-pulse">
            <p className="font-semibold mb-1">Enter the Draw</p>
            <p className="text-xs text-[#888] leading-relaxed max-w-sm mx-auto">
              All paths feed into a single draw. A snapshot is taken at draw time to confirm eligible entries — one winner selected at random.
            </p>
          </div>
        </FadeUp>

        {/* Arrow */}
        <FadeUp delay={550}>
          <div className="flex justify-center py-4 text-xl animate-arrow-drip">↓</div>
        </FadeUp>

        {/* Win On-Chain */}
        <FadeUp delay={600}>
          <div className="flex justify-center">
            <div className="glass p-6 rounded-xl text-center max-w-xs w-full">
              <p className="font-semibold mb-1">Win On-Chain</p>
              <p className="text-xs text-[#888] leading-relaxed">
                Prize paid instantly via smart contract — no middleman, no waiting.
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Do I need to buy an NFT to enter?',
    a: 'No purchase necessary. You can register your wallet for a free entry through our socials — X or Discord. Anyone can participate regardless of whether they hold or rent an NFT.',
  },
  {
    q: 'How does the draw work?',
    a: 'At draw time, a snapshot is taken of all eligible wallets — NFT holders, active renters, and registered wallets. A verifiably random winner is selected on-chain via our Plutus smart contract, and the prize is paid directly to their wallet. No claiming required.',
  },
  {
    q: 'What is NFT renting?',
    a: 'Renting lets you borrow a DONADA NFT for a fee set by the owner. While you hold the rental, you receive a draw entry just like an owner would. The owner earns passive yield, and 10% of every rental contract flows into the prize pool.',
  },
  {
    q: 'How are prizes funded?',
    a: '20% of primary mint revenue seeds the prize pool. Ongoing rental fees (10% per contract) and royalties from secondary sales on the open market sustain draws after mint funds are distributed. 10% of mint proceeds also goes to verified 501(c) nonprofit charities.',
  },
  {
    q: 'How do I know the draw is fair?',
    a: 'Every step — snapshot, randomness, payout — is executed and recorded on the Cardano blockchain. The smart contract code is public, and all transactions are verifiable by anyone with a block explorer.',
  },
  {
    q: 'When is the first draw?',
    a: 'The first draw is scheduled for September 4, 2026. Subsequent draws run quarterly. The mint opens July 31, 2026.',
  },
  {
    q: 'What is the mint price?',
    a: '498 ₳ per NFT. The collection is 1,000 pieces, generatively created on Cardano.',
  },
  {
    q: 'New to Cardano? Which wallet should I use?',
    a: 'You\'ll need a Cardano wallet to hold ADA and interact with the platform. We recommend Eternl (especially on mobile — their in-app browser is out of beta), Lace, or Vespr (great on mobile, though their browser is still in beta). All three let you buy ADA directly inside the app, so you don\'t need a separate exchange to get started.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-xl mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-6 px-5 py-4 text-left"
      >
        <span className="text-sm font-medium text-white/90">{q}</span>
        <span
          className="shrink-0 text-[#888] text-lg leading-none transition-transform duration-300"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          +
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? '300px' : '0px' }}
      >
        <p className="text-sm text-white/50 leading-relaxed px-5 pb-4">{a}</p>
      </div>
    </div>
  );
}

function FAQ() {
  return (
    <section id="faq" className="py-32 px-6 border-t border-white/[0.06]">
      <div className="max-w-2xl mx-auto">
        <FadeUp>
          <p className="text-xs text-[#888] uppercase tracking-widest mb-4">FAQ</p>
          <h2 className="text-3xl font-bold mb-12">Common questions.</h2>
        </FadeUp>
        <FadeUp delay={100}>
          <div>
            {FAQ_ITEMS.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Collection ────────────────────────────────────────────────────────────────

function Collection() {
  return (
    <section id="collection" className="py-32 px-6 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto">
        <FadeUp>
          <h2 className="text-3xl sm:text-4xl font-bold mb-16 tracking-tight">
            The Collection
          </h2>
        </FadeUp>

        <FadeUp delay={80}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
            {STATS.map(stat => (
              <CountUpStat key={stat.label} {...stat} />
            ))}
          </div>
          <p className="text-xs text-white/50 mb-16">* Estimated based on full collection sell-out at 498 ₳ per NFT.</p>
        </FadeUp>
        <FadeUp delay={100}>
          <div className="glass flex flex-row items-start gap-5 sm:gap-10 p-5 sm:p-8 rounded-2xl">
            <Image
              src="/Donada_Logo.png"
              alt="DONADA Collection"
              width={160}
              height={160}
              className="rounded-xl flex-shrink-0 w-20 h-20 sm:w-40 sm:h-40"
            />
            <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
              <div>
                <p className="text-xs text-[#888] uppercase tracking-widest mb-1">Collection</p>
                <p className="font-semibold text-lg">DONADA</p>
              </div>
              <div>
                <p className="text-xs text-[#888] uppercase tracking-widest mb-1">Blockchain</p>
                <p className="font-semibold">Cardano</p>
              </div>
              <Countdown />
              <div className="flex flex-wrap gap-3">
                <div className="relative inline-flex">
                  <span className="absolute inset-0 rounded-full animate-ping-tight" style={{ background: 'rgba(196,154,47,0.22)' }} />
                  <a
                    href="https://mint.donada.io"
                    className="relative text-sm font-medium px-5 py-2.5 rounded-full border border-white/20 hover:bg-white/5 transition-colors"
                  >
                    Mint
                  </a>
                </div>
                <a
                  href="https://www.wayup.io/"
                  className="text-sm font-medium px-5 py-2.5 rounded-full border border-white/20 hover:bg-white/5 transition-colors"
                >
                  Browse Listings
                </a>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Roadmap ───────────────────────────────────────────────────────────────────

const MILESTONES = [
  { status: 'done',     label: 'Website and web app' },
  { status: 'done',     label: 'Rental smart contract (PlutusV3)' },
  { status: 'done',     label: 'Preview testnet testing' },
  { status: 'active',   label: 'Discord server' },
  { status: 'upcoming', label: 'Mint and mainnet launch' },
  { status: 'upcoming', label: 'Verified holder voting' },
  { status: 'upcoming', label: 'First drawing' },
  { status: 'upcoming', label: 'Brand partnerships' },
  { status: 'upcoming', label: 'Second collection' },
  { status: 'upcoming', label: 'DONADA stake pool' },
];

function Roadmap() {
  return (
    <section id="roadmap" className="relative py-32 px-6 border-t border-white/[0.06] overflow-hidden">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 70% 50%, rgba(255,255,255,0.04) 0%, transparent 100%)' }}
      />
      <div className="max-w-5xl mx-auto flex flex-col items-center">
        <FadeUp>
          <h2 className="text-3xl sm:text-4xl font-bold mb-10 tracking-tight">Roadmap</h2>
        </FadeUp>
        <FadeUp delay={80} className="w-full max-w-sm">
          <div className="glass rounded-2xl p-8 flex flex-col gap-5">
            {MILESTONES.map((m, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  m.status === 'done'   ? 'bg-white' :
                  m.status === 'active' ? 'accent-dot' :
                                          'bg-white/10'
                }`} />
                <span className={`text-sm ${
                  m.status === 'done'   ? 'text-white/40 line-through' :
                  m.status === 'active' ? 'text-white/70' :
                                          'text-white/30'
                }`}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-[#888]">
        <div className="flex items-center gap-3">
          <Image src="/Donada_Logo.png" alt="DONADA" width={24} height={24} className="rounded-full opacity-70" />
          <span className="tracking-widest text-xs font-medium text-white/40">DONADA</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://x.com/donada_nft" className="hover:text-white transition-colors">X</a>
          <a href="https://instagram.com/donada_nft" className="hover:text-white transition-colors">Instagram</a>
          <a href="https://discord.gg/r4UNu5qTU" className="hover:text-white transition-colors">Discord</a>
          <a href={APP_URL} className="hover:text-white transition-colors">App</a>
        </div>
        <span className="text-xs text-white/20">© {new Date().getFullYear()} DONADA</span>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <MissionAbout />
        <HowItWorks />
        <FAQ />
        <Collection />
        <Roadmap />
      </main>
      <Footer />
    </>
  );
}
