// codenames-board.jsx — reusable Codenames game screen (mobile / spymaster view)
// Exports to window: CodenamesBoard, CN_THEMES
// One board state, themeable, so 3 visual directions stay directly comparable.

// ── Board data ─────────────────────────────────────────────
// 5×5 words + identity key: 'a' team A · 'b' team B · 'n' neutral · 'x' assassin
const CN_WORDS = [
  'OCEAN','KNIGHT','MAPLE','ENGINE','COMET',
  'RIVER','SHADOW','COPPER','NEEDLE','ORBIT',
  'FOREST','PIRATE','MARBLE','THUNDER','CACTUS',
  'LANTERN','VIOLIN','GLACIER','ROCKET','MEADOW',
  'COMPASS','HARBOR','FALCON','EMBER','TUNNEL',
];
const CN_KEY = [
  'a','b','a','n','n',
  'b','n','a','b','n',
  'a','b','a','b','n',
  'n','b','x','a','n',
  'a','b','a','a','b',
];
// cards already guessed (covered with an agent token)
const CN_REVEALED = new Set([0, 1, 3]);

// ── Themes ─────────────────────────────────────────────────
const CN_THEMES = {
  hearth: {
    label: 'A · Hearth',
    sub: 'Warm paper · daytime cozy',
    fontUI: '"Hanken Grotesk", system-ui, sans-serif',
    fontWord: '"Bitter", Georgia, serif',
    wordWeight: 700,
    bg: '#F3EAD9',
    bgTexture: 'radial-gradient(circle at 20% 0%, rgba(255,255,255,.5), transparent 55%)',
    panel: '#FBF4E7',
    panelBorder: '#E7D9BE',
    text: '#3A2E24',
    textMuted: '#8C7B64',
    cardR: 12,
    cardShadow: '0 1px 0 rgba(255,255,255,.7), 0 2px 5px rgba(110,84,52,.13)',
    chrome: '#3A2E24',
    teamA: { name: 'Clay',      tint: '#F4D2BF', ink: '#7A3318', solid: '#C7633C', solidInk: '#FCEFE6', bar: '#C7633C' },
    teamB: { name: 'Sea',       tint: '#C2DAD1', ink: '#1F5246', solid: '#3E8C7B', solidInk: '#ECF6F2', bar: '#3E8C7B' },
    neutral:{ name: 'Bystander', tint: '#EBDCC0', ink: '#7C6A4D', solid: '#C9B187', solidInk: '#473921', bar: '#C9B187' },
    assassin:{ name: 'Assassin', tint: '#3A322A', ink: '#E9D7B6', solid: '#2A241E', solidInk: '#E9D7B6', bar: '#5C5044' },
  },
  lantern: {
    label: 'B · Lantern',
    sub: 'Warm charcoal · game night',
    fontUI: '"Nunito", system-ui, sans-serif',
    fontWord: '"Nunito", system-ui, sans-serif',
    wordWeight: 800,
    bg: '#221E1A',
    bgTexture: 'radial-gradient(circle at 50% -10%, rgba(214,158,90,.16), transparent 60%)',
    panel: '#2C2722',
    panelBorder: '#403831',
    text: '#F1E7D6',
    textMuted: '#A4937B',
    cardR: 14,
    cardShadow: '0 1px 0 rgba(255,255,255,.05), 0 3px 8px rgba(0,0,0,.35)',
    chrome: '#F1E7D6',
    teamA: { name: 'Ember', tint: '#4A3825', ink: '#F0C58A', solid: '#C8843A', solidInk: '#241608', bar: '#E0A35A' },
    teamB: { name: 'Pine',  tint: '#2F3D2C', ink: '#A9CDA0', solid: '#6E9B6A', solidInk: '#15210F', bar: '#84B17C' },
    neutral:{ name: 'Bystander', tint: '#3A332B', ink: '#C6B393', solid: '#8A7A62', solidInk: '#1C160F', bar: '#A08D70' },
    assassin:{ name: 'Assassin', tint: '#15120F', ink: '#C8843A', solid: '#0E0C0A', solidInk: '#C8843A', bar: '#C8843A' },
  },
  sunbloom: {
    label: 'C · Sunbloom',
    sub: 'Bright warm · soft modern',
    fontUI: '"Space Grotesk", system-ui, sans-serif',
    fontWord: '"Space Grotesk", system-ui, sans-serif',
    wordWeight: 600,
    bg: '#FBF4EC',
    bgTexture: 'none',
    panel: '#FFFFFF',
    panelBorder: '#F0E7DB',
    text: '#2C2622',
    textMuted: '#9A8E81',
    cardR: 16,
    cardShadow: '0 2px 6px rgba(74,58,40,.08), 0 1px 0 rgba(255,255,255,.9)',
    chrome: '#2C2622',
    teamA: { name: 'Coral', tint: '#FBDDD2', ink: '#B4452C', solid: '#E8775E', solidInk: '#FFFFFF', bar: '#E8775E' },
    teamB: { name: 'Dusk',  tint: '#DBE5F1', ink: '#3B557E', solid: '#5C7AA6', solidInk: '#FFFFFF', bar: '#5C7AA6' },
    neutral:{ name: 'Bystander', tint: '#F1E8DB', ink: '#8C7E6C', solid: '#D8C9B4', solidInk: '#544838', bar: '#D8C9B4' },
    assassin:{ name: 'Assassin', tint: '#3A352F', ink: '#FBF4EC', solid: '#34302C', solidInk: '#FBF4EC', bar: '#6B6258' },
  },
};

