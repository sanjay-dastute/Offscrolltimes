import { useEffect, useRef, useState } from 'react'

const QUESTIONS = [
  { question: 'You pass the person in second place. What place are you in?', options: ['First', 'Second', 'Third'], answer: 1, why: 'You take their position: second place. The person in first is still ahead.' },
  { question: 'What comes next: 2, 6, 12, 20, …?', options: ['28', '30', '32'], answer: 1, why: 'The gaps grow by two: +4, +6, +8, then +10. So the answer is 30.' },
  { question: 'Which word becomes shorter when you add two letters?', options: ['Small', 'Short', 'Little'], answer: 1, why: 'Add “er” to “short” and you get “shorter”. A little wordplay!' },
]
type Game = 'quiz' | 'puzzle' | 'dice'
const GAME_LABELS: Record<Game, string> = { quiz: 'Quick quiz', puzzle: 'Slide puzzle', dice: 'Roll the dice' }

export function PaperPlayground() {
  const [game, setGame] = useState<Game>('quiz')
  return <section id="mini-puzzle-pack" className="paper-playground" aria-labelledby="playground-title">
    <div className="paper-playground-shell">
      <p className="play-eyebrow">A little less scrolling. A little more playing.</p>
      <h2 id="playground-title">Your brain called.<br />It wants a play break.</h2>
      <p className="play-intro">Three tiny games. No download. Just you, a little luck, and a fresh perspective.</p>
      <div className="play-switcher" role="group" aria-label="Choose a game">
        {(Object.keys(GAME_LABELS) as Game[]).map(id => <button key={id} type="button" aria-pressed={game === id} onClick={() => setGame(id)}>{GAME_LABELS[id]}</button>)}
      </div>
      <div className="play-card" key={game}>
        {game === 'quiz' ? <Quiz /> : game === 'puzzle' ? <SlidePuzzle /> : <DiceGame />}
      </div>
      <p className="play-footnote">Changing games starts a fresh round. These are free web tasters.</p>
      <a className="play-subscribe" href="/subscription">Enjoy the pause? Choose your subscription <span aria-hidden="true">↗</span></a>
    </div>
  </section>
}

function Quiz() {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready')
  const [answers, setAnswers] = useState<number[]>([])
  const [remaining, setRemaining] = useState(30)
  const [timed, setTimed] = useState(true)
  const deadline = useRef(0)
  const locked = useRef(false)
  const score = answers.filter((answer, index) => answer === QUESTIONS[index].answer).length
  useEffect(() => {
    if (phase !== 'playing' || !timed) return
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))
      setRemaining(seconds)
      if (!seconds) setPhase('done')
    }
    const timer = window.setInterval(tick, 200)
    return () => window.clearInterval(timer)
  }, [phase, timed])
  useEffect(() => { locked.current = false }, [answers.length])
  function start() { setAnswers([]); setRemaining(30); deadline.current = Date.now() + 30000; locked.current = false; setPhase('playing') }
  function answer(value: number) {
    if (locked.current) return
    if (timed && Date.now() >= deadline.current) { setPhase('done'); return }
    locked.current = true
    setAnswers([...answers, value])
    if (answers.length === QUESTIONS.length - 1) setPhase('done')
  }
  return <>
    <div className="play-card-bar"><span>Score {score}/3</span><span>{phase === 'playing' ? (timed ? `${remaining}s left` : 'No timer') : 'The brain warm-up'}</span></div>
    <div className="play-card-body">
      {phase === 'ready' && <><div className="play-badge" aria-hidden="true">3</div><h3>Pencil ready?</h3><p>Three questions. Thirty seconds. Can you spot the little traps?</p><label className="play-check"><input type="checkbox" checked={!timed} onChange={e => setTimed(!e.target.checked)} /> Play without a timer</label><button type="button" className="play-primary" onClick={start}>Let’s play <span aria-hidden="true">→</span></button></>}
      {phase === 'playing' && <div key={answers.length} className="play-question"><p className="play-eyebrow">Question {answers.length + 1} of 3</p><h3 aria-live="polite">{QUESTIONS[answers.length].question}</h3><div className="play-options">{QUESTIONS[answers.length].options.map((option, index) => <button type="button" key={option} onClick={() => answer(index)}><span aria-hidden="true">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div></div>}
      {phase === 'done' && <><div role="status"><div className="play-badge">{score}/3</div><h3>{score === 3 ? 'Sharp as a freshly sharpened pencil.' : 'A good brain stretch.'}</h3><p>{answers.length < 3 ? 'Time’s up! ' : ''}Here’s the thinking behind the answers.</p></div><ol className="play-answers">{QUESTIONS.map((q, i) => <li key={q.question}><strong>{answers[i] === undefined ? 'Not answered' : answers[i] === q.answer ? 'Correct' : 'A little trap'} · {q.options[q.answer]}</strong><p>{q.why}</p></li>)}</ol><button type="button" className="play-primary" onClick={() => setPhase('ready')}>Play again</button></>}
    </div>
  </>
}

const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0]
function adjacent(a: number, b: number) { return Math.abs(Math.floor(a / 3) - Math.floor(b / 3)) + Math.abs(a % 3 - b % 3) === 1 }
function SlidePuzzle() {
  const [tiles, setTiles] = useState([1, 2, 3, 4, 0, 6, 7, 5, 8])
  const [moves, setMoves] = useState(0)
  const empty = tiles.indexOf(0)
  const solved = tiles.every((tile, i) => tile === SOLVED[i])
  function move(index: number) {
    if (solved || !adjacent(index, empty)) return
    const next = [...tiles]; [next[index], next[empty]] = [next[empty], next[index]]
    setTiles(next); setMoves(moves + 1)
  }
  function shuffle() {
    const next = [...SOLVED]
    let blank = 8, previous = -1
    for (let step = 0; step < 60; step++) {
      const choices = next.map((_, i) => i).filter(i => adjacent(i, blank) && i !== previous)
      const chosen = choices[Math.floor(Math.random() * choices.length)]
      ;[next[chosen], next[blank]] = [next[blank], next[chosen]]
      previous = blank; blank = chosen
    }
    if (next.every((tile, i) => tile === SOLVED[i])) [next[7], next[8]] = [next[8], next[7]]
    setTiles(next); setMoves(0)
  }
  return <><div className="play-card-bar"><span>{moves} moves</span><span>The pocket puzzle</span></div><div className="play-card-body"><h3>Put the pieces in their place.</h3><p>Arrange 1–8 in order, with the gap last. Tap a tile beside the gap to slide it. Or Tab to it and press Enter.</p><div className="play-puzzle" role="group" aria-label="Sliding number puzzle">{tiles.map((tile, index) => tile ? <button key={tile} type="button" aria-disabled={solved || !adjacent(index, empty)} aria-label={`Tile ${tile}, row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}${adjacent(index, empty) ? ', can slide' : ''}`} onClick={() => move(index)}>{tile}<span aria-hidden="true">OFFSCROLL</span></button> : <span className="play-gap" key="gap" aria-label={`Empty space, row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}`}>✦</span>)}</div><p className="play-result" role="status">{solved ? `Beautifully put together. Solved in ${moves} moves!` : 'A small shuffle. A satisfying little win.'}</p><button type="button" className="play-primary" onClick={shuffle}>{solved ? 'Try another puzzle' : 'Shuffle a new puzzle'}</button></div></>
}

