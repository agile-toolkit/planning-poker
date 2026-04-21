import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CardValue, GamePhase, Story, PokerSession } from './types'
import { CARD_VALUES } from './types'
import SessionView from './components/SessionView'

function cardKey(v: CardValue): string {
  if (v === '½') return 'half'
  if (v === '☕') return 'coffee'
  return v
}

function pokerSessionToStories(p: PokerSession): Story[] {
  return p.stories
    .filter(s => s.finalEstimate !== null)
    .map(s => ({
      id: s.id,
      title: s.title,
      finalEstimate: s.finalEstimate,
      votes: Object.fromEntries(
        Object.entries(s.votes).map(([pid, v]) => {
          const name = p.participants.find(x => x.id === pid)?.name ?? pid
          return [name, v]
        })
      ),
    }))
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [phase, setPhase] = useState<GamePhase>('home')
  const [currentStory, setCurrentStory] = useState('')
  const [participantsText, setParticipantsText] = useState('Alice\nBob\nCarol')
  const [stories, setStories] = useState<Story[]>([])
  const [pokerSession, setPokerSession] = useState<PokerSession | null>(null)

  const startSession = () => {
    const names = participantsText.split('\n').map(n => n.trim()).filter(Boolean)
    if (!names.length || !currentStory.trim()) return
    const storyId = crypto.randomUUID()
    setPokerSession({
      id: crypto.randomUUID(),
      name: t('session.default_name'),
      participants: names.map(name => ({ id: crypto.randomUUID(), name, vote: null })),
      stories: [
        {
          id: storyId,
          title: currentStory.trim(),
          finalEstimate: null,
          votes: {},
        },
      ],
      currentStoryId: storyId,
      revealed: false,
    })
    setPhase('session')
  }

  const handleSessionBack = () => {
    if (pokerSession) {
      const extra = pokerSessionToStories(pokerSession)
      setStories(prev => {
        const ids = new Set(prev.map(s => s.id))
        const merged = [...prev]
        for (const s of extra) {
          if (!ids.has(s.id)) merged.push(s)
        }
        return merged
      })
    }
    setPokerSession(null)
    setPhase('home')
  }

  const navItems: { key: GamePhase; label: string }[] = [{ key: 'learn', label: t('learn.title') }]

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPhase('home')}
            className="font-semibold text-brand-400 hover:text-brand-300"
          >
            {t('app.title')}
          </button>
          <div className="flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPhase(item.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  phase === item.key
                    ? 'bg-brand-900 text-brand-300'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
            {stories.length > 0 && (
              <button type="button" onClick={() => setPhase('history')} className="btn-ghost">
                {t('history.title')}
              </button>
            )}
            <button
              type="button"
              onClick={() => i18n.changeLanguage(i18n.language.startsWith('ru') ? 'en' : 'ru')}
              className="ml-2 text-sm text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
            >
              {t('app.switch_lang')}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {phase === 'home' && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-10">
              <div className="text-6xl mb-4">🃏</div>
              <h1 className="text-4xl font-bold text-white mb-3">{t('home.headline')}</h1>
              <p className="text-gray-400 mb-8">{t('home.subheadline')}</p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setPhase('setup')}
                  className="btn-primary text-base px-8 py-3"
                >
                  {t('home.start_practice')}
                </button>
                <button
                  type="button"
                  disabled
                  title={t('home.team_note')}
                  className="btn-secondary text-base px-8 py-3 opacity-40 cursor-not-allowed"
                >
                  {t('home.start_team')}
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-3">{t('home.team_note')}</p>
            </div>
            <div className="card mb-4">
              <h2 className="font-semibold text-white mb-2">{t('home.why_title')}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{t('home.why_body')}</p>
            </div>
            <div className="card mb-4">
              <h2 className="font-semibold text-white mb-3">{t('home.cards_title')}</h2>
              <div className="space-y-1">
                {CARD_VALUES.map(v => (
                  <div key={v} className="flex items-center gap-3 text-sm">
                    <span className="w-8 h-11 border border-gray-600 rounded-md flex items-center justify-center font-bold text-gray-200 shrink-0 text-xs">
                      {v}
                    </span>
                    <span className="text-gray-400">{t(`cards.${cardKey(v)}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === 'setup' && (
          <div className="max-w-md mx-auto card">
            <h1 className="font-semibold text-white text-xl mb-5">{t('setup.title')}</h1>
            <div className="space-y-4">
              <div>
                <label className="label">{t('setup.story_title_label')}</label>
                <input
                  autoFocus
                  className="input"
                  placeholder={t('setup.story_placeholder')}
                  value={currentStory}
                  onChange={e => setCurrentStory(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t('setup.participants_label')}</label>
                <textarea
                  className="input resize-none"
                  rows={4}
                  placeholder={t('setup.participants_placeholder')}
                  value={participantsText}
                  onChange={e => setParticipantsText(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPhase('home')} className="btn-secondary">
                  {t('setup.back')}
                </button>
                <button
                  type="button"
                  onClick={startSession}
                  disabled={!currentStory.trim()}
                  className="btn-primary flex-1"
                >
                  {t('setup.start')}
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'session' && pokerSession && (
          <SessionView
            session={pokerSession}
            onChange={setPokerSession}
            onBack={handleSessionBack}
          />
        )}

        {phase === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">{t('history.title')}</h1>
              <button
                type="button"
                onClick={() => {
                  setStories([])
                  setPhase('home')
                }}
                className="btn-secondary"
              >
                {t('history.new_session')}
              </button>
            </div>
            {stories.length === 0 ? (
              <div className="card text-center py-10 text-gray-500">{t('history.no_stories')}</div>
            ) : (
              <div className="space-y-3">
                {stories.map(story => (
                  <div key={story.id} className="card flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">{story.title}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {Object.entries(story.votes).map(([name, vote]) => (
                          <span key={name} className="text-xs text-gray-400">
                            {name}: <strong className="text-white">{vote}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                    {story.finalEstimate && (
                      <div className="w-12 h-16 rounded-xl border-2 border-brand-400 bg-brand-900 flex items-center justify-center text-lg font-bold text-brand-300 shrink-0">
                        {story.finalEstimate}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