const CN_GAME = {
  active: 'a',            // whose turn (team A)
  clue: 'VOYAGE',
  clueNum: 3,
  guessesLeft: 2,
};

function cnIdentity(theme, k) {
  return k === 'a' ? theme.teamA : k === 'b' ? theme.teamB : k === 'x' ? theme.assassin : theme.neutral;
}

// agent token placed on a guessed card
function AgentDot({ color }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" style={{ display: 'block' }}>
      <circle cx="6.5" cy="6.5" r="6" fill="none" stroke={color} strokeWidth="1.4" opacity="0.55" />
      <circle cx="6.5" cy="4.6" r="1.9" fill={color} />
      <path d="M2.7 11c.4-2.1 1.9-3.3 3.8-3.3S9.9 8.9 10.3 11" fill={color} />
    </svg>
  );
}

function CnCard({ theme, word, k, revealed }) {
  const id = cnIdentity(theme, k);
  if (revealed) {
    return (
      <div style={{
        position: 'relative', borderRadius: theme.cardR,
        background: id.solid, display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 58, padding: '6px 4px', boxSizing: 'border-box',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,.18)',
      }}>
        <span style={{
          position: 'absolute', top: 6, right: 6, opacity: 0.9,
        }}><AgentDot color={id.solidInk} /></span>
        <span style={{
          fontFamily: theme.fontWord, fontWeight: theme.wordWeight, fontSize: 11,
          letterSpacing: 0.3, color: id.solidInk, textAlign: 'center', lineHeight: 1.05,
          opacity: 0.92,
        }}>{word}</span>
      </div>
    );
  }
  return (
    <div style={{
      position: 'relative', borderRadius: theme.cardR,
      background: id.tint, display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 58, padding: '6px 4px 9px', boxSizing: 'border-box',
      boxShadow: theme.cardShadow, overflow: 'hidden',
    }}>
      <span style={{
        fontFamily: theme.fontWord, fontWeight: theme.wordWeight, fontSize: 11,
        letterSpacing: 0.3, color: id.ink, textAlign: 'center', lineHeight: 1.05,
      }}>{word}</span>
      <div style={{
        position: 'absolute', left: 8, right: 8, bottom: 5, height: 3,
        borderRadius: 3, background: id.bar, opacity: k === 'n' ? 0.45 : 0.85,
      }} />
    </div>
  );
}

function ScoreChip({ theme, team, count, active }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 9,
      background: active ? team.solid : theme.panel,
      border: `1px solid ${active ? team.solid : theme.panelBorder}`,
      borderRadius: 14, padding: '10px 13px',
      boxShadow: active ? `0 4px 12px ${team.solid}44` : 'none',
    }}>
      <span style={{
        width: 11, height: 11, borderRadius: 99, flexShrink: 0,
        background: active ? team.solidInk : team.solid,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: theme.fontUI, fontWeight: 700, fontSize: 19,
          color: active ? team.solidInk : theme.text,
        }}>{count}</span>
        <span style={{
          fontFamily: theme.fontUI, fontWeight: 600, fontSize: 10.5, marginTop: 3,
          letterSpacing: 0.3, textTransform: 'uppercase',
          color: active ? team.solidInk : theme.textMuted, opacity: active ? 0.85 : 1,
        }}>{team.name}</span>
      </div>
    </div>
  );
}

