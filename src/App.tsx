import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GamePhase, CardValue, Participant, Story } from './types'

const CARDS: CardValue[] = ['½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕']
const NUMERIC: Record<string, number> = { '½': 0.5, '1': 1, '2': 2, '3': 3, '5': 5, '8': 8, '13': 13, '20': 20, '40': 40, '100': 100 }

function numericVotes(participants: Participant[]) {
  return participants.map(p => p.vote ? NUMERIC[p.vote as string] : null).filter(v => v !== null && v !== undefined) as number[]
}

function avg(nums: number[]) {
  if (nums.length === 0) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 10) / 10
}

function median(nums: number[]) {
  if (nums.length === 0) return null
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function closestFibonacci(val: number): CardValue {
  const closest = CARDS.filter(c => NUMERIC[c as string] !== undefined)
    .map(c => ({ c, diff: Math.abs(NUMERIC[c as string] - val) }))
    .sort((a, b) => a.diff - b.diff)[0]
  return closest?.c ?? '?'
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [phase, setPhase] = useState<GamePhase>('home')
  const [currentStory, setCurrentStory] = useState('')
  const [nextStory, setNextStory] = useState('')
  const [participantsText, setParticipantsText] = useState('Alice\nBob\nCarol')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [selectedVoter, setSelectedVoter] = useState(0)

  const startSession = () => {
    const names = participantsText.split('\n').map(n => n.trim()).filter(Boolean)
    if (!names.length || !currentStory.trim()) return
    setParticipants(names.map(name => ({ name, vote: null })))
    setPhase('voting')
  }

  const vote = (card: CardValue) => {
    const updated = participants.map((p, i) =>
      i === selectedVoter ? { ...p, vote: card } : p
    )
    setParticipants(updated)
    // Auto-advance to next participant
    const next = updated.findIndex((p, i) => i > selectedVoter && p.vote === null)
    if (next !== -1) setSelectedVoter(next)
  }

  const reveal = () => {
    setPhase('revealed')
  }

  const nextStoryStep = () => {
    if (!nextStory.trim()) return
    // Save current story result
    const nums = numericVotes(participants)
    const medianVal = median(nums)
    const finalEstimate = medianVal !== null ? closestFibonacci(medianVal) : null
    setStories(prev => [...prev, {
      id: crypto.randomUUID(),
      title: currentStory,
      finalEstimate,
      votes: Object.fromEntries(participants.map(p => [p.name, p.vote as CardValue])),
    }])
    setCurrentStory(nextStory)
    setNextStory('')
    setParticipants(participants.map(p => ({ ...p, vote: null })))
    setSelectedVoter(0)
    setPhase('voting')
  }

  const endSession = () => {
    const nums = numericVotes(participants)
    const medianVal = median(nums)
    const finalEstimate = medianVal !== null ? closestFibonacci(medianVal) : null
    setStories(prev => [...prev, {
      id: crypto.randomUUID(),
      title: currentStory,
      finalEstimate,
      votes: Object.fromEntries(participants.map(p => [p.name, p.vote as CardValue])),
    }])
    setPhase('history')
  }

  const nums = numericVotes(participants)
  const avgVal = avg(nums)
  const medianVal = median(nums)
  const allVoted = participants.length > 0 && participants.every(p => p.vote !== null)
  const consensus = nums.length > 1 && new Set(nums).size === 1

  const navItems: { key: GamePhase; label: string }[] = [
    { key: 'learn', label: t('learn.title') },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => setPhase('home')} className="font-semibold text-brand-400 hover:text-brand-300">
            {t('app.title')}
          </button>
          <div className="flex items-center gap-1">
            {navItems.map(item => (
              <button key={item.key} onClick={() => setPhase(item.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${phase === item.key ? 'bg-brand-900 text-brand-300' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                {item.label}
              </button>
            ))}
            {stories.length > 0 && (
              <button onClick={() => setPhase('history')} className="btn-ghost">{t('history.title')}</button>
            )}
            <button onClick={() => i18n.changeLanguage(i18n.language.startsWith('ru') ? 'en' : 'ru')}
              className="ml-2 text-sm text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700">
              {i18n.language.startsWith('ru') ? 'EN' : 'RU'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">

        {/* HOME */}
        {phase === 'home' && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-10">
              <div className="text-6xl mb-4">🃏</div>
              <h1 className="text-4xl font-bold text-white mb-3">{t('home.headline')}</h1>
              <p className="text-gray-400 mb-8">{t('home.subheadline')}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setPhase('setup')} className="btn-primary text-base px-8 py-3">
                  {t('home.start_practice')}
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-3">{t('home.team_note')}</p>
            </div>
            <div className="card mb-4">
              <h2 className="font-semibold text-white mb-2">{t('home.why_title')}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{t('home.why_body')}</p>
            </div>
          </div>
        )}

        {/* SETUP */}
        {phase === 'setup' && (
          <div className="max-w-md mx-auto card">
            <h1 className="font-semibold text-white text-xl mb-5">{t('setup.title')}</h1>
            <div className="space-y-4">
              <div>
                <label className="label">{t('setup.story_title_label')}</label>
                <input autoFocus className="input" placeholder={t('setup.story_placeholder')} value={currentStory} onChange={e => setCurrentStory(e.target.value)} />
              </div>
              <div>
                <label className="label">{t('setup.participants_label')}</label>
                <textarea className="input resize-none" rows={4} placeholder={t('setup.participants_placeholder')} value={participantsText} onChange={e => setParticipantsText(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setPhase('home')} className="btn-secondary">{t('setup.back')}</button>
                <button onClick={startSession} disabled={!currentStory.trim()} className="btn-primary flex-1">{t('setup.start')}</button>
              </div>
            </div>
          </div>
        )}

        {/* VOTING */}
        {phase === 'voting' && (
          <div>
            <div className="text-center mb-6">
              <p className="text-gray-400 text-sm mb-1">{t('voting.current_story')}</p>
              <h2 className="text-2xl font-bold text-white">{currentStory}</h2>
            </div>

            {/* Participant tabs */}
            <div className="flex gap-2 mb-4 flex-wrap justify-center">
              {participants.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => setSelectedVoter(i)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    i === selectedVoter ? 'bg-brand-600 text-white' : p.vote ? 'bg-gray-700 text-green-400' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {p.name} {p.vote ? '✓' : ''}
                </button>
              ))}
            </div>

            <p className="text-center text-gray-400 text-sm mb-4">
              {t('voting.pick_card')} for <strong className="text-white">{participants[selectedVoter]?.name}</strong>
            </p>

            {/* Cards */}
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {CARDS.map(card => (
                <button
                  key={card}
                  onClick={() => vote(card)}
                  className={`w-16 h-24 rounded-2xl border-2 text-xl font-bold transition-all hover:scale-105 ${
                    participants[selectedVoter]?.vote === card
                      ? 'border-brand-400 bg-brand-900 text-brand-300 shadow-lg scale-105'
                      : 'border-gray-600 bg-gray-800 text-white hover:border-brand-400'
                  }`}
                >
                  {card}
                </button>
              ))}
            </div>

            <div className="text-center">
              <button onClick={reveal} disabled={!allVoted} className="btn-primary px-8 py-3 text-base">
                {t('voting.reveal')}
              </button>
              {!allVoted && <p className="text-gray-500 text-xs mt-2">{t('voting.waiting')}</p>}
            </div>
          </div>
        )}

        {/* REVEALED */}
        {phase === 'revealed' && (
          <div>
            <h2 className="text-2xl font-bold text-white text-center mb-2">{currentStory}</h2>
            <p className="text-gray-400 text-center text-sm mb-6">{t('revealed.title')}</p>

            {/* Votes */}
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {participants.map(p => (
                <div key={p.name} className="text-center">
                  <div className={`w-16 h-24 rounded-2xl border-2 flex items-center justify-center text-xl font-bold mb-2 ${
                    consensus ? 'border-green-400 bg-green-900 text-green-300' : 'border-gray-500 bg-gray-800 text-white'
                  }`}>
                    {p.vote}
                  </div>
                  <p className="text-xs text-gray-400">{p.name}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: t('revealed.average'), value: avgVal !== null ? String(avgVal) : '—' },
                { label: t('revealed.median'), value: medianVal !== null ? String(medianVal) : '—' },
                { label: t('revealed.consensus'), value: consensus ? '✓' : '✗' },
                { label: t('revealed.spread'), value: nums.length > 1 ? String(Math.max(...nums) - Math.min(...nums)) : '—' },
              ].map(s => (
                <div key={s.label} className="card text-center py-3">
                  <div className={`text-2xl font-bold mb-1 ${s.label === t('revealed.consensus') ? (consensus ? 'text-green-400' : 'text-red-400') : 'text-brand-400'}`}>{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Next story */}
            <div className="card mb-4">
              <label className="label">{t('revealed.story_title')}</label>
              <input
                className="input mb-3"
                placeholder={t('revealed.story_placeholder')}
                value={nextStory}
                onChange={e => setNextStory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && nextStoryStep()}
              />
              <div className="flex gap-3">
                <button onClick={nextStoryStep} disabled={!nextStory.trim()} className="btn-primary">{t('revealed.next_story')}</button>
                <button onClick={endSession} className="btn-secondary">{t('revealed.end_session')}</button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {phase === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">{t('history.title')}</h1>
              <button onClick={() => { setStories([]); setPhase('home') }} className="btn-secondary">{t('history.new_session')}</button>
            </div>
            {stories.length === 0 ? (
              <div className="card text-center py-10 text-gray-500">{t('history.no_stories')}</div>
            ) : (
              <div className="space-y-3">
                {stories.map(story => (
                  <div key={story.id} className="card flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-white">{story.title}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {Object.entries(story.votes).map(([name, vote]) => (
                          <span key={name} className="text-xs text-gray-400">{name}: <strong className="text-white">{vote}</strong></span>
                        ))}
                      </div>
                    </div>
                    {story.finalEstimate && (
                      <div className="w-12 h-16 rounded-xl border-2 border-brand-400 bg-brand-900 flex items-center justify-center text-lg font-bold text-brand-300 flex-shrink-0">
                        {story.finalEstimate}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LEARN */}
        {phase === 'learn' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold text-white">{t('learn.title')}</h1>
            {[
              { title: t('learn.fibonacci_title'), body: t('learn.fibonacci_body') },
              { title: t('learn.wideband_title'), body: t('learn.wideband_body') },
            ].map(s => (
              <div key={s.title} className="card">
                <h2 className="font-semibold text-white mb-2">{s.title}</h2>
                <p className="text-gray-400 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
            <div className="card">
              <h2 className="font-semibold text-white mb-3">{t('learn.tips_title')}</h2>
              <ul className="space-y-2">
                {['tip1', 'tip2', 'tip3', 'tip4', 'tip5'].map(tip => (
                  <li key={tip} className="flex gap-2 text-sm text-gray-400">
                    <span className="text-brand-400">→</span>
                    {t(`learn.${tip}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