const DICE_FACTS = [
  { text: 'An octopus has three hearts. Two pump blood to its gills; one serves the rest of its body.', source: 'Smithsonian Ocean', href: 'https://ocean.si.edu/ocean-life/invertebrates/octopuses-squids-and-relatives' },
  { text: 'Venus takes longer to spin once than to travel around the Sun.', source: 'NASA', href: 'https://science.nasa.gov/venus/venus-facts/' },
  { text: 'Mars is home to Olympus Mons, the largest volcano in our solar system.', source: 'NASA', href: 'https://science.nasa.gov/mars/facts/' },
  { text: 'Uranus is tilted so far that it appears to spin on its side.', source: 'NASA', href: 'https://science.nasa.gov/uranus/facts/' },
  { text: 'Saturn is the only planet whose average density is lower than water.', source: 'NASA', href: 'https://science.nasa.gov/mission/cassini/faq/' },
  { text: 'Hummingbirds can fly backward as well as forward.', source: 'Smithsonian National Zoo', href: 'https://nationalzoo.si.edu/migratory-birds/hummingbirds' },
  { text: 'Honey bees use a “waggle dance” to tell other bees where to find food.', source: 'USDA', href: 'https://www.nifa.usda.gov/about-nifa/impacts/buzz-me-bees-wearing-itty-bitty-qr-codes-reveal-hive-secrets' },
] as const

function DiceGame() {
  const [rolls, setRolls] = useState<number[]>([])
  const [factIndex, setFactIndex] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const factPool = useRef<number[]>([])
  const lastFact = useRef<number | null>(null)
  const total = rolls.reduce((sum, value) => sum + value, 0)
  const done = rolls.length === 3
  useEffect(() => () => clearTimeout(timer.current), [])
  function roll() {
    if (rolling || done) return
    setRolling(true)
    timer.current = setTimeout(() => {
      if (!factPool.current.length) factPool.current = DICE_FACTS.map((_, index) => index).filter(index => index !== lastFact.current)
      const pick = Math.floor(Math.random() * factPool.current.length)
      const [nextFact] = factPool.current.splice(pick, 1)
      lastFact.current = nextFact
      setFactIndex(nextFact)
      setRolls(previous => [...previous, Math.floor(Math.random() * 6) + 1])
      setRolling(false)
    }, 500)
  }
  const value = rolls.at(-1) ?? 1
  const pips: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }
  return <><div className="play-card-bar"><span>Total {total}/12</span><span>{rolls.length}/3 rolls</span></div><div className="play-card-body"><h3>A little roll of good fortune.</h3><p>Three rolls. One die. Can you reach a total of 12 or more? Each roll reveals a curious fact. A free game of chance—no stakes, no prizes.</p><div className={`play-die${rolling ? ' is-rolling' : ''}`} role="img" aria-label={rolling ? 'Dice rolling' : `Die shows ${value}`}>{Array.from({length: 9}, (_, i) => <span key={i} className={pips[value].includes(i) ? 'pip' : ''} />)}</div><p className="play-result" role="status">{rolling ? 'Rolling…' : done ? total >= 12 ? `You rolled ${total}. Luck’s on your side!` : `${total} this time. Fancy another round?` : rolls.length ? `You rolled ${value}. ${3 - rolls.length} ${rolls.length === 2 ? 'roll' : 'rolls'} to go.` : 'Ready when you are.'}</p>{factIndex !== null && <div key={factIndex} className="play-fact" aria-live="polite"><span className="play-fact-label">Curious fact #{rolls.length}</span><p>{DICE_FACTS[factIndex].text}</p><a href={DICE_FACTS[factIndex].href} target="_blank" rel="noopener noreferrer">Source: {DICE_FACTS[factIndex].source}</a></div>}<button type="button" className="play-primary" disabled={rolling} onClick={done ? () => { setRolls([]); setFactIndex(null) } : roll}>{rolling ? 'Rolling…' : done ? 'Play again' : 'Roll the dice'}</button></div></>
}
