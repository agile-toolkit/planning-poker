import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ref, set, update, onValue, get } from 'firebase/database'
import { getFirebaseDb } from '../firebase'
import type { CardValue, DeckType } from '../types'
import { DECKS } from '../types'
import { QRCodeSVG } from 'qrcode.react'
import { parseJoinPinParam } from '../deeplink'
import { claimSession, releaseSession, sessionPath, isReclaimable } from '../session'

function buildJoinUrl(pin: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('joinPin', pin)
  return url.toString()
}

interface FirebaseParticipant {
  name: string
  isHost: boolean
  isObserver?: boolean
}

interface FirebaseStory {
  title: string
  order: number
  votes: Record<string, string>
  finalEstimate?: string
}

interface FirebaseSession {
  phase: 'lobby' | 'voting' | 'revealed'
  deck: DeckType
  hostId: string
  participants: Record<string, FirebaseParticipant>
  currentStory: string
  stories: Record<string, FirebaseStory>
  blindMode?: boolean
  /** Set by the server on create; drives the 24h TTL in the security rules. */
  createdAt?: number
}

interface Props {
  onBack: () => void
  onSessionEnd: (
    results: { title: string; finalEstimate: string | null }[],
    deckType: DeckType,
  ) => void
  initialMode: 'host' | 'join'
}

const deckOptions: { value: DeckType; labelKey: string }[] = [
  { value: 'fibonacci', labelKey: 'setup.deck_fibonacci' },
  { value: 'tshirt',    labelKey: 'setup.deck_tshirt' },
  { value: 'powers2',   labelKey: 'setup.deck_powers2' },
]

