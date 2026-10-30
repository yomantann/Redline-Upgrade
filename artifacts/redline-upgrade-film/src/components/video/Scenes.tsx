import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useSceneTimer } from '@/lib/video';

const EASE = [0.22, 1, 0.36, 1] as const;
const base = import.meta.env.BASE_URL;
const image = (name: string) => `${base}images/${name}`;

export function Scene01() {
  const [word, setWord] = useState('MAKE');
  useSceneTimer([
    { time: 1060, callback: () => setWord('YOUR') },
    { time: 1640, callback: () => setWord('MOVE.') },
  ]);
  return (
    <motion.section
      className="film"
      initial={{ opacity: 1, clipPath: 'inset(0 0 0 0)' }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 78% 48%,#27332d 0%,#121a17 35%,#0b1010 76%)' }} />
      <motion.div
        style={{ position: 'absolute', left: 0, right: 0, top: '49.5%', height: '24%', background: '#f96346', transformOrigin: 'center', zIndex: 2 }}
        initial={{ scaleY: 0.04 }}
        animate={{ scaleY: [0.04, 1, 1, 0.06], y: ['0%', '0%', '0%', '-240%'] }}
        transition={{ duration: 4.48, times: [0, 0.08, 0.82, 1], ease: [0.25, 0.95, 0.45, 1] }}
      />
      <motion.div className="signal-line" style={{ left: '5%', top: '50%', height: '2px', width: '90%', zIndex: 6 }}
        initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: [0, 1, 1, 0.2], opacity: [0, 1, 1, 1] }}
        transition={{ duration: 4.45, times: [0, .12, .83, 1], ease: EASE }} />
      <motion.div style={{ position: 'absolute', left: '5.7%', top: '23%', width: '38%', zIndex: 5 }}
        initial={{ x: '-8%', opacity: 0 }} animate={{ x: ['-8%', '0%', '0%', '-3%'], opacity: [0, 1, 1, 1] }}
        transition={{ duration: 4.5, times: [0, .12, .75, 1], ease: EASE }}>
        <div className="micro" style={{ color: '#d4e981', marginBottom: '2.2vmin' }}>REDLINE UPGRADE / 001</div>
        <div style={{ height: '28vmin', position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="sync">
            <motion.h1 key={word} className="display" style={{ position: 'absolute', margin: 0, fontSize: '25vmin', color: '#eeeade', whiteSpace: 'nowrap' }}
              initial={{ y: '80%', opacity: 0, scale: .88 }} animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '-65%', opacity: 0, scale: 1.04 }} transition={{ duration: .32, ease: EASE }}>{word}</motion.h1>
          </AnimatePresence>
        </div>
        <div className="mono" style={{ color: '#9ca99c', marginTop: '1.7vmin' }}>A GAME IN MOTION</div>
      </motion.div>
      <motion.div
        style={{ position: 'absolute', zIndex: 4, left: '47%', top: '27%', width: '48%', height: '47%', overflow: 'hidden', mixBlendMode: 'screen' }}
        initial={{ scale: 1.12, opacity: 0, x: '4%' }} animate={{ scale: [1.12, 1, 1, 1.1], opacity: [0, 1, 1, 0], x: ['4%', '0%', '0%', '0%'] }}
        transition={{ duration: 4.48, times: [0, .2, .76, 1], ease: EASE }}>
        <img className="logo-img" src={image('redline_auction_typography_logo.png')} alt="" style={{ objectFit: 'cover', objectPosition: 'center 50%' }} />
      </motion.div>
      <div className="micro" style={{ position: 'absolute', right: '5.7%', bottom: '5.5%', zIndex: 8 }}>01—05 / OPENING SIGNAL</div>
      <motion.div className="signal-line" style={{ left: '0%', top: '49.5%', width: '100%', height: '1px', zIndex: 10 }}
        initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: [0, 1, 1, 54], opacity: [0, .9, .9, 0], rotate: [0, 0, 0, -3] }}
        transition={{ duration: 4.48, times: [0, .05, .84, 1], ease: EASE }} />
    </motion.section>
  );
}

