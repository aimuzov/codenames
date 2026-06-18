// codenames-app.jsx — interactive Codenames prototype (Sunbloom direction)
// Renders into #root. Uses window.IOSDevice + window.useTweaks/TweaksPanel.

const { useState, useEffect, useCallback } = React;

// ── Word pool ──────────────────────────────────────────────
const WORD_POOL = [
  'OCEAN','KNIGHT','MAPLE','ENGINE','COMET','RIVER','SHADOW','COPPER','NEEDLE','ORBIT',
  'FOREST','PIRATE','MARBLE','THUNDER','CACTUS','LANTERN','VIOLIN','GLACIER','ROCKET','MEADOW',
  'COMPASS','HARBOR','FALCON','EMBER','TUNNEL','CANYON','FEATHER','ANCHOR','MAGNET','PEPPER',
  'SADDLE','TEMPLE','WALNUT','BREEZE','CANDLE','DRAGON','BISHOP','GARDEN','PRISM','KETTLE',
  'BEACON','WILLOW','COBRA','PEBBLE','JUNGLE','CASTLE','MERCURY','TIMBER','OTTER','PARLOR',
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// fresh deal: 9 for the starting team, 8 for the other, 7 neutral, 1 assassin
function newGame() {
  const start = Math.random() < 0.5 ? 'a' : 'b';
  const other = start === 'a' ? 'b' : 'a';
  const key = [
    ...Array(9).fill(start), ...Array(8).fill(other),
    ...Array(7).fill('n'), 'x',
  ];
  return {
    words: shuffle(WORD_POOL).slice(0, 25),
    key: shuffle(key),
    revealed: Array(25).fill(false),
    start,
    active: start,
    clue: null,        // { word, num }
    guessesLeft: 0,
    winner: null,      // 'a' | 'b'
    loseReason: null,  // 'assassin' | null
  };
}

const STORE_KEY = 'cn_state_v2';
function loadGame() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const g = JSON.parse(raw);
      if (g && Array.isArray(g.words) && g.words.length === 25) return g;
    }
  } catch (e) {}
  return newGame();
}

function remaining(g, team) {
  let n = 0;
  g.key.forEach((k, i) => { if (k === team && !g.revealed[i]) n++; });
  return n;
}

// ── Tweak defaults ─────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "teamA": "#E8775E",
  "teamB": "#5C7AA6",
  "cardRadius": 16,
  "cardGap": 7,
  "wordFont": "Space Grotesk"
}/*EDITMODE-END*/;

const A_OPTIONS = ['#E8775E', '#C7633C', '#C8843A', '#D98E63'];
const B_OPTIONS = ['#5C7AA6', '#3E8C7B', '#6E9B6A', '#8A6BA6'];

// ── Pieces ─────────────────────────────────────────────────
function AgentDot({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 13 13" style={{ display: 'block' }}>
      <circle cx="6.5" cy="6.5" r="6" fill="none" stroke={color} strokeWidth="1.3" opacity="0.5" />
      <circle cx="6.5" cy="4.6" r="1.9" fill={color} />
      <path d="M2.7 11c.4-2.1 1.9-3.3 3.8-3.3S9.9 8.9 10.3 11" fill={color} />
    </svg>
  );
}

function tintOf(c)  { return `color-mix(in oklab, ${c} 20%, var(--paper))`; }
function inkOf(c)   { return `color-mix(in oklab, ${c} 80%, #1b1410)`; }

