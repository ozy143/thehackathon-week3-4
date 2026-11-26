// ─────────────────────────────────────────────
// 음악: 곡 데이터 + Web Audio 칩튠 연주기
//  음원 파일 없이 브라우저에서 직접 연주합니다. 모든 곡은 이 사이트를 위해 만든 오리지널 멜로디예요.
//
//  곡 악보 표기
//   prog: 마디마다 화음의 근음(음계 몇 번째 음인지, 1~7)
//   mel : 8분음표 하나 = 토큰 하나, 한 마디 = 8토큰, 마디는 '|'로 구분
//         1~7 = 음계 음, ' = 한 옥타브 위, , = 한 옥타브 아래, - = 앞 음 늘이기, . = 쉼표
//   style: 반주(베이스·드럼) 스타일 — pop / lofi / ballad / dance
// ─────────────────────────────────────────────

const SONGS = [
  {
    id: 'song_theme', type: 'song', tier: 'base',
    name: '나만의 덕질방 테마', desc: '처음부터 CD 플레이어에 들어 있는 방 테마곡',
    colors: ['#f6c2d6', '#fbe7a1'],
    bpm: 100, root: 60, mode: 'major', style: 'lofi', lead: 'triangle',
    prog: [1, 6, 4, 5, 1, 6, 4, 5],
    mel: '1 - 3 - 5 - 3 - | 1\' - 7 - 6 - 3 - | 4 - 6 - 1\' - 6 - | 5 - - - . . . . | 3 - 5 - 1\' - 2\' - | 3\' - 2\' - 1\' - 6 - | 4 - 5 - 6 - 7 - | 1\' - - - . . . .',
  },
  // ══ 기본 뽑기 ══════════════════════════
  {
    id: 'song_morning', type: 'song', tier: 'basic', rarity: 'common',
    name: '아침 햇살 로그인', desc: '알람 대신 듣고 싶은 상쾌한 아침 노래',
    colors: ['#fde68a', '#fca5a5'],
    bpm: 112, root: 62, mode: 'major', style: 'pop', lead: 'square',
    prog: [1, 5, 6, 4, 1, 5, 4, 5],
    mel: '5 - 3 5 1\' - 7 6 | 5 - 2 - 7, - . . | 6 - 1\' 6 5 - 3 - | 4 5 6 - 5 - . . | 5 - 3 5 1\' - 2\' 1\' | 7 - 5 - 2\' - 1\' 7 | 6 - 4 6 1\' - 6 - | 5 - - - 2 3 4 -',
  },
  {
    id: 'song_cozy', type: 'song', tier: 'basic', rarity: 'common',
    name: '포근한 방구석', desc: '이불 속에서 듣는 느긋한 로파이',
    colors: ['#c4b5fd', '#fbcfe8'],
    bpm: 80, root: 65, mode: 'major', style: 'lofi', lead: 'triangle', sevenths: true,
    prog: [2, 5, 1, 6, 2, 5, 1, 1],
    mel: '6 - 5 4 - - 2 - | 4 - 3 2 - - . . | 3 - - - 5 - 3 2 | 1 - - - . . . . | 6 - 1\' - 6 5 4 - | 5 - 4 - 2 - . . | 3 - 5 - 7 - 1\' - | 5 - - - . . . .',
  },
  {
    id: 'song_store', type: 'song', tier: 'basic', rarity: 'common',
    name: '편의점 가는 길', desc: '통통 튀는 발걸음 같은 산책 노래',
    colors: ['#a7f3d0', '#93c5fd'],
    bpm: 124, root: 60, mode: 'major', style: 'pop', lead: 'square',
    prog: [1, 6, 4, 5, 1, 6, 4, 5],
    mel: '1 . 1 3 5 . 3 . | 6 . 6 1\' 3\' - 1\' . | 4 . 4 6 1\' - 6 . | 5 . 7 . 2\' - . . | 1\' . 7 6 5 . 3 . | 1 . 3 5 6 - 5 . | 4 . 6 . 1\' . 2\' . | 7 - 5 - 2 - . .',
  },
  {
    id: 'song_lightstick', type: 'song', tier: 'basic', rarity: 'rare',
    name: '응원봉 흔들기', desc: '떼창 파트가 절로 나오는 신나는 응원가',
    colors: ['#f9a8d4', '#fde047'],
    bpm: 132, root: 60, mode: 'major', style: 'pop', lead: 'sawtooth',
    prog: [4, 5, 3, 6, 4, 5, 1, 1],
    mel: '1\' - 1\' - 6 - 1\' - | 2\' - 2\' - 7 - 5 - | 3\' - 2\' 1\' 7 - 5 - | 6 - - - . . 6 7 | 1\' - 1\' 2\' 3\' - 1\' - | 2\' - 1\' 7 5 - 2\' - | 1\' - - - 3\' - 5\' - | 3\' - - - . . . .',
  },
  {
    id: 'song_rain', type: 'song', tier: 'basic', rarity: 'rare',
    name: '비 오는 날 플레이리스트', desc: '창밖 빗소리와 어울리는 잔잔한 단조',
    colors: ['#94a3b8', '#a5b4fc'],
    bpm: 90, root: 57, mode: 'minor', style: 'ballad', lead: 'triangle',
    prog: [1, 6, 3, 7, 1, 6, 4, 5],
    mel: '5 - - 3 4 - 3 - | 1 - - - 3 - 1 - | 5 - 7 - 5 - 3 - | 2 - - - 7, - . . | 5 - 1\' - 7 - 5 - | 6 - 5 - 3 - 1 - | 4 - 6 - 1\' - 6 - | 5 - - - 2 - 7, -',
  },
  // ══ 스페셜 뽑기 ═════════════════════════
  {
    id: 'song_starlight', type: 'song', tier: 'special', rarity: 'rare',
    name: '별빛 팬레터', desc: '밤하늘에 띄우는 반짝이는 편지 같은 노래',
    colors: ['#818cf8', '#f0abfc'],
    bpm: 100, root: 64, mode: 'major', style: 'ballad', lead: 'triangle', arp: true,
    prog: [1, 4, 1, 5, 6, 4, 2, 5],
    mel: '3 - - 5 1\' - - 7 | 6 - - 4 1\' - 6 - | 5 - - 3 5 - 1\' - | 2\' - - - 7 - . . | 1\' - - 3\' 1\' - 6 - | 4 - 6 1\' 6 - 4 - | 2 - 4 6 1\' - 6 - | 7 - 5 - 2\' - - -',
  },
  {
    id: 'song_concert', type: 'song', tier: 'special', rarity: 'epic',
    name: '첫 콘서트의 밤', desc: '조명이 켜지는 순간의 두근거림을 담은 댄스곡',
    colors: ['#f43f5e', '#a855f7'],
    bpm: 128, root: 57, mode: 'minor', style: 'dance', lead: 'sawtooth', arp: true,
    prog: [1, 1, 6, 7, 1, 1, 4, 5],
    mel: '1\' . 1\' . 7 . 1\' 3\' | 5\' . 3\' . 1\' . 7 . | 1\' . 1\' 3\' 6\' - 5\' . | 4\' - 2\' - 7 . 5 . | 1\' . 1\' . 7 . 1\' 3\' | 5\' . 4\' 3\' 1\' - . . | 6 . 1\' . 4\' - 3\' . | 2\' - 7 - 5 . 7 .',
  },
  {
    id: 'song_encore', type: 'song', tier: 'special', rarity: 'legend',
    name: '우리만의 앙코르', desc: '공연이 끝나도 멈추지 않는 팬과 최애의 노래',
    colors: ['#fbbf24', '#f472b6'],
    bpm: 140, root: 62, mode: 'major', style: 'dance', lead: 'square', arp: true,
    prog: [6, 4, 1, 5, 6, 4, 1, 5],
    mel: '1\' - 1\' - 1\' - 3\' - | 2\' - 1\' - 6 - 1\' - | 1\' - 7 - 5 - 3 - | 5 - - - . . 5 6 | 1\' - 3\' - 5\' - 3\' - | 4\' - 3\' - 2\' - 1\' - | 1\' - 2\' - 3\' - 5\' - | 5\' - - - 2\' - - -',
  },
];
const SONG_BY_ID = Object.fromEntries(SONGS.map((s) => [s.id, s]));
const DEFAULT_SONG = SONGS[0].id;