export function Scene02() {
  return (
    <motion.section className="film" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#0b1010 0%,#141d19 43%,#0b1010 100%)' }} />
      <motion.div style={{ position: 'absolute', top: 0, right: 0, width: '60%', height: '100%', overflow: 'hidden', borderLeft: '1px solid rgba(212,233,129,.42)' }}
        initial={{ clipPath: 'inset(0 100% 0 0)', scale: 1.08 }} animate={{ clipPath: 'inset(0 0% 0 0)', scale: [1.08, 1, 1, 1.06] }}
        transition={{ duration: 4.45, times: [0, .28, .82, 1], ease: EASE }}>
        <img className="image-plane" src={image('guardian_h.png')} alt="" style={{ inset: 0, width: '100%', height: '100%', objectPosition: 'center 34%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#0b1010 0%,transparent 25%,rgba(8,12,12,.08) 70%,rgba(8,12,12,.56) 100%),linear-gradient(0deg,rgba(8,12,12,.65),transparent 42%)' }} />
      </motion.div>
      <motion.div className="signal-line" style={{ zIndex: 7, left: '41%', top: 0, height: '100%', width: '2px' }}
        initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1, 1, 0] }} transition={{ duration: 4.4, times: [0, .16, .79, 1], ease: EASE }} />
      <motion.div style={{ position: 'absolute', zIndex: 8, left: '7%', top: '19%', width: '40%' }}
        initial={{ opacity: 0, x: '-7%' }} animate={{ opacity: [0, 1, 1, 1], x: ['-7%', '0%', '0%', '-2%'] }}
        transition={{ duration: 4.45, times: [0, .17, .78, 1], ease: EASE }}>
        <div className="micro" style={{ color: '#d4e981', marginBottom: '3vmin' }}>01 / CHARACTER FILE</div>
        <h2 className="display" style={{ margin: 0, fontSize: '18vmin', maxWidth: '39vmin' }}>GUARDIAN<br />H</h2>
        <motion.div style={{ height: '2px', background: '#f96346', marginTop: '3vmin', transformOrigin: 'left' }} initial={{ scaleX: 0 }} animate={{ scaleX: [0, 1, 1, .4] }} transition={{ duration: 4.1, times: [0, .28, .78, 1], ease: EASE }} />
        <div className="mono" style={{ marginTop: '2vmin', color: '#b4bdb3' }}>HOLD THE LINE</div>
      </motion.div>
      <motion.div style={{ position: 'absolute', zIndex: 9, right: '12%', top: '24%', width: '16vmin', height: '16vmin', border: '1px solid rgba(212,233,129,.75)', borderRadius: '50%' }}
        initial={{ scale: .1, opacity: 0 }} animate={{ scale: [0.1, .8, 1, 3.2], opacity: [0, .7, .7, 0] }}
        transition={{ duration: 4.48, times: [0, .46, .7, 1], ease: EASE }}>
        <i style={{ position: 'absolute', width: '1.1vmin', height: '1.1vmin', borderRadius: '50%', background: '#d4e981', top: '10%', left: '19%' }} />
      </motion.div>
      <div className="micro" style={{ position: 'absolute', left: '7%', bottom: '6%', zIndex: 8 }}>CHARACTER / 01</div>
      <div className="micro" style={{ position: 'absolute', right: '5.5%', bottom: '6%', zIndex: 8, color: '#d4e981' }}>SIGNAL: ACTIVE</div>
    </motion.section>
  );
}

const roster = [
  { file: 'guardian_h.png', name: 'GUARDIAN H', tint: 'rgba(47,211,230,.12)', position: 'center 38%' },
  { file: 'frostbyte-player-select.png', name: 'FROSTBYTE', tint: 'rgba(129,220,232,.1)', position: 'center 42%' },
  { file: 'click_click.png', name: 'CLICK CLICK', tint: 'rgba(249,99,70,.14)', position: 'center 46%' },
];