function CodenamesBoard({ themeKey = 'hearth' }) {
  const t = CN_THEMES[themeKey];
  const active = cnIdentity(t, CN_GAME.active);
  // remaining counts
  let aLeft = 0, bLeft = 0;
  CN_KEY.forEach((k, i) => {
    if (CN_REVEALED.has(i)) return;
    if (k === 'a') aLeft++; if (k === 'b') bLeft++;
  });

  return (
    <div style={{
      minHeight: '100%', background: t.bg, backgroundImage: t.bgTexture,
      fontFamily: t.fontUI, color: t.text,
      padding: '60px 18px 30px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            fontFamily: t.fontWord, fontWeight: t.wordWeight, fontSize: 19,
            letterSpacing: themeKey === 'hearth' ? 0.5 : 1.5, color: t.chrome,
          }}>CODENAMES</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4, color: t.textMuted }}>
            {t.sub}
          </span>
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          background: t.panel, border: `1px solid ${t.panelBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2.5,
        }}>
          <span style={{ width: 4, height: 4, borderRadius: 9, background: t.textMuted }} />
          <span style={{ width: 4, height: 4, borderRadius: 9, background: t.textMuted }} />
          <span style={{ width: 4, height: 4, borderRadius: 9, background: t.textMuted }} />
        </div>
      </div>

      {/* score */}
      <div style={{ display: 'flex', gap: 10 }}>
        <ScoreChip theme={t} team={t.teamA} count={aLeft} active={CN_GAME.active === 'a'} />
        <ScoreChip theme={t} team={t.teamB} count={bLeft} active={CN_GAME.active === 'b'} />
      </div>

      {/* clue bar */}
      <div style={{
        background: t.panel, border: `1px solid ${t.panelBorder}`, borderRadius: 16,
        padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderLeft: `4px solid ${active.solid}`,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: t.textMuted }}>
            {active.name}’s clue
          </span>
          <span style={{ fontFamily: t.fontWord, fontWeight: t.wordWeight, fontSize: 23, color: t.text, letterSpacing: 0.4 }}>
            {CN_GAME.clue}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* guesses left dots */}
          <div style={{ display: 'flex', gap: 5 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: 8, height: 8, borderRadius: 99,
                background: i < CN_GAME.guessesLeft ? active.solid : 'transparent',
                border: `1.5px solid ${active.solid}`, opacity: i < CN_GAME.guessesLeft ? 1 : 0.4,
              }} />
            ))}
          </div>
          <span style={{
            minWidth: 42, height: 42, borderRadius: 12, background: active.solid, color: active.solidInk,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: t.fontWord, fontWeight: 800, fontSize: 22,
          }}>{CN_GAME.clueNum}</span>
        </div>
      </div>

      {/* grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7 }}>
        {CN_WORDS.map((w, i) => (
          <CnCard key={i} theme={t} word={w} k={CN_KEY[i]} revealed={CN_REVEALED.has(i)} />
        ))}
      </div>

      {/* footer */}
      <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
        <button style={{
          flex: 1, height: 50, borderRadius: 14, border: 'none', cursor: 'pointer',
          background: active.solid, color: active.solidInk,
          fontFamily: t.fontUI, fontWeight: 700, fontSize: 15, letterSpacing: 0.2,
        }}>End turn</button>
        <button style={{
          width: 50, height: 50, borderRadius: 14, cursor: 'pointer',
          background: t.panel, border: `1px solid ${t.panelBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M1 11s3.6-6.5 10-6.5S21 11 21 11s-3.6 6.5-10 6.5S1 11 1 11Z" stroke={t.chrome} strokeWidth="1.6"/>
            <circle cx="11" cy="11" r="3" fill={t.chrome}/>
          </svg>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { CodenamesBoard, CN_THEMES });
