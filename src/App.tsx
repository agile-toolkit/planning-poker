import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CardValue, DeckType, GamePhase, PokerSession, SessionHistoryEntry } from './types'
import { DECKS } from './types'
import { isFirebaseConfigured } from './firebase'
import { loadHistory, parseDeeplinkStories, parseChangePlannerParams, parseJoinPinParam, parseKanbanBoardParam, parseParticipantsParam, cardKey, type DeeplinkStory } from './deeplink'
import { parseTeamIdentityMembers } from './teamIdentityImport'
import SessionView from './components/SessionView'
import TeamSession from './components/TeamSession'
import AppHeader from './components/AppHeader'
import ThemeToggle from './components/ThemeToggle'

const HISTORY_KEY = 'planning-poker:history'
const HISTORY_MAX = 10

const firebaseReady = isFirebaseConfigured()

export default function App() {
  const { t } = useTranslation()
  const [deeplinkedStories, setDeeplinkedStories] = useState<DeeplinkStory[]>(() => {
    const stories = parseDeeplinkStories()
    return stories.length > 0 ? stories : parseKanbanBoardParam()
  })
  const [changePlannerSource] = useState(parseChangePlannerParams)
  const [phase, setPhase] = useState<GamePhase>(() => {
    if (parseDeeplinkStories().length > 0 || parseKanbanBoardParam().length > 0 || parseParticipantsParam().length > 0) return 'setup'
    if (firebaseReady && parseJoinPinParam()) return 'team'
    return 'home'
  })
  const [teamEntryMode, setTeamEntryMode] = useState<'host' | 'join'>(() =>
    firebaseReady && parseJoinPinParam() ? 'join' : 'host'
  )
  const [currentStory, setCurrentStory] = useState('')
  const [participantsText, setParticipantsText] = useState(() => {
    const fromParams = parseParticipantsParam()
    return fromParams.length > 0 ? fromParams.join('\n') : 'Alice\nBob\nCarol'
  })
  const [selectedDeck, setSelectedDeck] = useState<DeckType>('fibonacci')
  const [selectedTimer, setSelectedTimer] = useState<number | null>(null)
  const [pokerSession, setPokerSession] = useState<PokerSession | null>(null)
  const [importTooltip, setImportTooltip] = useState('')
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryEntry[]>(loadHistory)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  const importFromTeamIdentity = () => {
    const names = parseTeamIdentityMembers(localStorage.getItem('team-identity-charter'))
    if (names.length === 0) { setImportTooltip(t('setup.import_team_empty')); return }
    setParticipantsText(names.join('\n'))
    setImportTooltip('')
  }

  const removeDeeplinkStory = (index: number) => {
    setDeeplinkedStories(prev => prev.filter((_, i) => i !== index))
  }

  const startSession = () => {
    const names = participantsText.split('\n').map(n => n.trim()).filter(Boolean)
    if (!names.length) return
    const storiesToUse: DeeplinkStory[] =
      deeplinkedStories.length > 0 ? deeplinkedStories : currentStory.trim() ? [{ title: currentStory.trim() }] : []
    if (!storiesToUse.length) return
    const sessionStories = storiesToUse.map(s => ({
      id: crypto.randomUUID(),
      title: s.title,
      description: s.description,
      finalEstimate: null as CardValue | null,
      votes: {} as Record<string, CardValue>,
    }))
    setPokerSession({
      id: crypto.randomUUID(),
      name: t('session.default_name'),
      participants: names.map(name => ({ id: crypto.randomUUID(), name, vote: null })),
      stories: sessionStories,
      currentStoryId: sessionStories[0].id,
      revealed: false,
      deckType: selectedDeck,
      timerDuration: selectedTimer,
    })
    setPhase('session')
  }

  const handleSessionBack = () => {
    if (pokerSession) {
      const estimatedStories = pokerSession.stories.filter(s => s.finalEstimate !== null)
      const smData = estimatedStories.map(s => ({ title: s.title, finalEstimate: s.finalEstimate }))
      if (smData.length > 0) {
        localStorage.setItem('sprintMetrics_planningPoker', JSON.stringify(smData))
      }

      const numericEstimates = estimatedStories
        .map(s => (s.finalEstimate === '½' ? 0.5 : parseFloat(s.finalEstimate ?? '')))
        .filter(n => !isNaN(n))
      const avgPoints =
        numericEstimates.length > 0
          ? Math.round((numericEstimates.reduce((a, b) => a + b, 0) / numericEstimates.length) * 10) / 10
          : null
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem(
        'planning-poker:lastSession',
        JSON.stringify({
          sessionName: pokerSession.name,
          deckType: pokerSession.deckType,
          storyCount: pokerSession.stories.length,
          estimatedCount: estimatedStories.length,
          avgPoints,
          date: today,
        })
      )

      const historyEntry: SessionHistoryEntry = {
        id: pokerSession.id,
        name: pokerSession.name,
        date: today,
        deckType: pokerSession.deckType,
        storyCount: pokerSession.stories.length,
        estimatedCount: estimatedStories.length,
        avgPoints,
        stories: pokerSession.stories.map(s => ({
          id: s.id,
          title: s.title,
          finalEstimate: s.finalEstimate,
          note: s.note,
          votes: Object.fromEntries(
            Object.entries(s.votes).map(([pid, v]) => {
              const name = pokerSession.participants.find(x => x.id === pid)?.name ?? pid
              return [name, v]
            })
          ),
        })),
      }
      setSessionHistory(prev => {
        const updated = [historyEntry, ...prev].slice(0, HISTORY_MAX)
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
        return updated
      })

      if (changePlannerSource && estimatedStories.length > 0) {
        localStorage.setItem(
          'change-planner:pendingEstimates',
          JSON.stringify({
            initiativeId: changePlannerSource.initiativeId,
            date: new Date().toISOString(),
            stories: estimatedStories.map(s => ({ title: s.title, estimate: s.finalEstimate ?? '' })),
          })
        )
      }
    }
    setPokerSession(null)
    setPhase('home')
  }

  const handleTeamSessionEnd = (
    results: { title: string; finalEstimate: string | null }[],
    deckType: DeckType,
  ) => {
    const estimated = results.filter(s => s.finalEstimate !== null)
    if (estimated.length > 0) {
      localStorage.setItem('sprintMetrics_planningPoker', JSON.stringify(estimated))
    }
    const numericEstimates = estimated
      .map(s => (s.finalEstimate === '½' ? 0.5 : parseFloat(s.finalEstimate ?? '')))
      .filter(n => !isNaN(n))
    const avgPoints =
      numericEstimates.length > 0
        ? Math.round((numericEstimates.reduce((a, b) => a + b, 0) / numericEstimates.length) * 10) / 10
        : null
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(
      'planning-poker:lastSession',
      JSON.stringify({
        sessionName: t('home.start_team'),
        deckType,
        storyCount: results.length,
        estimatedCount: estimated.length,
        avgPoints,
        date: today,
      }),
    )
    const historyEntry: SessionHistoryEntry = {
      id: crypto.randomUUID(),
      name: t('home.start_team'),
      date: today,
      deckType,
      storyCount: results.length,
      estimatedCount: estimated.length,
      avgPoints,
      stories: results.map(s => ({
        id: crypto.randomUUID(),
        title: s.title,
        finalEstimate: s.finalEstimate,
        votes: {},
      })),
    }
    setSessionHistory(prev => {
      const updated = [historyEntry, ...prev].slice(0, HISTORY_MAX)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
      return updated
    })

    if (changePlannerSource && estimated.length > 0) {
      localStorage.setItem(
        'change-planner:pendingEstimates',
        JSON.stringify({
          initiativeId: changePlannerSource.initiativeId,
          date: new Date().toISOString(),
          stories: estimated.map(s => ({ title: s.title, estimate: s.finalEstimate ?? '' })),
        })
      )
    }
    setPhase('home')
  }

  const deckOptions: { value: DeckType; labelKey: string }[] = [
    { value: 'fibonacci', labelKey: 'setup.deck_fibonacci' },
    { value: 'tshirt',    labelKey: 'setup.deck_tshirt' },
    { value: 'powers2',   labelKey: 'setup.deck_powers2' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950" data-accent="pink">
      <AppHeader
        title={t('app.title')}
        onTitleClick={() => setPhase('home')}
        navItems={[
          { key: 'learn', label: t('learn.title'), active: phase === 'learn', onClick: () => setPhase('learn') },
          ...(sessionHistory.length > 0
            ? [{ key: 'history', label: t('history.title'), active: phase === 'history', onClick: () => setPhase('history') }]
            : []),
        ]}
      >
        <ThemeToggle />
      </AppHeader>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {phase === 'home' && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🃏</div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">{t('home.headline')}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t('home.subheadline')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              <button
                type="button"
                onClick={() => setPhase('setup')}
                className="group flex flex-col items-start gap-2 p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border-2 border-transparent hover:border-brand-500 dark:border-gray-700 dark:hover:border-brand-500 transition-all text-left"
              >
                <span className="text-3xl">🎯</span>
                <span className="font-semibold text-gray-900 dark:text-white text-lg">{t('home.start_practice')}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('home.solo_desc')}</span>
              </button>

              <div className="flex flex-col gap-2">
                <span className="font-semibold text-gray-900 dark:text-white text-lg px-1">🤝 {t('home.team_label')}</span>
                <button
                  type="button"
                  onClick={firebaseReady ? () => { setTeamEntryMode('host'); setPhase('team') } : undefined}
                  disabled={!firebaseReady}
                  className="flex flex-col items-start gap-1 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border-2 border-transparent enabled:hover:border-brand-500 dark:border-gray-700 dark:enabled:hover:border-brand-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">{t('home.host_team')}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('home.host_desc')}</span>
                </button>
                <button
                  type="button"
                  onClick={firebaseReady ? () => { setTeamEntryMode('join'); setPhase('team') } : undefined}
                  disabled={!firebaseReady}
                  className="flex flex-col items-start gap-1 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border-2 border-transparent enabled:hover:border-brand-500 dark:border-gray-700 dark:enabled:hover:border-brand-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">{t('home.join_team')}</span>
                </button>
                {!firebaseReady && (
                  <p className="text-xs text-gray-400 dark:text-gray-600 px-1">{t('home.team_note')}</p>
                )}
              </div>
            </div>

            <div className="card mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{t('home.why_title')}</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{t('home.why_body')}</p>
            </div>
            <div className="card mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('home.cards_title')}</h2>
              <div className="space-y-1">
                {DECKS.fibonacci.map(v => (
                  <div key={v} className="flex items-center gap-3 text-sm">
                    <span className="w-8 h-11 border border-gray-300 dark:border-gray-600 rounded-md flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 shrink-0 text-xs">
                      {v}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">{t(`cards.${cardKey(v)}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === 'setup' && (
          <div className="max-w-md mx-auto card">
            <h1 className="font-semibold text-gray-900 dark:text-white text-xl mb-5">{t('setup.title')}</h1>
            <div className="space-y-4">
              {deeplinkedStories.length > 0 ? (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700/50 rounded-lg px-3 py-2">
                    <span className="text-brand-600 dark:text-brand-400">🔗</span>
                    <span className="text-brand-700 dark:text-brand-300">
                      {t('setup.deeplink_banner', { count: deeplinkedStories.length })}
                    </span>
                  </div>
                  <label className="label">{t('setup.stories_label')}</label>
                  <ul className="space-y-1.5">
                    {deeplinkedStories.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 bg-gray-100 dark:bg-gray-700/40 rounded-lg px-3 py-2"
                      >
                        <span className="text-gray-400 dark:text-gray-500 text-xs mt-0.5 shrink-0">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{s.title}</p>
                          {s.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.description}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDeeplinkStory(i)}
                          title={t('setup.remove_story')}
                          aria-label={t('setup.remove_story')}
                          className="text-gray-400 dark:text-gray-500 hover:text-red-400 text-xs shrink-0 mt-0.5"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
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
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">{t('setup.participants_label')}</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={importFromTeamIdentity}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                    >
                      {t('setup.import_team')}
                    </button>
                    {importTooltip && (
                      <div className="absolute right-0 top-6 z-10 w-64 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 shadow-lg">
                        {importTooltip}
                        <button
                          type="button"
                          onClick={() => setImportTooltip('')}
                          aria-label={t('common.close')}
                          className="ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <textarea
                  className="input resize-none"
                  rows={4}
                  placeholder={t('setup.participants_placeholder')}
                  value={participantsText}
                  onChange={e => setParticipantsText(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t('setup.deck_label')}</label>
                <div className="flex gap-2">
                  {deckOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedDeck(opt.value)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        selectedDeck === opt.value
                          ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200'
                          : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {DECKS[selectedDeck].slice(0, -2).join(' · ')}
                </p>
              </div>
              <div>
                <label className="label">{t('setup.timer_label')}</label>
                <div className="flex gap-2">
                  {([null, 30, 60, 90] as Array<number | null>).map(val => (
                    <button
                      key={val ?? 'off'}
                      type="button"
                      onClick={() => setSelectedTimer(val)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        selectedTimer === val
                          ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200'
                          : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      {val === null ? t('setup.timer_off') : t(`setup.timer_${val}s`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPhase('home')} className="btn-secondary">
                  {t('setup.back')}
                </button>
                <button
                  type="button"
                  onClick={startSession}
                  disabled={deeplinkedStories.length === 0 && !currentStory.trim()}
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

        {phase === 'team' && (
          <TeamSession
            onBack={() => setPhase('home')}
            onSessionEnd={handleTeamSessionEnd}
            initialMode={teamEntryMode}
          />
        )}

        {phase === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('history.title')}</h1>
              <div className="flex gap-2">
                {sessionHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSessionHistory([])
                      localStorage.removeItem(HISTORY_KEY)
                      setExpandedSession(null)
                      setPhase('home')
                    }}
                    className="btn-secondary text-sm"
                  >
                    {t('history.clear')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPhase('setup')}
                  className="btn-primary text-sm"
                >
                  {t('history.new_session')}
                </button>
              </div>
            </div>
            {sessionHistory.length === 0 ? (
              <div className="card text-center py-10 text-gray-500 dark:text-gray-400">
                {t('history.no_history')}
              </div>
            ) : (
              <div className="space-y-3">
                {sessionHistory.map(entry => (
                  <div key={entry.id} className="card">
                    <button
                      type="button"
                      onClick={() => setExpandedSession(expandedSession === entry.id ? null : entry.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white">{entry.name}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{entry.date}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {t(`setup.deck_${entry.deckType}`)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {t('history.story_count', { count: entry.estimatedCount, total: entry.storyCount })}
                            </span>
                            {entry.avgPoints !== null && (
                              <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                                {t('history.avg', { avg: entry.avgPoints })}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-gray-400 dark:text-gray-500 text-sm shrink-0 mt-0.5">
                          {expandedSession === entry.id ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>
                    {expandedSession === entry.id && (
                      <div className="mt-4 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                        {entry.stories.map(story => (
                          <div key={story.id} className="flex items-start gap-3">
                            <div className="w-10 h-14 rounded-lg border-2 border-brand-300 dark:border-brand-600 bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center text-sm font-bold text-brand-700 dark:text-brand-300 shrink-0">
                              {story.finalEstimate ?? '—'}
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{story.title}</p>
                              {story.note && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{story.note}</p>
                              )}
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {Object.entries(story.votes).map(([name, vote]) => (
                                  <span key={name} className="text-xs text-gray-500 dark:text-gray-400">
                                    {name}: <strong className="text-gray-700 dark:text-gray-200">{vote}</strong>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('learn.title')}</h1>
            {[
              { title: t('learn.fibonacci_title'), body: t('learn.fibonacci_body') },
              { title: t('learn.wideband_title'), body: t('learn.wideband_body') },
            ].map(s => (
              <div key={s.title} className="card">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{s.title}</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
            <div className="card">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('learn.tips_title')}</h2>
              <ul className="space-y-2">
                {['tip1', 'tip2', 'tip3', 'tip4', 'tip5'].map(tip => (
                  <li key={tip} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-brand-500 dark:text-brand-400">→</span>
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