function Card({ word, k, revealed, spymaster, onReveal, locked }) {
  const isTeam = k === 'a' || k === 'b';
  const solid = k === 'a' ? 'var(--a)' : k === 'b' ? 'var(--b)' : k === 'x' ? '#34302C' : 'var(--neutral)';
  const tint  = k === 'a' ? 'var(--a-tint)' : k === 'b' ? 'var(--b-tint)' : k === 'x' ? '#dccfc0' : 'var(--n-tint)';
  const ink   = k === 'a' ? 'var(--a-ink)'  : k === 'b' ? 'var(--b-ink)'  : k === 'x' ? '#34302C'  : '#7E7060';
  const solidInk = isTeam ? '#fff' : k === 'x' ? '#FBF4EC' : '#544838';

  if (revealed) {
    return (
      <div style={{
        position: 'relative', borderRadius: 'var(--card-r)', background: solid,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 'var(--card-h)', padding: '6px 3px', boxSizing: 'border-box',
        boxShadow: 'inset 0 2px 7px rgba(0,0,0,.2)',
      }}>
        <span style={{ position: 'absolute', top: 5, right: 5, opacity: 0.92 }}>
          <AgentDot color={solidInk} />
        </span>
        <span style={{
          fontFamily: 'var(--word-font)', fontWeight: 600, fontSize: 11, letterSpacing: 0.3,
          color: solidInk, textAlign: 'center', lineHeight: 1.05, opacity: 0.95,
        }}>{word}</span>
      </div>
    );
  }

  const showKey = spymaster;
  return (
    <button
      onClick={onReveal}
      disabled={locked}
      style={{
        position: 'relative', border: 'none', cursor: locked ? 'default' : 'pointer',
        borderRadius: 'var(--card-r)',
        background: showKey ? tint : 'var(--panel)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 'var(--card-h)', padding: '6px 3px 9px', boxSizing: 'border-box',
        boxShadow: showKey
          ? '0 1px 0 rgba(255,255,255,.7)'
          : '0 2px 5px rgba(74,58,40,.09), inset 0 0 0 1px var(--line)',
        overflow: 'hidden', transition: 'transform .08s ease',
        WebkitTapHighlightColor: 'transparent',
      }}>
      <span style={{
        fontFamily: 'var(--word-font)', fontWeight: 600, fontSize: 11, letterSpacing: 0.3,
        color: showKey ? ink : 'var(--ink)', textAlign: 'center', lineHeight: 1.05,
      }}>{word}</span>
      {showKey && (
        <div style={{
          position: 'absolute', left: 8, right: 8, bottom: 5, height: 3, borderRadius: 3,
          background: k === 'x' ? '#34302C' : solid, opacity: k === 'n' ? 0.4 : 0.85,
        }} />
      )}
    </button>
  );
}

function teamName(team) { return team === 'a' ? 'Coral' : 'Dusk'; }

function ScoreChip({ team, count, active }) {
  const solid = team === 'a' ? 'var(--a)' : 'var(--b)';
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 9,
      background: active ? solid : 'var(--panel)',
      boxShadow: active ? `0 5px 14px color-mix(in oklab, ${solid} 35%, transparent)` : 'inset 0 0 0 1px var(--line)',
      borderRadius: 14, padding: '10px 13px',
    }}>
      <span style={{ width: 11, height: 11, borderRadius: 99, flexShrink: 0,
        background: active ? '#fff' : solid }} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontFamily: 'var(--word-font)', fontWeight: 700, fontSize: 19,
          color: active ? '#fff' : 'var(--ink)' }}>{count}</span>
        <span style={{ fontFamily: 'var(--ui-font)', fontWeight: 600, fontSize: 10.5, marginTop: 3,
          letterSpacing: 0.4, textTransform: 'uppercase',
          color: active ? '#fff' : 'var(--muted)', opacity: active ? 0.9 : 1 }}>{teamName(team)}</span>
      </div>
    </div>
  );
}

