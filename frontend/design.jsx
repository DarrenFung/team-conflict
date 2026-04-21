// Screens for Care Navigator — patient mobile flow
// Palette: sky/violet glassmorphism. Medium intensity by default.
// Tweak: glass intensity (subtle / medium / heavy) via window.__glassLevel

const CN_FONT = '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif';
const CN_DISPLAY = '"Instrument Serif", "Times New Roman", serif';

// ── Backdrop with soft blobs ────────────────────────────────────
function CNBackdrop({ level = 'medium', variant = 'a' }) {
  // soft sky-to-violet mesha
  const blobs = {
    a: [
      { top: '-10%', left: '-20%', size: 380, color: '#a7d8ff' },
      { top: '30%',  right: '-25%', size: 340, color: '#c9b8ff' },
      { bottom: '-15%', left: '10%', size: 300, color: '#d6e9ff' },
    ],
    b: [
      { top: '-15%', right: '-10%', size: 420, color: '#b8c8ff' },
      { bottom: '-10%', left: '-20%', size: 340, color: '#e9d6ff' },
    ],
    c: [
      { top: '5%', left: '20%', size: 260, color: '#cfe4ff' },
      { bottom: '10%', right: '-10%', size: 320, color: '#d8c4ff' },
    ],
  }[variant];

  const base = {
    subtle:  'linear-gradient(155deg, #f4f7fc 0%, #eef0fa 60%, #efe8fa 100%)',
    medium:  'linear-gradient(155deg, #dfeaff 0%, #e6e1ff 55%, #f2e8ff 100%)',
    heavy:   'linear-gradient(155deg, #c8dcff 0%, #d5c8ff 55%, #ecd8ff 100%)',
  }[level];

  const blobOpacity = { subtle: 0.35, medium: 0.75, heavy: 1 }[level];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: base }}>
      {blobs.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', top: b.top, left: b.left, right: b.right, bottom: b.bottom,
          width: b.size, height: b.size, borderRadius: '50%',
          background: b.color, opacity: blobOpacity,
          filter: 'blur(60px)',
        }} />
      ))}
      {/* noise */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }} />
    </div>
  );
}

// ── Glass surface ─────────────────────────────────────────────
function CNGlass({ level = 'medium', children, style = {}, elevated = true }) {
  const cfg = {
    subtle: { blur: 10, sat: 140, bg: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.6)' },
    medium: { blur: 22, sat: 180, bg: 'rgba(255,255,255,0.42)', border: 'rgba(255,255,255,0.55)' },
    heavy:  { blur: 34, sat: 200, bg: 'rgba(255,255,255,0.28)', border: 'rgba(255,255,255,0.45)' },
  }[level];
  return (
    <div style={{
      position: 'relative',
      borderRadius: 24,
      background: cfg.bg,
      backdropFilter: `blur(${cfg.blur}px) saturate(${cfg.sat}%)`,
      WebkitBackdropFilter: `blur(${cfg.blur}px) saturate(${cfg.sat}%)`,
      border: `0.5px solid ${cfg.border}`,
      boxShadow: elevated
        ? '0 1px 0 rgba(255,255,255,0.6) inset, 0 -0.5px 0 rgba(255,255,255,0.3) inset, 0 10px 30px rgba(40,30,90,0.08), 0 2px 6px rgba(40,30,90,0.04)'
        : '0 1px 0 rgba(255,255,255,0.5) inset',
      ...style,
    }}>{children}</div>
  );
}