// ── 연주기 ──────────────────────────────────────
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };

// 악보 → 8분음표 단위 이벤트 [{ step, deg, oct, len }]
function parseMelody(mel) {
  const toks = mel.replace(/\|/g, ' ').trim().split(/\s+/);
  const notes = [];
  toks.forEach((t, i) => {
    const m = /^([1-7])('*)(,*)$/.exec(t);
    if (m) notes.push({ step: i, deg: +m[1], oct: m[2].length - m[3].length, len: 1 });
    else if (t === '-' && notes.length && notes[notes.length - 1].step + notes[notes.length - 1].len === i) notes[notes.length - 1].len++;
  });
  return { notes, steps: toks.length };
}

const MusicPlayer = (() => {
  let ac = null, master = null, noise = null;
  let bus = null, timer = null, song = null, score = null, step = 0, nextTime = 0;
  const listeners = [];

  function ensure() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0.45;
    const comp = ac.createDynamicsCompressor();
    master.connect(comp).connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // 음계 몇 번째 음(1부터) → MIDI 번호
  function degMidi(s, deg, oct = 0) {
    const sc = SCALES[s.mode], i = deg - 1;
    return s.root + sc[((i % 7) + 7) % 7] + 12 * (Math.floor(i / 7) + oct);
  }

  function tone(t, midi, dur, type, vol, attack = 0.01) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.value = midiHz(midi);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setTargetAtTime(vol * 0.6, t + attack, dur * 0.3);
    g.gain.setTargetAtTime(0, t + dur * 0.9, 0.04);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.3);
  }
  function kick(t, vol = 0.9) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.2);
  }
  function hiss(t, dur, vol, hp) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noise;
    f.type = 'highpass';
    f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  const DRUMS = {
    pop:    { kick: [0, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7] },
    dance:  { kick: [0, 2, 4, 6], snare: [2, 6], hat: [1, 3, 5, 7] },
    lofi:   { kick: [0, 5], snare: [4], hat: [0, 2, 4, 6] },
    ballad: { kick: [0], snare: [4], hat: [] },
  };
  const BASS = { pop: [0, 3, 4, 6], dance: [0, 1, 2, 3, 4, 5, 6, 7], lofi: [0, 5], ballad: [0, 4] };

  function scheduleStep(t, i) {
    const s = song, e = 60 / s.bpm / 2; // 8분음표 길이(초)
    const bar = Math.floor(i / 8) % s.prog.length, pos = i % 8;
    const chord = s.prog[bar];
    const soft = s.style === 'lofi' || s.style === 'ballad';

    for (const n of score.notes) {
      if (n.step === i) tone(t, degMidi(s, n.deg, n.oct), n.len * e, s.lead, soft ? 0.16 : 0.12);
    }
    // 화음 패드 (마디 첫 박)
    if (pos === 0) {
      const tones = [0, 2, 4].concat(s.sevenths ? [6] : []);
      for (const k of tones) tone(t, degMidi(s, chord + k, -1), 8 * e, 'triangle', 0.05, 0.08);
    }
    // 아르페지오
    if (s.arp) tone(t, degMidi(s, chord + [0, 2, 4, 7][pos % 4], 0), e * 0.9, 'square', 0.03);
    // 베이스
    if (BASS[s.style].includes(pos)) {
      const up = s.style === 'dance' && pos % 2 === 1 ? 1 : 0;
      tone(t, degMidi(s, chord, -2 + up), (s.style === 'dance' ? 1 : 2) * e * 0.9, 'triangle', 0.32);
    }
    // 드럼
    const d = DRUMS[s.style];
    if (d.kick.includes(pos)) kick(t, soft ? 0.55 : 0.9);
    if (d.snare.includes(pos)) hiss(t, soft ? 0.12 : 0.16, soft ? 0.12 : 0.22, 1200);
    if (d.hat.includes(pos)) hiss(t, 0.04, soft ? 0.04 : 0.07, 7000);
  }

  function tick() {
    const e = 60 / song.bpm / 2;
    while (nextTime < ac.currentTime + 0.15) {
      scheduleStep(nextTime, step);
      step = (step + 1) % score.steps;
      nextTime += e;
    }
  }

  function emit() { listeners.forEach((fn) => fn()); }

  function stopNow() {
    if (timer) { clearInterval(timer); timer = null; }
    if (bus) {
      const b = bus;
      b.gain.setTargetAtTime(0, ac.currentTime, 0.05);
      setTimeout(() => b.disconnect(), 600);
      bus = null;
    }
  }

  return {
    get song() { return song; },
    get playing() { return !!timer; },
    onChange(fn) { listeners.push(fn); },
    play(s) {
      ensure();
      if (ac.state === 'suspended') ac.resume();
      stopNow();
      song = s;
      score = parseMelody(s.mel);
      bus = ac.createGain();
      bus.connect(master);
      step = 0;
      nextTime = ac.currentTime + 0.06;
      tick();
      timer = setInterval(tick, 25);
      emit();
    },
    stop() { stopNow(); emit(); },
  };
})();