function Game({ t, setTweak }) {
  const [g, setG] = useState(loadGame);
  const [spymaster, setSpymaster] = useState(false);
  const [clueWord, setClueWord] = useState('');
  const [clueNum, setClueNum] = useState(2);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(g)); } catch (e) {}
  }, [g]);

  const aLeft = remaining(g, 'a');
  const bLeft = remaining(g, 'b');
  const over = !!g.winner;
  const active = g.active;
  const other = active === 'a' ? 'b' : 'a';

  const reveal = useCallback((i) => {
    setG(prev => {
      if (prev.winner || prev.revealed[i]) return prev;
      const revealed = prev.revealed.slice();
      revealed[i] = true;
      const k = prev.key[i];
      let { active, guessesLeft, winner, loseReason } = prev;
      const next = { ...prev, revealed };

      if (k === 'x') { next.winner = active === 'a' ? 'b' : 'a'; next.loseReason = 'assassin'; return next; }

      const aL = revealed.reduce((n, r, idx) => n + (!r && prev.key[idx] === 'a' ? 1 : 0), 0);
      const bL = revealed.reduce((n, r, idx) => n + (!r && prev.key[idx] === 'b' ? 1 : 0), 0);
      if (aL === 0) { next.winner = 'a'; return next; }
      if (bL === 0) { next.winner = 'b'; return next; }

      if (k === active) {
        next.guessesLeft = guessesLeft - 1;
        if (next.guessesLeft <= 0) { next.active = active === 'a' ? 'b' : 'a'; next.clue = null; next.guessesLeft = 0; }
      } else {
        next.active = active === 'a' ? 'b' : 'a'; next.clue = null; next.guessesLeft = 0;
      }
      return next;
    });
  }, []);

  const endTurn = () => setG(prev => prev.winner ? prev
    : { ...prev, active: prev.active === 'a' ? 'b' : 'a', clue: null, guessesLeft: 0 });

  const giveClue = () => {
    const w = clueWord.trim().toUpperCase();
    if (!w) return;
    setG(prev => ({ ...prev, clue: { word: w, num: clueNum }, guessesLeft: clueNum + 1 }));
    setClueWord('');
    setSpymaster(false);
  };

  const reset = () => { const fresh = newGame(); setG(fresh); setSpymaster(false); setClueWord(''); setClueNum(2); };

  const activeSolid = active === 'a' ? 'var(--a)' : 'var(--b)';

  return (
    <div style={{
      minHeight: '100%', background: 'var(--paper)', color: 'var(--ink)',
      fontFamily: 'var(--ui-font)', padding: '58px 16px 26px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 13, position: 'relative',
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--word-font)', fontWeight: 600, fontSize: 19, letterSpacing: 1.2,
            color: 'var(--ink)' }}>CODENAMES</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, color: 'var(--muted)' }}>
            {over ? 'Game over' : spymaster ? 'Spymaster — pick a clue' : `${teamName(active)} operatives`}
          </span>
        </div>
        {/* role toggle */}
        <div style={{ display: 'flex', background: 'var(--panel)', borderRadius: 11, padding: 3,
          boxShadow: 'inset 0 0 0 1px var(--line)', gap: 2 }}>
          {[['Play', false], ['Key', true]].map(([lbl, val]) => (
            <button key={lbl} onClick={() => setSpymaster(val)} style={{
              border: 'none', cursor: 'pointer', borderRadius: 8, padding: '7px 12px',
              fontFamily: 'var(--ui-font)', fontWeight: 700, fontSize: 12,
              background: spymaster === val ? activeSolid : 'transparent',
              color: spymaster === val ? '#fff' : 'var(--muted)', transition: 'all .12s',
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* score */}
      <div style={{ display: 'flex', gap: 9 }}>
        <ScoreChip team="a" count={aLeft} active={active === 'a'} />
        <ScoreChip team="b" count={bLeft} active={active === 'b'} />
      </div>

      {/* clue zone */}
      {spymaster && !over ? (
        <div style={{ background: 'var(--panel)', borderRadius: 16, padding: '12px 13px',
          boxShadow: 'inset 0 0 0 1px var(--line)', borderLeft: `4px solid ${activeSolid}`,
          display: 'flex', alignItems: 'center', gap: 9 }}>
          <input value={clueWord} onChange={e => setClueWord(e.target.value)}
            placeholder="One-word clue"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'var(--word-font)', fontWeight: 600, fontSize: 17, color: 'var(--ink)',
              textTransform: 'uppercase', letterSpacing: 0.4 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper)',
            borderRadius: 10, padding: '4px 6px' }}>
            <button onClick={() => setClueNum(n => Math.max(1, n - 1))} style={stepBtn}>–</button>
            <span style={{ fontFamily: 'var(--word-font)', fontWeight: 700, fontSize: 16, minWidth: 14,
              textAlign: 'center' }}>{clueNum}</span>
            <button onClick={() => setClueNum(n => Math.min(9, n + 1))} style={stepBtn}>+</button>
          </div>
          <button onClick={giveClue} style={{ border: 'none', cursor: 'pointer', borderRadius: 10,
            padding: '0 14px', height: 38, background: activeSolid, color: '#fff',
            fontFamily: 'var(--ui-font)', fontWeight: 700, fontSize: 13 }}>Give</button>
        </div>
      ) : (
        <div style={{ background: 'var(--panel)', borderRadius: 16, padding: '13px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: 'inset 0 0 0 1px var(--line)', borderLeft: `4px solid ${activeSolid}`,
          minHeight: 52, opacity: over ? 0.5 : 1 }}>
          {g.clue ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
                  color: 'var(--muted)' }}>{teamName(active)}’s clue</span>
                <span style={{ fontFamily: 'var(--word-font)', fontWeight: 600, fontSize: 23,
                  color: 'var(--ink)', letterSpacing: 0.4 }}>{g.clue.word}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ fontFamily: 'var(--ui-font)', fontWeight: 600, fontSize: 11.5,
                  color: 'var(--muted)' }}>{g.guessesLeft} left</span>
                <span style={{ minWidth: 42, height: 42, borderRadius: 12, background: activeSolid,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--word-font)', fontWeight: 700, fontSize: 22 }}>{g.clue.num}</span>
              </div>
            </>
          ) : (
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--muted)' }}>
              Waiting for {teamName(active)} spymaster — tap <b style={{ color: 'var(--ink)' }}>Key</b> to give a clue.
            </span>
          )}
        </div>
      )}

      {/* grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--gap)' }}>
        {g.words.map((w, i) => (
          <Card key={i} word={w} k={g.key[i]} revealed={g.revealed[i]} spymaster={spymaster}
            locked={spymaster || over || !g.clue}
            onReveal={() => reveal(i)} />
        ))}
      </div>

      {/* footer */}
      <div style={{ display: 'flex', gap: 9, marginTop: 1 }}>
        <button onClick={endTurn} disabled={over || !g.clue} style={{
          flex: 1, height: 50, borderRadius: 14, border: 'none',
          cursor: over || !g.clue ? 'default' : 'pointer',
          background: over || !g.clue ? 'var(--panel)' : activeSolid,
          color: over || !g.clue ? 'var(--muted)' : '#fff',
          boxShadow: over || !g.clue ? 'inset 0 0 0 1px var(--line)' : 'none',
          fontFamily: 'var(--ui-font)', fontWeight: 700, fontSize: 15 }}>End turn</button>
        <button onClick={reset} style={{ width: 50, height: 50, borderRadius: 14, cursor: 'pointer',
          background: 'var(--panel)', boxShadow: 'inset 0 0 0 1px var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M20 11a8 8 0 10-1.6 5.5M20 5v5h-5" stroke="var(--ink)" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* winner overlay */}
      {over && (
        <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in oklab, var(--paper) 78%, transparent)',
          backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 18, padding: 30, textAlign: 'center', zIndex: 5 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20,
            background: g.winner === 'a' ? 'var(--a)' : 'var(--b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 12px 30px color-mix(in oklab, ${g.winner === 'a' ? 'var(--a)' : 'var(--b)'} 40%, transparent)` }}>
            <AgentDot color="#fff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: 'var(--word-font)', fontWeight: 600, fontSize: 28, color: 'var(--ink)' }}>
              {teamName(g.winner)} wins
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--muted)' }}>
              {g.loseReason === 'assassin'
                ? `${teamName(g.winner === 'a' ? 'b' : 'a')} hit the assassin`
                : 'All agents contacted'}
            </span>
          </div>
          <button onClick={reset} style={{ border: 'none', cursor: 'pointer', borderRadius: 13,
            padding: '13px 26px', background: 'var(--ink)', color: 'var(--paper)',
            fontFamily: 'var(--ui-font)', fontWeight: 700, fontSize: 15 }}>New game</button>
        </div>
      )}
    </div>
  );
}