// ── Logo / wordmark ───────────────────────────────────────────
function CNLogo({ size = 22 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{
        width: size, height: size, borderRadius: size/2,
        background: 'linear-gradient(135deg, #5b8def 0%, #8b6cf0 100%)',
        position: 'relative', boxShadow: '0 2px 6px rgba(91,141,239,0.35), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}>
        <div style={{
          position: 'absolute', inset: size * 0.22, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), transparent 50%)',
        }} />
      </div>
      <div style={{ fontFamily: CN_FONT, fontSize: size * 0.72, fontWeight: 600, letterSpacing: -0.3, color: '#1a1333' }}>
        Lumen<span style={{ opacity: 0.55, fontWeight: 400 }}>Care</span>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────
const Chip = ({ children, active, level = 'medium', onClick }) => (
  <div onClick={onClick} style={{
    padding: '10px 14px', borderRadius: 999,
    background: active ? 'rgba(91,108,240,0.95)' : 'rgba(255,255,255,0.55)',
    color: active ? '#fff' : '#2a2450',
    fontSize: 14, fontWeight: 500,
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    border: `0.5px solid ${active ? 'rgba(91,108,240,0.5)' : 'rgba(255,255,255,0.65)'}`,
    boxShadow: active ? '0 4px 12px rgba(91,108,240,0.3)' : '0 1px 0 rgba(255,255,255,0.5) inset',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }}>{children}</div>
);

const Eyebrow = ({ children, color = '#6857e0' }) => (
  <div style={{
    fontSize: 11, fontWeight: 600, letterSpacing: 1.8, textTransform: 'uppercase',
    color, display: 'flex', alignItems: 'center', gap: 6,
  }}>
    <span style={{ width: 4, height: 4, borderRadius: '50%', background: color }} />
    {children}
  </div>
);

const PrimaryButton = ({ children, disabled, full = true }) => (
  <button disabled={disabled} style={{
    width: full ? '100%' : undefined,
    height: 54, borderRadius: 18, border: 'none',
    background: disabled
      ? 'rgba(120,110,180,0.25)'
      : 'linear-gradient(180deg, #6b7cf5 0%, #5b6bec 100%)',
    color: '#fff', fontSize: 16, fontWeight: 600, letterSpacing: -0.2,
    fontFamily: CN_FONT,
    boxShadow: disabled ? 'none' : '0 8px 20px rgba(91,108,240,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
    cursor: disabled ? 'default' : 'pointer',
  }}>{children}</button>
);

// ── firstHx badge ─────────────────────────────────────────────
const FirstHxBadge = ({ compact }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: compact ? '4px 8px' : '5px 10px', borderRadius: 999,
    background: 'rgba(26,19,51,0.06)',
    border: '0.5px solid rgba(26,19,51,0.08)',
    fontSize: 10.5, color: 'rgba(26,19,51,0.65)',
    fontWeight: 500, letterSpacing: 0.2,
  }}>
    <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1"/><path d="M5 2.5v2.8L6.8 6.5" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/></svg>
    Powered by <span style={{ fontWeight: 700, color: 'rgba(26,19,51,0.85)' }}>firstHx</span>
  </div>
);