export function Scene03() {
  const [word, setWord] = useState('A ROSTER');
  useSceneTimer([{ time: 1200, callback: () => setWord('WITH ATTITUDE.') }]);
  return (
    <motion.section className="film" initial={{ clipPath: 'inset(0 0 0 0)' }} animate={{ clipPath: 'inset(0 0 0 0)' }}
      exit={{ opacity: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg,#0b1010,#121a18 53%,#0a1010)' }} />
      <div style={{ position: 'absolute', zIndex: 7, left: '5.5%', top: '7%', height: '15%', display: 'flex', alignItems: 'center' }}>
        <AnimatePresence mode="sync"><motion.h2 key={word} className="display" style={{ margin: 0, fontSize: '9.6vmin' }}
          initial={{ y: '65%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-55%', opacity: 0 }}
          transition={{ duration: .28, ease: EASE }}>{word}</motion.h2></AnimatePresence>
      </div>
      <div style={{ position: 'absolute', right: '5.5%', top: '10%', zIndex: 7 }} className="micro">SELECT / 03</div>
      <div style={{ position: 'absolute', inset: '25% 5.5% 10%', display: 'grid', gridTemplateColumns: '.85fr 1.15fr .85fr', gap: '1.2vmin', perspective: '1000px' }}>
        {roster.map((item, index) => (
          <motion.div key={item.file} style={{ position: 'relative', overflow: 'hidden', border: '1px solid rgba(191,207,184,.3)', background: '#17201d' }}
            initial={{ rotateY: index === 0 ? -18 : index === 2 ? 18 : 0, y: '12%', opacity: 0, scale: .94 }}
            animate={{ rotateY: [index === 0 ? -18 : index === 2 ? 18 : 0, 0, index === 0 ? -2 : index === 2 ? 2 : 0, index === 0 ? -10 : index === 2 ? 10 : 0], y: ['12%', '0%', '0%', '-3%'], opacity: [0, 1, 1, 1], scale: [0.94, 1, 1, .98] }}
            transition={{ duration: 4.4, delay: index * .09, times: [0, .2, .68, 1], ease: EASE }}>
            <img className="image-plane" src={image(item.file)} alt="" style={{ inset: 0, width: '100%', height: '100%', objectPosition: item.position }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(0deg,rgba(7,10,10,.94),transparent 58%),${item.tint}` }} />
            <div className="micro" style={{ position: 'absolute', top: '3%', left: '5%', color: '#d4e981' }}>0{index + 1} / ROSTER</div>
            <div className="display" style={{ position: 'absolute', left: '5%', right: '3%', bottom: '4%', fontSize: index === 1 ? '5.6vmin' : '4.9vmin' }}>{item.name}</div>
          </motion.div>
        ))}
      </div>
      <motion.div className="signal-line" style={{ left: '5.5%', top: '22.7%', width: '89%', height: '1px', zIndex: 8 }}
        initial={{ scaleX: 0, transformOrigin: 'left' }} animate={{ scaleX: [0, 1, 1, 0.42], transformOrigin: ['left', 'left', 'right', 'center'] }}
        transition={{ duration: 4.4, times: [0, .18, .75, 1], ease: EASE }} />
      <div className="micro" style={{ position: 'absolute', left: '5.5%', bottom: '4.5%', zIndex: 8 }}>THREE DISTINCT SIGNALS</div>
      <motion.div className="signal-line" style={{ left: '49.9%', top: '78%', width: '2px', height: '22%', zIndex: 9 }}
        initial={{ scaleY: 0, transformOrigin: 'top' }} animate={{ scaleY: [0, 0, 1], transformOrigin: 'top' }} transition={{ duration: 4.4, times: [0, .72, 1], ease: EASE }} />
    </motion.section>
  );
}

const tiles = [
  { x: '17%', y: '70%', w: '13%', rotate: '-14deg' },
  { x: '30%', y: '56%', w: '12%', rotate: '-14deg' },
  { x: '43%', y: '43%', w: '13%', rotate: '-14deg' },
  { x: '57%', y: '34%', w: '12%', rotate: '-14deg' },
  { x: '70%', y: '45%', w: '12%', rotate: '16deg' },
  { x: '81%', y: '58%', w: '10%', rotate: '16deg' },
];

export function Scene04() {
  const [phrase, setPhrase] = useState('EVERY MOVE');
  useSceneTimer([{ time: 1300, callback: () => setPhrase('OPENS A ROUTE.') }]);
  return (
    <motion.section className="film" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#111917 0%,#0b1010 54%,#171f1b 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: .24, backgroundImage: 'linear-gradient(rgba(185,205,185,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(185,205,185,.2) 1px,transparent 1px)', backgroundSize: '7.5vmin 7.5vmin', transform: 'perspective(900px) rotateX(55deg) scale(1.5)', transformOrigin: 'center 70%' }} />
      <div style={{ position: 'absolute', zIndex: 6, left: '6%', top: '8%', width: '49%', height: '18%', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <AnimatePresence mode="sync"><motion.h2 key={phrase} className="display" style={{ margin: 0, fontSize: '10.5vmin', maxWidth: '47vw' }}
          initial={{ x: '-8%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '5%', opacity: 0 }}
          transition={{ duration: .38, ease: EASE }}>{phrase}</motion.h2></AnimatePresence>
      </div>
      <div className="micro" style={{ position: 'absolute', zIndex: 6, right: '6%', top: '12%', color: '#d4e981' }}>ROUTE / 01—03</div>
      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" style={{ position: 'absolute', zIndex: 4, inset: '19% 5% 4%', width: '90%', height: '77%', overflow: 'visible' }}>
        <motion.path d="M110 440 L285 350 L430 270 L585 190 L730 265 L865 365" fill="none" stroke="#f96346" strokeWidth="6" strokeLinecap="square" pathLength="1"
          initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1, .42], opacity: [1, 1, 1, .8] }} transition={{ duration: 4.42, times: [0, .48, .78, 1], ease: EASE }} />
        <motion.path d="M430 270 L505 375 L670 430" fill="none" stroke="#d4e981" strokeWidth="3" strokeDasharray="12 14" pathLength="1"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 0, 1, .55], opacity: [0, 0, .8, 0] }}
          transition={{ duration: 4.42, times: [0, .48, .79, 1], ease: EASE }} />
        {[110, 285, 430, 585, 730, 865].map((cx, i) => {
          const cy = [440, 350, 270, 190, 265, 365][i];
          return <motion.g key={cx} initial={{ scale: 0, opacity: 0, transformOrigin: `${cx}px ${cy}px` }}
            animate={{ scale: [0, 1.08, 1, 3.5], opacity: [0, 1, 1, 0] }} transition={{ duration: 4.35, delay: i * .18, times: [0, .5, .78, 1], ease: EASE }}>
            <circle cx={cx} cy={cy} r="17" fill="#101714" stroke={i % 2 ? '#f96346' : '#d4e981'} strokeWidth="4" />
            <circle cx={cx} cy={cy} r="4" fill={i % 2 ? '#d4e981' : '#f96346'} />
          </motion.g>;
        })}
      </svg>
      {tiles.map((tile, i) => (
        <motion.div key={i} style={{ position: 'absolute', zIndex: 3, left: tile.x, top: tile.y, width: tile.w, aspectRatio: '1.36', border: '1px solid rgba(212,233,129,.38)', background: 'linear-gradient(140deg,rgba(59,75,63,.7),rgba(16,24,20,.92))', transform: `rotate(${tile.rotate})`, boxShadow: '0 1.4vmin 3vmin rgba(0,0,0,.4)' }}
          initial={{ y: '3vmin', opacity: 0, scale: .82 }} animate={{ y: ['3vmin', 0, 0, '-1vmin'], opacity: [0, 1, 1, 0], scale: [.82, 1, 1, 1.2] }}
          transition={{ duration: 4.3, delay: i * .13, times: [0, .56, .8, 1], ease: EASE }}>
          <span className="micro" style={{ position: 'absolute', top: '12%', left: '12%', fontSize: '1vmin' }}>0{i + 1}</span>
        </motion.div>
      ))}
      <motion.div style={{ position: 'absolute', zIndex: 9, left: '11%', top: '66%', width: '2.6vmin', height: '2.6vmin', borderRadius: '50%', background: '#d4e981', boxShadow: '0 0 1.2vmin rgba(212,233,129,.5)' }}
        animate={{ x: ['0vw', '18vw', '34vw', '48vw', '62vw', '73vw'], y: ['0vh', '-8vh', '-16vh', '-24vh', '-13vh', '-2vh'], scale: [1, .86, 1.1, .95, 1.1, 2.8], opacity: [1, 1, 1, 1, 1, 0] }}
        transition={{ duration: 4.4, times: [0, .2, .38, .57, .76, 1], ease: EASE }} />
      <div className="micro" style={{ position: 'absolute', zIndex: 8, left: '6%', bottom: '5%', color: '#d4e981' }}>A BOARD-LIKE ROUTE / NOT A MAP</div>
    </motion.section>
  );
}

export function Scene05() {
  const [word, setWord] = useState('PLAY.');
  useSceneTimer([
    { time: 780, callback: () => setWord('UPGRADE.') },
    { time: 1280, callback: () => setWord('REDLINE.') },
    { time: 1980, callback: () => setWord('') },
  ]);
  return (
    <motion.section className="film" initial={{ clipPath: 'inset(0 0 0 0)' }} animate={{ clipPath: 'inset(0 0 0 0)' }}
      exit={{ opacity: 0 }}>
      <motion.div style={{ position: 'absolute', inset: 0, background: '#e6e1d0' }}
        initial={{ clipPath: 'circle(2% at 50% 50%)' }} animate={{ clipPath: ['circle(2% at 50% 50%)', 'circle(82% at 50% 50%)', 'circle(115% at 50% 50%)'] }}
        transition={{ duration: 1.05, times: [0, .52, 1], ease: EASE }} />
      <div style={{ position: 'absolute', inset: 0, opacity: .38, background: 'radial-gradient(ellipse at center,#f5f0df 0%,#e6e1d0 72%,#c8c1ac 100%)' }} />
      <motion.div style={{ position: 'absolute', zIndex: 3, left: '6%', bottom: '23%', width: '44%', height: '25%', overflow: 'hidden' }}
        animate={{ opacity: [1, 1, 1, 0], x: [0, 0, 0, '-6%'] }} transition={{ duration: 5.9, times: [0, .55, .7, .86], ease: EASE }}>
        <AnimatePresence mode="sync">{word && <motion.h2 key={word} className="display" style={{ margin: 0, fontSize: '21vmin', color: '#0b1010', whiteSpace: 'nowrap' }}
          initial={{ y: '90%', opacity: 0, scale: .94 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: '-72%', opacity: 0, scale: 1.04 }}
          transition={{ duration: .28, ease: EASE }}>{word}</motion.h2>}</AnimatePresence>
      </motion.div>
      <motion.div style={{ position: 'absolute', zIndex: 4, left: '28%', top: '20%', width: '44%', height: '42%' }}
        initial={{ scale: .52, opacity: 0, rotate: -3 }} animate={{ scale: [0.52, 1, 1, 1.03], opacity: [0, 1, 1, 1], rotate: [-3, 0, 0, 0] }}
        transition={{ duration: 5.8, times: [0, .34, .78, 1], ease: EASE }}>
        <img className="logo-img" src={image('redline_auction_typography_logo.png')} alt="" style={{ objectFit: 'cover', objectPosition: 'center 50%', mixBlendMode: 'multiply' }} />
      </motion.div>
      <motion.div className="signal-line" style={{ zIndex: 5, left: '14%', top: '57%', width: '72%', height: '2px' }}
        initial={{ scaleX: 0 }} animate={{ scaleX: [0, 1, 1, .16], x: ['0%', '0%', '0%', '-30%'] }}
        transition={{ duration: 5.85, times: [0, .35, .78, 1], ease: EASE }} />
      <motion.div style={{ position: 'absolute', zIndex: 6, left: '50%', top: '69%', transform: 'translateX(-50%)', color: '#18201c', textAlign: 'center' }}
        initial={{ opacity: 0, y: '1.5vmin' }} animate={{ opacity: [0, 1, 1, 1], y: ['1.5vmin', 0, 0, '-.4vmin'] }}
        transition={{ duration: 5.8, times: [0, .38, .78, 1], ease: EASE }}>
        <div className="mono" style={{ letterSpacing: '.28em' }}>REDLINE UPGRADE</div>
      </motion.div>
      <div className="micro" style={{ position: 'absolute', right: '5.5%', bottom: '5%', zIndex: 7, color: '#59645a' }}>A GAME IN MOTION</div>
      <motion.div style={{ position: 'absolute', zIndex: 9, left: 0, top: '56.9%', height: '1px', width: '100%', background: '#f96346', transformOrigin: 'left' }}
        animate={{ scaleX: [0, 1, 1, .2], opacity: [1, 1, 1, .8] }} transition={{ duration: 5.9, times: [0, .34, .82, 1], ease: EASE }} />
    </motion.section>
  );
}