export default function TeamSession({ onBack, onSessionEnd, initialMode }: Props) {
  const { t } = useTranslation()
  const [joinPin, setJoinPin] = useState(parseJoinPinParam)
  // A join-link (?joinPin=...) always means "join," regardless of which
  // button the user came in through.
  const [mode, setMode] = useState<'host-setup' | 'join-setup' | 'host' | 'participant'>(
    () => (initialMode === 'join' || parseJoinPinParam() ? 'join-setup' : 'host-setup')
  )
  const [name, setName] = useState('')
  const [joinAsObserver, setJoinAsObserver] = useState(false)
  const [pin, setPin] = useState('')
  const [participantId, setParticipantId] = useState('')
  const [selectedDeck, setSelectedDeck] = useState<DeckType>('fibonacci')
  const [blindMode, setBlindMode] = useState(false)
  const [session, setSession] = useState<FirebaseSession | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [newStoryTitle, setNewStoryTitle] = useState('')
  const [finalEstimate, setFinalEstimate] = useState('')
  const [joinError, setJoinError] = useState('')
  const [loading, setLoading] = useState(false)

  const db = getFirebaseDb()

  useEffect(() => {
    if (!db || !pin) return
    const unsub = onValue(ref(db, sessionPath(pin)), snap => {
      setSession(snap.val() as FirebaseSession | null)
      setSessionLoaded(true)
    })
    return () => unsub()
  }, [db, pin])

  // Reset final estimate when moving to a new story
  useEffect(() => {
    setFinalEstimate('')
  }, [session?.currentStory])

  const handleHost = async () => {
    if (!db || !name.trim()) return
    setLoading(true)
    setJoinError('')
    const hostId = `host-${crypto.randomUUID().slice(0, 8)}`
    try {
      // claimSession finds a PIN nobody is using. The previous code minted a
      // 4-digit one and wrote straight over whatever was already there.
      const newPin = await claimSession(db, {
        phase: 'lobby',
        deck: selectedDeck,
        hostId,
        participants: { [hostId]: { name: name.trim(), isHost: true } },
        currentStory: '',
        blindMode,
      })
      setPin(newPin)
      setParticipantId(hostId)
      setMode('host')
    } catch {
      setJoinError(t('team.host_error'))
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!db || !name.trim() || !joinPin.trim()) return
    setLoading(true)
    setJoinError('')
    const snap = await get(ref(db, sessionPath(joinPin)))
    // A session past its TTL reads as present but counts as gone, so a
    // recycled PIN never drops a joiner into yesterday's session.
    if (!snap.exists() || isReclaimable(snap.val())) {
      setJoinError(t('team.join_error'))
      setLoading(false)
      return
    }
    const pId = `p-${crypto.randomUUID().slice(0, 8)}`
    await update(ref(db, `${sessionPath(joinPin)}/participants/${pId}`), {
      name: name.trim(),
      isHost: false,
      ...(joinAsObserver ? { isObserver: true } : {}),
    })
    setPin(joinPin)
    setParticipantId(pId)
    setMode('participant')
    setLoading(false)
  }

  const handleStartVoting = async () => {
    if (!db || !pin || !newStoryTitle.trim()) return
    const storyId = `s-${crypto.randomUUID().slice(0, 8)}`
    const storyCount = session ? Object.keys(session.stories ?? {}).length : 0
    await set(ref(db, `${sessionPath(pin)}/stories/${storyId}`), {
      title: newStoryTitle.trim(),
      order: storyCount,
      votes: {},
    })
    await update(ref(db, sessionPath(pin)), { phase: 'voting', currentStory: storyId })
    setNewStoryTitle('')
  }

  const handleVote = async (card: CardValue) => {
    if (!db || !pin || !session || session.phase !== 'voting' || !session.currentStory) return
    await update(
      ref(db, `${sessionPath(pin)}/stories/${session.currentStory}/votes`),
      { [participantId]: card },
    )
  }

  const handleReveal = async () => {
    if (!db || !pin) return
    await update(ref(db, sessionPath(pin)), { phase: 'revealed' })
  }

  const handleNextStory = async () => {
    if (!db || !pin || !session || !finalEstimate) return
    await update(ref(db, `${sessionPath(pin)}/stories/${session.currentStory}`), {
      finalEstimate,
    })
    await update(ref(db, sessionPath(pin)), { phase: 'lobby', currentStory: '' })
  }

  const handleEndSession = async () => {
    if (!db || !pin || !session) return
    const updatedStories = { ...(session.stories ?? {}) }
    if (session.currentStory && finalEstimate) {
      await update(ref(db, `${sessionPath(pin)}/stories/${session.currentStory}`), { finalEstimate })
      updatedStories[session.currentStory] = {
        ...updatedStories[session.currentStory],
        finalEstimate,
      }
    }
    const results = Object.values(updatedStories)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(s => ({ title: s.title, finalEstimate: s.finalEstimate ?? null }))
    // The results are already in hand, so the session in Firebase is spent —
    // drop it rather than leaving it to occupy a PIN and a connection slot
    // until the TTL catches up. Nothing was ever deleted before this.
    if (participantId === session.hostId) await releaseSession(db, pin)
    onSessionEnd(results, session.deck ?? 'fibonacci')
  }

  // ── HOST SETUP ─────────────────────────────────────────────────────────
  if (mode === 'host-setup') {
    return (
      <div className="max-w-sm mx-auto pt-8 space-y-6">
        <div>
          <label className="label">{t('team.enter_name')}</label>
          <input
            autoFocus
            className="input"
            placeholder={t('team.name_placeholder')}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('team.host_heading')}</h2>
          <div>
            <label className="label">{t('setup.deck_label')}</label>
            <div className="flex gap-2">
              {deckOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedDeck(opt.value)}
                  className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-colors ${
                    selectedDeck === opt.value
                      ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200'
                      : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={blindMode}
              onChange={e => setBlindMode(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
            />
            {t('team.blind_mode_label')}
          </label>
          {blindMode && (
            <p className="text-xs text-gray-400 dark:text-gray-600">{t('team.blind_mode_hint')}</p>
          )}
          <button
            type="button"
            onClick={handleHost}
            disabled={!name.trim() || loading}
            className="btn-primary w-full"
          >
            {t('team.host_session')}
          </button>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="w-full text-sm text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
        >
          {t('session.back')}
        </button>
      </div>
    )
  }

  // ── JOIN SETUP ─────────────────────────────────────────────────────────
  if (mode === 'join-setup') {
    return (
      <div className="max-w-sm mx-auto pt-8 space-y-6">
        <div>
          <label className="label">{t('team.enter_name')}</label>
          <input
            autoFocus
            className="input"
            placeholder={t('team.name_placeholder')}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('team.join_heading')}</h2>
          <div>
            <label className="label">{t('team.pin_label')}</label>
            <input
              className="input text-center text-2xl font-mono tracking-widest"
              placeholder="0000"
              value={joinPin}
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={e => { setJoinPin(e.target.value); setJoinError('') }}
            />
            {joinError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{joinError}</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={joinAsObserver}
              onChange={e => setJoinAsObserver(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
            />
            {t('team.join_as_observer')}
          </label>
          <button
            type="button"
            onClick={handleJoin}
            disabled={!name.trim() || !joinPin.trim() || loading}
            className="btn-secondary w-full"
          >
            {t('team.join_session')}
          </button>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="w-full text-sm text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
        >
          {t('session.back')}
        </button>
      </div>
    )
  }

  // Loading state before first snapshot
  if (!sessionLoaded) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-gray-400 dark:text-gray-600">
        <div className="w-8 h-8 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  // Session gone (e.g. deleted from DB)
  if (!session) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-gray-500 dark:text-gray-400">
        <p>{t('team.join_error')}</p>
        <button type="button" onClick={onBack} className="btn-secondary">
          {t('session.back')}
        </button>
      </div>
    )
  }

  const participants = session.participants ?? {}
  const stories = session.stories ?? {}
  const currentStoryData = session.currentStory ? stories[session.currentStory] : null
  const deck = DECKS[session.deck ?? 'fibonacci']
  const participantEntries = Object.entries(participants)
  const nonHostEntries = participantEntries.filter(([, p]) => !p.isHost)
  const voterEntries = participantEntries.filter(([, p]) => !p.isHost && !p.isObserver)
  const votes = currentStoryData?.votes ?? {}
  const voteCount = Object.keys(votes).filter(id => !participants[id]?.isObserver).length
  const nonHostCount = nonHostEntries.length
  const voterCount = voterEntries.length

  // ── HOST VIEW ──────────────────────────────────────────────────────────
  if (mode === 'host') {
    // Lobby: PIN display + participant list + story input
    if (session.phase === 'lobby') {
      return (
        <div className="max-w-sm mx-auto pt-8 space-y-6">
          <div className="card text-center space-y-3">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('team.pin_label')}
            </p>
            <div className="text-5xl font-mono font-bold text-brand-600 dark:text-brand-400 tracking-widest bg-brand-50 dark:bg-gray-800 px-6 py-3 rounded-2xl inline-block">
              {pin}
            </div>
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="bg-white p-2 rounded-xl inline-block">
                <QRCodeSVG value={buildJoinUrl(pin)} size={128} />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('team.qr_scan_label')}</p>
            </div>
          </div>

          <div className="card space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('team.waiting_for_players')}
            </p>
            {participantEntries.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-600">—</p>
            ) : (
              <ul className="space-y-1">
                {participantEntries.map(([id, p]) => (
                  <li key={id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-brand-500">•</span>
                    {p.name}
                    {p.isHost && (
                      <span className="text-xs text-gray-400 dark:text-gray-600">(host)</span>
                    )}
                    {p.isObserver && !p.isHost && (
                      <span className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-0.5">
                        👁 {t('team.observer_badge')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card space-y-3">
            <label className="label">{t('team.story_label')}</label>
            <input
              className="input"
              placeholder={t('team.story_placeholder')}
              value={newStoryTitle}
              onChange={e => setNewStoryTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleStartVoting() }}
            />
            <button
              type="button"
              onClick={handleStartVoting}
              disabled={!newStoryTitle.trim()}
              className="btn-primary w-full"
            >
              {t('team.start_voting')}
            </button>
          </div>

          <button type="button" onClick={onBack} className="w-full text-sm text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400">
            {t('session.back')}
          </button>
        </div>
      )
    }

    // Voting: story + vote progress + reveal button
    if (session.phase === 'voting') {
      return (
        <div className="max-w-sm mx-auto pt-8 space-y-6">
          <div className="card">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              {t('team.story_label')}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentStoryData?.title ?? '—'}
            </p>
          </div>

          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('team.vote_progress', { done: voteCount, total: voterCount || participantEntries.length })}
                {voterCount < nonHostCount && (
                  <span className="ml-1 text-xs text-gray-400 dark:text-gray-600">({t('team.voters_only')})</span>
                )}
              </p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                voteCount > 0 && voteCount >= (voterCount || participantEntries.length)
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {voteCount > 0 && voteCount >= (voterCount || participantEntries.length) ? '✓ All voted' : t('team.waiting_for_votes')}
              </span>
            </div>
            <ul className="space-y-1">
              {participantEntries.map(([id, p]) => (
                <li key={id} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span className="flex items-center gap-1.5">
                    {p.name}
                    {p.isObserver && !p.isHost && (
                      <span className="text-xs text-gray-400 dark:text-gray-600">👁</span>
                    )}
                  </span>
                  {p.isObserver ? (
                    <span className="text-xs text-gray-400 dark:text-gray-600">{t('team.observer_badge')}</span>
                  ) : (
                    <span className={`text-xs ${votes[id] ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}>
                      {votes[id] ? t('team.voted_badge') : '…'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={handleReveal}
            className="btn-primary w-full"
          >
            {t('team.reveal')}
          </button>
        </div>
      )
    }

    // Revealed: votes + final estimate picker + next/end
    if (session.phase === 'revealed') {
      const sortedVotes = participantEntries.map(([id, p]) => ({
        name: p.name,
        vote: votes[id] ?? null,
      }))
      return (
        <div className="max-w-sm mx-auto pt-8 space-y-6">
          <div className="card">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              {currentStoryData?.title ?? '—'}
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              {sortedVotes.map(({ name: n, vote }) => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-14 rounded-lg border-2 border-brand-300 dark:border-brand-600 bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center text-sm font-bold text-brand-700 dark:text-brand-300">
                    {vote ?? '—'}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 max-w-[44px] truncate text-center">
                    {n}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('team.final_estimate')}</p>
            <div className="flex flex-wrap gap-2">
              {deck.map(card => (
                <button
                  key={card}
                  type="button"
                  onClick={() => setFinalEstimate(card)}
                  aria-pressed={finalEstimate === card}
                  className={`w-10 h-14 rounded-lg border-2 text-sm font-bold transition-colors ${
                    finalEstimate === card
                      ? 'border-brand-500 bg-brand-500 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-gray-900'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-brand-400 dark:hover:border-brand-500'
                  }`}
                >
                  {card}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleNextStory}
              disabled={!finalEstimate}
              className="btn-secondary flex-1"
            >
              {t('team.next_story')}
            </button>
            <button
              type="button"
              onClick={handleEndSession}
              className="btn-primary flex-1"
            >
              {t('team.end_session')}
            </button>
          </div>
        </div>
      )
    }
  }

  // ── PARTICIPANT VIEW ───────────────────────────────────────────────────
  if (mode === 'participant') {
    const myVote = currentStoryData?.votes?.[participantId] ?? null

    if (session.phase === 'lobby') {
      return (
        <div className="flex flex-col items-center gap-4 pt-16 text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">{t('team.waiting_for_players')}</p>
          <p className="text-sm">{t('team.pin_label')}: <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{pin}</span></p>
          <button type="button" onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400">
            {t('session.back')}
          </button>
        </div>
      )
    }

    if (session.phase === 'voting') {
      if (participants[participantId]?.isObserver) {
        return (
          <div className="max-w-sm mx-auto pt-8 space-y-6">
            <div className="card">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                {t('team.story_label')}
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentStoryData?.title ?? '—'}
              </p>
            </div>
            <div className="card text-center space-y-2 py-6">
              <p className="text-3xl">👁</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('team.observer_badge')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">
                {t('team.vote_progress', { done: voteCount, total: voterCount || participantEntries.length })}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600">{t('team.waiting_for_votes')}</p>
            </div>
          </div>
        )
      }

      return (
        <div className="max-w-sm mx-auto pt-8 space-y-6">
          <div className="card">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              {t('team.story_label')}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentStoryData?.title ?? '—'}
            </p>
          </div>

          {myVote ? (
            <div className="card text-center space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('team.your_vote')}</p>
              <div className="w-16 h-24 rounded-xl border-2 border-brand-400 bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center text-2xl font-bold text-brand-700 dark:text-brand-300 mx-auto">
                {myVote}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">{t('team.voted_badge')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">{t('team.waiting_for_votes')}</p>
            </div>
          ) : (
            <div className="card space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('team.your_vote')}</p>
              <div className="flex flex-wrap gap-2">
                {deck.map(card => (
                  <button
                    key={card}
                    type="button"
                    onClick={() => handleVote(card)}
                    className="w-10 h-14 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-sm font-bold text-gray-700 dark:text-gray-200 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                  >
                    {card}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('team.vote_progress', { done: voteCount, total: voterCount || participantEntries.length })}
            </p>
            <ul className="space-y-1">
              {voterEntries.map(([id, p], idx) => (
                <li key={id} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>{session.blindMode ? t('team.anonymous_voter', { n: idx + 1 }) : p.name}</span>
                  <span className={`text-xs ${votes[id] ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}>
                    {votes[id] ? t('team.voted_badge') : '…'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )
    }

    if (session.phase === 'revealed') {
      const sortedVotes = participantEntries.map(([id, p]) => ({
        name: p.name,
        vote: votes[id] ?? null,
      }))
      return (
        <div className="max-w-sm mx-auto pt-8 space-y-6">
          <div className="card">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              {currentStoryData?.title ?? '—'}
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              {sortedVotes.map(({ name: n, vote }) => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-14 rounded-lg border-2 flex items-center justify-center text-sm font-bold ${
                    n === participants[participantId]?.name
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                  }`}>
                    {vote ?? '—'}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 max-w-[44px] truncate text-center">
                    {n}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-sm text-gray-400 dark:text-gray-600">{t('team.waiting_for_votes')}</p>
        </div>
      )
    }
  }

  return null
}