// ── SCREEN 1 · Auth & Registration ────────────────────────────
function ScreenAuth({ level = 'medium' }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', fontFamily: CN_FONT }}>
      <CNBackdrop level={level} variant="a" />
      <div style={{ position: 'relative', padding: '80px 24px 28px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
        <CNLogo />

        <div style={{ marginTop: 56 }}>
          <Eyebrow>Step 1 · Welcome</Eyebrow>
          <h1 style={{
            fontFamily: CN_DISPLAY, fontWeight: 400, fontSize: 38, lineHeight: 1.08,
            margin: '12px 0 12px', letterSpacing: -0.8, color: '#14102a',
          }}>
            Hello.<br/>
            <span style={{ fontStyle: 'italic', color: '#5b4fc7' }}>Let's get you</span><br/>
            to the right care.
          </h1>
          <p style={{ color: 'rgba(20,16,42,0.6)', fontSize: 15, lineHeight: 1.5, margin: 0, maxWidth: 300 }}>
            Sign in and we'll route you to a pharmacist, specialist or GP — usually without a wait.
          </p>
        </div>

        <div style={{ flex: 1 }} />

        <CNGlass level={level} style={{ padding: 18 }}>
          <div style={{ fontSize: 12, color: 'rgba(20,16,42,0.55)', marginBottom: 6, letterSpacing: 0.1 }}>NHS number or email</div>
          <div style={{ fontSize: 18, color: '#14102a', fontWeight: 500, letterSpacing: -0.3 }}>
            esther.park@mail.com
            <span style={{ display: 'inline-block', width: 2, height: 18, background: '#5b4fc7', marginLeft: 2, verticalAlign: -2, animation: 'caret 1s steps(2) infinite' }} />
          </div>
          <div style={{ height: 1, background: 'rgba(20,16,42,0.08)', margin: '14px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: 'rgba(20,16,42,0.55)' }}>Use Face ID next time</div>
            <div style={{ width: 36, height: 22, borderRadius: 11, background: '#5b6bec', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
        </CNGlass>

        <div style={{ height: 14 }} />
        <PrimaryButton>Continue</PrimaryButton>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 14px' }}>
          <div style={{ flex: 1, height: 0.5, background: 'rgba(20,16,42,0.15)' }} />
          <div style={{ fontSize: 11, color: 'rgba(20,16,42,0.45)', letterSpacing: 0.5 }}>OR</div>
          <div style={{ flex: 1, height: 0.5, background: 'rgba(20,16,42,0.15)' }} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {['NHS login', 'Apple', 'Google'].map((p) => (
            <div key={p} style={{
              flex: 1, height: 46, borderRadius: 14,
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: '0.5px solid rgba(255,255,255,0.65)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 500, color: '#2a2450',
            }}>{p}</div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'rgba(20,16,42,0.55)' }}>
          New here? <span style={{ color: '#5b4fc7', fontWeight: 600 }}>Create account</span>
        </div>
      </div>

      <style>{`@keyframes caret{to{opacity:0}}`}</style>
    </div>
  );
}

// ── SCREEN 2 · Reason for Visit ───────────────────────────────
function ScreenReason({ level = 'medium' }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', fontFamily: CN_FONT }}>
      <CNBackdrop level={level} variant="b" />
      <div style={{ position: 'relative', padding: '68px 20px 24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>

        {/* top chrome */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '0.5px solid rgba(255,255,255,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="#2a2450" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ width: i === 1 ? 24 : 6, height: 6, borderRadius: 3, background: i === 1 ? '#5b4fc7' : 'rgba(20,16,42,0.18)' }} />
            ))}
          </div>
          <FirstHxBadge compact />
        </div>

        <Eyebrow>Step 2 · Reason for visit</Eyebrow>
        <h1 style={{
          fontFamily: CN_DISPLAY, fontWeight: 400, fontSize: 26, lineHeight: 1.2,
          margin: '10px 0 10px', letterSpacing: -0.4, color: '#14102a',
        }}>
          Hi Esther — what's <span style={{ fontStyle: 'italic', color: '#5b4fc7' }}>going on</span> today?
        </h1>
        <p style={{ color: 'rgba(20,16,42,0.6)', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 18px' }}>
          A few words is plenty. We'll ask follow-ups only if they help.
        </p>

        {/* urgency triage strip */}
        <div style={{
          padding: '12px 14px', borderRadius: 14,
          background: 'rgba(255,255,255,0.45)',
          border: '0.5px solid rgba(255,255,255,0.65)',
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #ff8a65, #ff5c5c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1l6 11H1z" fill="#fff"/><rect x="6.2" y="5" width="1.6" height="4" fill="#ff5c5c"/><rect x="6.2" y="10" width="1.6" height="1.6" fill="#ff5c5c"/></svg>
          </div>
          <div style={{ flex: 1, fontSize: 12.5, color: '#14102a', lineHeight: 1.35 }}>
            <strong>Emergency?</strong> If this is chest pain, stroke signs, or severe bleeding — <span style={{ color: '#d64545', fontWeight: 600 }}>call 999</span>.
          </div>
        </div>

        {/* the big text field */}
        <CNGlass level={level} style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 18, lineHeight: 1.45, color: '#14102a', letterSpacing: -0.2, flex: 1 }}>
            I've had a <span style={{ background: 'rgba(91,108,240,0.12)', padding: '1px 4px', borderRadius: 4 }}>dry cough</span> for about 5 days and mild fever last night. No shortness of breath.
            <span style={{ display: 'inline-block', width: 2, height: 18, background: '#5b4fc7', marginLeft: 2, verticalAlign: -2, animation: 'caret 1s steps(2) infinite' }} />
          </div>

          {/* AI hint */}
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 12,
            background: 'rgba(91,108,240,0.08)',
            border: '0.5px solid rgba(91,108,240,0.18)',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'conic-gradient(from 120deg, #5b6bec, #a685f0, #5b6bec)',
              flexShrink: 0, marginTop: 1,
            }} />
            <div style={{ fontSize: 12, color: '#2a2450', lineHeight: 1.45 }}>
              <span style={{ fontWeight: 600 }}>Navi · </span>
              Got it. This sounds like something a <span style={{ fontWeight: 600, color: '#5b4fc7' }}>pharmacist can handle</span> — I'll ask 3 quick follow-ups to be sure.
            </div>
          </div>
        </CNGlass>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 12 }}>
          {[
            { icon: '📷', label: 'Photo' },
            { icon: '🎙', label: 'Voice' },
            { icon: '🎥', label: 'Video' },
          ].map(m => (
            <div key={m.label} style={{
              flex: 1, height: 42, borderRadius: 14,
              background: 'rgba(255,255,255,0.4)',
              border: '0.5px dashed rgba(20,16,42,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 12, color: 'rgba(20,16,42,0.6)', fontWeight: 500,
            }}>
              <span style={{ fontSize: 13 }}>{m.icon}</span> {m.label}
            </div>
          ))}
        </div>

        <PrimaryButton>Continue</PrimaryButton>
      </div>
      <style>{`@keyframes caret{to{opacity:0}}`}</style>
    </div>
  );
}

// ── SCREEN 3 · Guided Follow-up ───────────────────────────────
function ScreenFollowup({ level = 'medium' }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', fontFamily: CN_FONT }}>
      <CNBackdrop level={level} variant="c" />
      <div style={{ position: 'relative', padding: '68px 20px 24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '0.5px solid rgba(255,255,255,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="#2a2450" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: 'rgba(20,16,42,0.18)' }} />
            <div style={{ width: 24, height: 6, borderRadius: 3, background: '#5b4fc7' }} />
            <div style={{ width: 6, height: 6, borderRadius: 3, background: 'rgba(20,16,42,0.18)' }} />
            <div style={{ width: 6, height: 6, borderRadius: 3, background: 'rgba(20,16,42,0.18)' }} />
          </div>
          <FirstHxBadge compact />
        </div>

        <Eyebrow>Follow-up · 2 of 3</Eyebrow>
        <h1 style={{
          fontFamily: CN_DISPLAY, fontWeight: 400, fontSize: 26, lineHeight: 1.22,
          margin: '10px 0 20px', letterSpacing: -0.4, color: '#14102a',
        }}>
          Is the cough <span style={{ fontStyle: 'italic', color: '#5b4fc7' }}>bringing anything up</span>?
        </h1>

        {/* options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'No, it stays dry', sub: 'Just tickly / scratchy', active: true },
            { label: 'Clear or white mucus', sub: 'Usual colour' },
            { label: 'Yellow / green mucus', sub: 'Thicker, discoloured' },
            { label: 'Blood or pink-tinged', sub: 'Even a small amount', warn: true },
          ].map((o) => (
            <CNGlass key={o.label} level={level} elevated={o.active} style={{
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              border: o.active ? '1px solid rgba(91,108,240,0.6)' : undefined,
              background: o.active ? 'rgba(91,108,240,0.12)' : undefined,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11,
                border: `1.5px solid ${o.active ? '#5b6bec' : 'rgba(20,16,42,0.25)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: o.active ? '#5b6bec' : 'transparent',
              }}>
                {o.active && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 5l3 3 5-6" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#14102a', letterSpacing: -0.2 }}>{o.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(20,16,42,0.55)', marginTop: 2 }}>{o.sub}</div>
              </div>
              {o.warn && (
                <div style={{ width: 6, height: 6, borderRadius: 3, background: '#ff7a3d' }} />
              )}
            </CNGlass>
          ))}
        </div>

        {/* AI context */}
        <div style={{
          marginTop: 18, padding: '12px 14px', borderRadius: 14,
          background: 'rgba(255,255,255,0.35)',
          border: '0.5px solid rgba(255,255,255,0.55)',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            background: 'conic-gradient(from 120deg, #5b6bec, #a685f0, #5b6bec)',
            flexShrink: 0, marginTop: 2,
          }} />
          <div style={{ fontSize: 12, color: '#2a2450', lineHeight: 1.5 }}>
            Adaptive — if you answer "blood", I'll route you to a clinician right away and skip the rest.
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{
            flex: 0.4, height: 54, borderRadius: 18,
            background: 'rgba(255,255,255,0.45)',
            border: '0.5px solid rgba(255,255,255,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 500, color: '#2a2450',
          }}>Back</div>
          <div style={{ flex: 0.6 }}>
            <PrimaryButton>Next question</PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 4 · Diagnosis / Reassurance ────────────────────────
function ScreenDiagnosis({ level = 'medium' }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', fontFamily: CN_FONT }}>
      <CNBackdrop level={level} variant="a" />
      <div style={{ position: 'relative', padding: '68px 20px 24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '0.5px solid rgba(255,255,255,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="#2a2450" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: 'rgba(20,16,42,0.18)' }} />
            <div style={{ width: 6, height: 6, borderRadius: 3, background: 'rgba(20,16,42,0.18)' }} />
            <div style={{ width: 24, height: 6, borderRadius: 3, background: '#5b4fc7' }} />
            <div style={{ width: 6, height: 6, borderRadius: 3, background: 'rgba(20,16,42,0.18)' }} />
          </div>
          <FirstHxBadge compact />
        </div>

        <Eyebrow color="#2a9d6b">Triage complete · 38 seconds</Eyebrow>
        <h1 style={{
          fontFamily: CN_DISPLAY, fontWeight: 400, fontSize: 28, lineHeight: 1.18,
          margin: '10px 0 10px', letterSpacing: -0.5, color: '#14102a',
        }}>
          You're likely <span style={{ fontStyle: 'italic', color: '#5b4fc7' }}>fine</span> —<br/>
          a pharmacist can help today.
        </h1>

        {/* Hero card — diagnosis summary */}
        <CNGlass level={level} style={{ padding: 18, marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(20,16,42,0.5)', letterSpacing: 1.5, fontWeight: 600 }}>MOST LIKELY</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#2a9d6b', fontWeight: 600 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: '#2a9d6b' }} />
              Low urgency
            </div>
          </div>

          <div style={{ fontSize: 22, fontWeight: 600, color: '#14102a', letterSpacing: -0.4, marginBottom: 10 }}>
            Viral upper respiratory infection
          </div>

          {/* confidence bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(20,16,42,0.08)', overflow: 'hidden' }}>
              <div style={{ width: '82%', height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #5b6bec, #a685f0)' }} />
            </div>
            <div style={{ fontSize: 12, color: 'rgba(20,16,42,0.65)', fontVariantNumeric: 'tabular-nums' }}>82% match</div>
          </div>

          <div style={{ fontSize: 13, color: 'rgba(20,16,42,0.7)', lineHeight: 1.55 }}>
            Dry cough + low fever + no breathlessness, 5 days. Fits the viral pattern. Typical recovery 7–10 days.
          </div>

          <div style={{ height: 1, background: 'rgba(20,16,42,0.08)', margin: '14px 0' }} />

          <div style={{ fontSize: 11, color: 'rgba(20,16,42,0.5)', letterSpacing: 1.5, fontWeight: 600, marginBottom: 8 }}>ALSO CONSIDERED</div>
          {[
            { name: 'Post-viral cough', pct: 11 },
            { name: 'Mild bronchitis', pct: 5 },
          ].map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <div style={{ flex: 1, fontSize: 13, color: '#14102a' }}>{c.name}</div>
              <div style={{ width: 60, height: 3, borderRadius: 2, background: 'rgba(20,16,42,0.08)' }}>
                <div style={{ width: `${c.pct}%`, height: '100%', borderRadius: 2, background: 'rgba(91,108,240,0.5)' }} />
              </div>
              <div style={{ width: 28, fontSize: 11, color: 'rgba(20,16,42,0.5)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.pct}%</div>
            </div>
          ))}
        </CNGlass>

        {/* Routing decision */}
        <CNGlass level={level} style={{ padding: 16, marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #7bd3a4, #2a9d6b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 4px 10px rgba(42,157,107,0.3)',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="#fff"><path d="M11 2l2.5 5 5.5.8-4 3.9.9 5.5L11 14.6 6.1 17.2 7 11.7 3 7.8l5.5-.8z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#14102a', letterSpacing: -0.2 }}>Pharmacist · Community Pharmacy Service</div>
            <div style={{ fontSize: 12, color: 'rgba(20,16,42,0.6)', marginTop: 2 }}>No appointment needed · Free on NHS</div>
          </div>
        </CNGlass>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <div style={{
            flex: 0.4, height: 54, borderRadius: 18,
            background: 'rgba(255,255,255,0.45)',
            border: '0.5px solid rgba(255,255,255,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 500, color: '#2a2450',
          }}>Not right?</div>
          <div style={{ flex: 0.6 }}>
            <PrimaryButton>Find a pharmacist</PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 5 · Input Details Required ─────────────────────────
function ScreenInputDetails({ level = 'medium' }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', fontFamily: CN_FONT }}>
      <CNBackdrop level={level} variant="b" />
      <div style={{ position: 'relative', padding: '68px 20px 24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '0.5px solid rgba(255,255,255,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="#2a2450" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[0,0,0,1].map((v,i) => (
              <div key={i} style={{ width: v ? 24 : 6, height: 6, borderRadius: 3, background: v ? '#5b4fc7' : 'rgba(20,16,42,0.18)' }} />
            ))}
          </div>
          <FirstHxBadge compact />
        </div>

        <Eyebrow>Last step · Book visit</Eyebrow>
        <h1 style={{
          fontFamily: CN_DISPLAY, fontWeight: 400, fontSize: 26, lineHeight: 1.22,
          margin: '10px 0 8px', letterSpacing: -0.4, color: '#14102a',
        }}>
          A few <span style={{ fontStyle: 'italic', color: '#5b4fc7' }}>quick details</span>,<br/>
          then you're set.
        </h1>
        <p style={{ color: 'rgba(20,16,42,0.6)', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px' }}>
          We've pre-filled what we can. Tap anything to change it.
        </p>

        <CNGlass level={level} style={{ padding: 4 }}>
          {[
            { label: 'For', value: 'Esther Park · Self', sub: 'Verified via NHS login', verified: true },
            { label: 'Pharmacy', value: 'Boots · Fleet Street, London', sub: '0.4 mi · Open until 8pm', pickable: true },
            { label: 'When', value: 'Today · next available', sub: 'Walk-in slot in ~15 min', pickable: true },
            { label: 'Allergies', value: 'Penicillin', sub: 'From your NHS record', verified: true },
            { label: 'Meds you take', value: 'None listed', sub: 'Add if this changed recently', add: true },
          ].map((r, i, arr) => (
            <div key={r.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 14px',
              borderBottom: i < arr.length - 1 ? '0.5px solid rgba(20,16,42,0.08)' : 'none',
            }}>
              <div style={{ width: 68, flexShrink: 0, fontSize: 11, color: 'rgba(20,16,42,0.5)', letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>{r.label}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, color: '#14102a', fontWeight: 500, letterSpacing: -0.2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {r.value}
                  {r.verified && <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5.5" fill="#2a9d6b"/><path d="M3 6.2l2 2 4-4.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(20,16,42,0.55)', marginTop: 2 }}>{r.sub}</div>
              </div>
              {r.pickable && <svg width="8" height="12" viewBox="0 0 8 12"><path d="M1 1l6 5-6 5" stroke="rgba(20,16,42,0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
              {r.add && <div style={{ fontSize: 12, fontWeight: 600, color: '#5b4fc7' }}>+ Add</div>}
            </div>
          ))}
        </CNGlass>

        {/* scalability note */}
        <div style={{
          marginTop: 14, padding: '10px 12px', borderRadius: 12,
          background: 'rgba(42,157,107,0.08)',
          border: '0.5px solid rgba(42,157,107,0.2)',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginTop: 1, flexShrink: 0 }}><circle cx="8" cy="8" r="7" fill="#2a9d6b"/><path d="M4.5 8l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
          <div style={{ fontSize: 11.5, color: '#1b5f3f', lineHeight: 1.45 }}>
            <strong>Zero humans involved so far</strong> — your first real contact is the pharmacist.
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <PrimaryButton>Confirm &amp; send</PrimaryButton>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11.5, color: 'rgba(20,16,42,0.5)', lineHeight: 1.5 }}>
          You'll get a text when the pharmacist is ready. Avg wait today: 12 min.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenAuth, ScreenReason, ScreenFollowup, ScreenDiagnosis, ScreenInputDetails,
  CNBackdrop, CNGlass, CNLogo, FirstHxBadge,
});
