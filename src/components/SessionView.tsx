import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import html2canvas from 'html2canvas'
import type { PokerSession, CardValue } from '../types'
import { DECKS } from '../types'

function cardKey(v: CardValue): string {
  if (v === '½') return 'half'
  if (v === '☕') return 'coffee'
  return v
}

interface Props {
  session: PokerSession
  onChange: (s: PokerSession) => void
  onBack: () => void
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function numericVotes(votes: string[]): number[] {
  return votes.map(v => (v === '½' ? 0.5 : parseFloat(v))).filter(n => !isNaN(n))
}

const VELOCITY_DISMISS_KEY = 'planning-poker:velocityHintDismissed'

/** Reads trailing 3-sprint avg velocity from Sprint Metrics' localStorage; null if unavailable or < 3 sprints. */
function readTrailingVelocity(): number | null {
  try {
    let sprints: { completed?: number }[] | null = null
    const projectsRaw = localStorage.getItem('sprint-metrics-projects')
    if (projectsRaw) {
      const projects: { id: string; sprints?: { completed?: number }[] }[] = JSON.parse(projectsRaw)
      const activeId = localStorage.getItem('sprint-metrics-active-project')
      const project = projects.find(p => p.id === activeId) ?? projects[0]
      sprints = project?.sprints ?? null
    }
    if (!sprints) {
      const legacyRaw = localStorage.getItem('sprint-metrics-sprints')
      if (legacyRaw) sprints = JSON.parse(legacyRaw)
    }
    if (!sprints || sprints.length < 3) return null
    const last3 = sprints.slice(-3)
    const avg = last3.reduce((sum, s) => sum + (s.completed ?? 0), 0) / last3.length
    return Math.round(avg * 10) / 10
  } catch {
    return null
  }
}

const KBD_CLASS = 'inline-block px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300'

export default function SessionView({ session, onChange, onBack }: Props) {
  const { t } = useTranslation()
  const deckValues = DECKS[session.deckType] ?? DECKS.fibonacci
  const isFibonacci = session.deckType === 'fibonacci'
  const cardTitle = (v: CardValue) => isFibonacci ? t(`cards.${cardKey(v)}`) : v
  const [participantInput, setParticipantInput] = useState('')
  const [storyInput, setStoryInput] = useState('')
  const [storyDesc, setStoryDesc] = useState('')
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [addingStory, setAddingStory] = useState(false)
  const [copied, setCopied] = useState(false)
  const [recentVotes, setRecentVotes] = useState<Set<string>>(new Set())
  const [revealAnimating, setRevealAnimating] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(session.timerDuration ?? null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [draggedStoryId, setDraggedStoryId] = useState<string | null>(null)
  const [dragOverStoryId, setDragOverStoryId] = useState<string | null>(null)
  const [velocityHint, setVelocityHint] = useState<number | null>(null)
  const [velocityHintDismissed, setVelocityHintDismissed] = useState(false)
  const resultsCardRef = useRef<HTMLDivElement>(null)
  const firstCardRef = useRef<HTMLButtonElement>(null)

  // One-time read at session start; dismissal resets for each new session.
  useEffect(() => {
    localStorage.removeItem(VELOCITY_DISMISS_KEY)
    setVelocityHintDismissed(false)
    setVelocityHint(readTrailingVelocity())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function dismissVelocityHint() {
    setVelocityHintDismissed(true)
    localStorage.setItem(VELOCITY_DISMISS_KEY, '1')
  }

  // Reset timer when story changes or is revealed
  useEffect(() => {
    if (session.revealed) {
      setTimeLeft(null)
    } else {
      setTimeLeft(session.timerDuration ?? null)
    }
  }, [session.currentStoryId, session.revealed, session.timerDuration])

  // Countdown tick — schedules one decrement per second using setTimeout
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || session.revealed) return
    const id = setTimeout(() => setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : prev)), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, session.revealed])