const stepBtn = {
  border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--ink)',
  fontFamily: 'var(--ui-font)', fontWeight: 700, fontSize: 18, width: 22, height: 28, lineHeight: 1,
};

// ── Root: theme vars + tweaks ──────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const vars = {
    '--paper': '#FBF4EC', '--panel': '#FFFFFF', '--ink': '#2C2622',
    '--muted': '#9A8E81', '--line': '#F0E7DB', '--neutral': '#D8C9B4',
    '--a': t.teamA, '--b': t.teamB,
    '--a-tint': tintOf(t.teamA), '--b-tint': tintOf(t.teamB),
    '--n-tint': '#F1E8DB', '--a-ink': inkOf(t.teamA), '--b-ink': inkOf(t.teamB),
    '--card-r': t.cardRadius + 'px', '--gap': t.cardGap + 'px', '--card-h': '58px',
    '--word-font': `"${t.wordFont}", system-ui, sans-serif`,
    '--ui-font': '"Space Grotesk", system-ui, sans-serif',
  };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, boxSizing: 'border-box', ...vars }}>
      <IOSDevice>
        <Game t={t} setTweak={setTweak} />
      </IOSDevice>

      <TweaksPanel>
        <TweakSection label="Team colors" />
        <TweakColor label="Coral team" value={t.teamA} options={A_OPTIONS} onChange={v => setTweak('teamA', v)} />
        <TweakColor label="Dusk team" value={t.teamB} options={B_OPTIONS} onChange={v => setTweak('teamB', v)} />
        <TweakSection label="Cards" />
        <TweakSlider label="Corner radius" value={t.cardRadius} min={6} max={22} unit="px" onChange={v => setTweak('cardRadius', v)} />
        <TweakSlider label="Grid gap" value={t.cardGap} min={3} max={12} unit="px" onChange={v => setTweak('cardGap', v)} />
        <TweakSection label="Type" />
        <TweakRadio label="Word font" value={t.wordFont} options={['Space Grotesk', 'Bitter', 'Nunito']} onChange={v => setTweak('wordFont', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