  // Auto-reveal when timer expires and there are votes
  useEffect(() => {
    if (timeLeft === 0 && !session.revealed) {
      const hasVotes = session.currentStoryId
        ? Object.keys(
            session.stories.find(s => s.id === session.currentStoryId)?.votes ?? {}
          ).length > 0
        : false
      if (hasVotes) reveal()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  const currentStory = session.stories.find(s => s.id === session.currentStoryId) ?? null
  const estimatedStories = session.stories.filter(s => s.finalEstimate !== null)

  function update(patch: Partial<PokerSession>) {
    onChange({ ...session, ...patch })
  }

  function addParticipant() {
    const name = participantInput.trim()
    if (!name) return
    update({
      participants: [
        ...session.participants,
        { id: crypto.randomUUID(), name, vote: null },
      ],
    })
    setParticipantInput('')
    setAddingParticipant(false)
  }

  function removeParticipant(id: string) {
    update({ participants: session.participants.filter(p => p.id !== id) })
  }

  function addStory() {
    const title = storyInput.trim()
    if (!title) return
    const story = {
      id: crypto.randomUUID(),
      title,
      description: storyDesc.trim() || undefined,
      finalEstimate: null as CardValue | null,
      votes: {} as Record<string, CardValue>,
    }
    const newStories = [...session.stories, story]
    update({
      stories: newStories,
      currentStoryId: session.currentStoryId ?? story.id,
    })
    setStoryInput('')
    setStoryDesc('')
    setAddingStory(false)
  }

  function selectStory(id: string) {
    update({ currentStoryId: id, revealed: false })
  }

  // Reorders the pending-story queue only; already-estimated stories keep their slot.
  function reorderStories(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    const pending = session.stories.filter(s => s.finalEstimate === null)
    const fromIdx = pending.findIndex(s => s.id === draggedId)
    const toIdx = pending.findIndex(s => s.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const reorderedPending = [...pending]
    const [moved] = reorderedPending.splice(fromIdx, 1)
    reorderedPending.splice(toIdx, 0, moved)
    let cursor = 0
    const newStories = session.stories.map(s =>
      s.finalEstimate === null ? reorderedPending[cursor++] : s
    )
    update({ stories: newStories })
  }

  function castVote(participantId: string, value: CardValue) {
    if (!currentStory || session.revealed) return
    const updatedStories = session.stories.map(s =>
      s.id === currentStory.id
        ? { ...s, votes: { ...s.votes, [participantId]: value } }
        : s
    )
    const updatedParticipants = session.participants.map(p =>
      p.id === participantId ? { ...p, vote: value } : p
    )
    update({ stories: updatedStories, participants: updatedParticipants })
    setRecentVotes(prev => new Set([...prev, participantId]))
    setTimeout(() => {
      setRecentVotes(prev => {
        const next = new Set(prev)
        next.delete(participantId)
        return next
      })
    }, 500)
  }

  function reveal() {
    setRevealAnimating(true)
    update({ revealed: true })
    setTimeout(() => setRevealAnimating(false), 1500)
  }

  function resetVotes() {
    if (!currentStory) return
    const updatedStories = session.stories.map(s =>
      s.id === currentStory.id ? { ...s, votes: {} } : s
    )
    const updatedParticipants = session.participants.map(p => ({ ...p, vote: null }))
    update({ stories: updatedStories, participants: updatedParticipants, revealed: false })
    setRevealAnimating(false)
  }

  function setFinalEstimate(value: CardValue) {
    if (!currentStory) return
    const updatedStories = session.stories.map(s =>
      s.id === currentStory.id ? { ...s, finalEstimate: value } : s
    )
    update({ stories: updatedStories })
  }

  function nextStory() {
    const remaining = session.stories.filter(s => s.finalEstimate === null)
    const next = remaining[0] ?? null
    const updatedParticipants = session.participants.map(p => ({ ...p, vote: null }))
    update({
      currentStoryId: next?.id ?? null,
      revealed: false,
      participants: updatedParticipants,
    })
  }

  function copyResults() {
    const date = new Date().toISOString().slice(0, 10)
    const deckLabel = session.deckType === 'fibonacci' ? 'Fibonacci' : session.deckType === 'tshirt' ? 'T-Shirt' : 'Powers of 2'
    const header = `${session.name} — ${deckLabel} — ${date}`
    const separator = `${'—'.repeat(32)}|${'—'.repeat(8)}`
    const rows = estimatedStories.flatMap(s => {
      const title = s.title.length > 32 ? s.title.slice(0, 29) + '...' : s.title.padEnd(32)
      const line = `${title}| ${s.finalEstimate}`
      return s.note ? [line, `  Note: ${s.note}`] : [line]
    })
    const text = [header, `${'Story'.padEnd(32)}| Estimate`, separator, ...rows].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function saveImage() {
    if (!resultsCardRef.current) return
    const canvas = await html2canvas(resultsCardRef.current, { backgroundColor: null, scale: 2 })
    const link = document.createElement('a')
    link.download = `${session.name.replace(/\s+/g, '-')}-results.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const voteValues = currentStory ? Object.values(currentStory.votes) : []
  const numVotes = numericVotes(voteValues as string[])
  const avg = numVotes.length ? numVotes.reduce((a, b) => a + b, 0) / numVotes.length : null
  const med = numVotes.length ? median(numVotes) : null
  const consensus = numVotes.length > 0 && new Set(voteValues).size === 1
  const spread = numVotes.length >= 2 ? Math.max(...numVotes) - Math.min(...numVotes) : null

  // Move focus to first card button when story changes (keyboard navigation aid)
  useEffect(() => {
    if (!session.revealed && session.currentStoryId && firstCardRef.current) {
      firstCardRef.current.focus()
    }
  }, [session.currentStoryId, session.revealed])

  // Global keyboard shortcuts — only active when focus is not in a text field
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '?') { setShowShortcuts(v => !v); return }
      if (e.key === 'Escape') { setShowShortcuts(false); return }
      if (!currentStory) return
      if (e.key === 'Enter' && !session.revealed && voteValues.length > 0) { reveal(); return }
      if (e.key === 'ArrowRight' && session.revealed) { nextStory(); return }
      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) { resetVotes(); return }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStory, session.revealed, voteValues.length])

  return (
    <div className="space-y-6">
      {/* Keyboard shortcut legend overlay */}
      {showShortcuts && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('session.shortcuts_title')}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowShortcuts(false)}
        >
          <div className="card max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">{t('session.shortcuts_title')}</h2>
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                aria-label={t('common.close')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-600 dark:text-gray-300">{t('session.shortcut_reveal')}</dt>
                <dd><kbd className={KBD_CLASS}>Enter</kbd></dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-600 dark:text-gray-300">{t('session.shortcut_next')}</dt>
                <dd><kbd className={KBD_CLASS}>→</kbd></dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-600 dark:text-gray-300">{t('session.shortcut_reset')}</dt>
                <dd><kbd className={KBD_CLASS}>R</kbd></dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-600 dark:text-gray-300">{t('session.shortcut_help')}</dt>
                <dd><kbd className={KBD_CLASS}>?</kbd></dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="btn-ghost text-sm">
          ← {t('session.back')}
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex-1 truncate">{session.name}</h1>
      </div>

      {velocityHint !== null && !velocityHintDismissed && (
        <div className="flex items-center gap-2 text-sm bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full px-3 py-1.5 w-fit">
          <span>{t('session.velocity_hint', { n: velocityHint })}</span>
          <button
            type="button"
            onClick={dismissVelocityHint}
            aria-label={t('session.velocity_hint_dismiss')}
            className="text-brand-500 hover:text-brand-700 dark:hover:text-brand-100 leading-none"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{t('session.addParticipant')}</h2>
              <button
                type="button"
                onClick={() => setAddingParticipant(v => !v)}
                aria-label={t('session.addParticipant')}
                className="text-xs bg-brand-50 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900 px-2 py-1 rounded font-medium"
              >
                +
              </button>
            </div>
            {addingParticipant && (
              <div className="flex gap-2 mb-3">
                <input
                  autoFocus
                  className="input flex-1"
                  type="text"
                  value={participantInput}
                  placeholder={t('session.participantName')}
                  onChange={e => setParticipantInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addParticipant()}
                />
                <button type="button" onClick={addParticipant} className="btn-primary text-sm">
                  {t('common.add')}
                </button>
              </div>
            )}
            {session.participants.length === 0 ? (
              <p className="text-xs text-gray-500">{t('session.noParticipants')}</p>
            ) : (
              <ul className="space-y-1">
                {session.participants.map((p, pIdx) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200">{p.name}</span>
                    <div className="flex items-center gap-2">
                      {currentStory && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded inline-block ${
                            currentStory.votes[p.id]
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                          } ${session.revealed && revealAnimating && currentStory.votes[p.id] ? 'pp-reveal-flip' : ''}`}
                          style={
                            session.revealed && revealAnimating && currentStory.votes[p.id]
                              ? { animationDelay: `${pIdx * 50}ms` }
                              : undefined
                          }
                        >
                          {currentStory.votes[p.id]
                            ? session.revealed
                              ? currentStory.votes[p.id]
                              : t('session.voted')
                            : t('session.waiting')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeParticipant(p.id)}
                        aria-label={`${t('session.removeParticipant')} ${p.name}`}
                        title={`${t('session.removeParticipant')} ${p.name}`}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-400 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{t('session.addStory')}</h2>
              <button
                type="button"
                onClick={() => setAddingStory(v => !v)}
                aria-label={t('session.addStory')}
                className="text-xs bg-brand-50 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900 px-2 py-1 rounded font-medium"
              >
                +
              </button>
            </div>
            {addingStory && (
              <div className="space-y-2 mb-3">
                <input
                  autoFocus
                  className="input"
                  type="text"
                  value={storyInput}
                  placeholder={t('session.storyTitlePlaceholder')}
                  onChange={e => setStoryInput(e.target.value)}
                />
                <input
                  className="input"
                  type="text"
                  value={storyDesc}
                  placeholder={t('session.storyDesc')}
                  onChange={e => setStoryDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addStory()}
                />
                <button type="button" onClick={addStory} className="btn-primary w-full text-sm">
                  {t('common.add')}
                </button>
              </div>
            )}
            <ul className="space-y-1">
              {session.stories.filter(s => s.finalEstimate === null).map(s => {
                const isCurrent = s.id === session.currentStoryId
                return (
                  <li
                    key={s.id}
                    draggable={!isCurrent}
                    onDragStart={() => setDraggedStoryId(s.id)}
                    onDragEnd={() => { setDraggedStoryId(null); setDragOverStoryId(null) }}
                    onDragOver={e => {
                      if (!draggedStoryId) return
                      e.preventDefault()
                      setDragOverStoryId(s.id)
                    }}
                    onDrop={e => {
                      e.preventDefault()
                      if (draggedStoryId) reorderStories(draggedStoryId, s.id)
                      setDraggedStoryId(null)
                      setDragOverStoryId(null)
                    }}
                    className={`flex items-center gap-1 rounded transition-colors ${
                      dragOverStoryId === s.id && draggedStoryId && draggedStoryId !== s.id
                        ? 'bg-brand-50 dark:bg-brand-900/30 ring-1 ring-brand-300 dark:ring-brand-600'
                        : ''
                    } ${draggedStoryId === s.id ? 'opacity-40' : ''}`}
                  >
                    {!isCurrent && (
                      <span
                        aria-hidden="true"
                        className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 px-0.5 select-none"
                      >
                        ⠿
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => selectStory(s.id)}
                      className={`flex-1 text-left text-sm px-2 py-1.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        isCurrent
                          ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200 font-medium'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      {s.title}
                    </button>
                  </li>
                )
              })}
              {session.stories.filter(s => s.finalEstimate === null).length === 0 && (
                <li className="text-xs text-gray-500">{t('session.noCurrentStory')}</li>
              )}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!currentStory ? (
            <div className="card text-center text-gray-400 py-8">{t('session.noCurrentStory')}</div>
          ) : (
            <>
              <div className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-900 dark:text-white">{currentStory.title}</h2>
                    {currentStory.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentStory.description}</p>
                    )}
                  </div>
                  {!session.revealed && timeLeft !== null && (
                    <div
                      className={`shrink-0 font-mono font-bold tabular-nums text-lg px-3 py-1 rounded-lg border-2 transition-colors ${
                        timeLeft > 10
                          ? 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50'
                          : timeLeft > 5
                          ? 'border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30'
                          : 'border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 animate-pulse'
                      }`}
                      aria-label={t('session.timer_label')}
                      aria-live="polite"
                    >
                      {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                    </div>
                  )}
                </div>
              </div>

              {session.participants.map((participant, participantIdx) => (
                <div key={participant.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{participant.name}</span>
                    {currentStory.votes[participant.id] && !session.revealed && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                        {t('session.voted')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={participant.name}>
                    {deckValues.map((v, cardIdx) => {
                      const isSelected = currentStory.votes[participant.id] === v
                      const justVoted = isSelected && !session.revealed && recentVotes.has(participant.id)
                      const isFirstCard = participantIdx === 0 && cardIdx === 0
                      return (
                        <button
                          key={v}
                          ref={isFirstCard ? firstCardRef : undefined}
                          type="button"
                          onClick={() => castVote(participant.id, v)}
                          disabled={session.revealed}
                          aria-pressed={isSelected}
                          title={cardTitle(v)}
                          aria-label={`${cardTitle(v)}`}
                          className={`w-10 h-14 border-2 rounded-lg font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 ${
                            isSelected
                              ? `border-brand-400 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200 scale-105 shadow${justVoted ? ' pp-vote-ring' : ''}`
                              : session.revealed
                                ? 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-default'
                                : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-brand-300 dark:hover:border-brand-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          {v}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 items-center">
                {!session.revealed ? (
                  <button
                    type="button"
                    onClick={reveal}
                    disabled={voteValues.length === 0}
                    aria-keyshortcuts="Enter"
                    className="btn-primary disabled:opacity-40"
                  >
                    {t('session.reveal')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextStory}
                    aria-keyshortcuts="ArrowRight"
                    className="btn-primary bg-green-600 hover:bg-green-700"
                  >
                    {t('session.nextStory')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetVotes}
                  aria-keyshortcuts="r"
                  className="btn-secondary"
                >
                  {t('session.resetVotes')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowShortcuts(v => !v)}
                  aria-label={t('session.shortcut_help')}
                  aria-expanded={showShortcuts}
                  className="ml-auto text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm font-mono border border-gray-200 dark:border-gray-600 rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  ?
                </button>
              </div>

              {session.revealed && voteValues.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">{t('session.statistics')}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('session.average')}</div>
                      <div className="font-bold text-gray-900 dark:text-white">{avg !== null ? avg.toFixed(1) : '—'}</div>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('session.median')}</div>
                      <div className="font-bold text-gray-900 dark:text-white">{med !== null ? String(med) : '—'}</div>
                    </div>
                    <div className={`bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 text-center${consensus ? ' pp-consensus-glow' : ''}`}>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('session.consensus')}</div>
                      <div className={`font-bold ${consensus ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {consensus ? t('session.yes') : t('session.no')}
                      </div>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('session.spread')}</div>
                      <div className="font-bold text-gray-900 dark:text-white">{spread !== null ? String(spread) : '—'}</div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('session.finalEstimate')}</p>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('session.finalEstimate')}>
                      {deckValues.map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setFinalEstimate(v)}
                          aria-pressed={currentStory.finalEstimate === v}
                          title={cardTitle(v)}
                          aria-label={`${cardTitle(v)}`}
                          className={`w-10 h-14 border-2 rounded-lg font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 ${
                            currentStory.finalEstimate === v
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 scale-105 shadow'
                              : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {currentStory.finalEstimate && (
                    <textarea
                      className="input resize-none w-full text-sm mt-1"
                      rows={2}
                      maxLength={200}
                      placeholder={t('session.story_note_placeholder')}
                      value={currentStory.note ?? ''}
                      onChange={e => {
                        const note = e.target.value
                        update({
                          stories: session.stories.map(s =>
                            s.id === currentStory.id ? { ...s, note } : s
                          ),
                        })
                      }}
                    />
                  )}
                </div>
              )}
            </>
          )}

          {estimatedStories.length > 0 && (
            <div className="card" ref={resultsCardRef}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t('session.history')}</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyResults}
                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 px-2.5 py-1 rounded font-medium transition-colors"
                  >
                    {copied ? t('results.copied') : t('results.copyResults')}
                  </button>
                  <button
                    type="button"
                    onClick={saveImage}
                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 px-2.5 py-1 rounded font-medium transition-colors"
                  >
                    {t('results.saveImage')}
                  </button>
                </div>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {estimatedStories.map(s => (
                    <tr key={s.id}>
                      <td className="py-2 pr-2">
                        <p className="text-gray-800 dark:text-gray-200">{s.title}</p>
                        {s.note && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs">{s.note}</p>
                        )}
                      </td>
                      <td className="py-2 text-right align-top">
                        <span className="bg-brand-50 dark:bg-brand-900/50 text-brand-700 dark:text-brand-200 font-bold px-2 py-0.5 rounded">
                          {s.finalEstimate}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
