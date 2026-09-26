import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { CardValue, DeckType } from '../types'
import { DECKS } from '../types'
import { QRCodeSVG } from 'qrcode.react'
import { parseJoinCodeParam } from '../deeplink'
import { generateRoomCode, normalizeRoomCode, formatRoomCode } from '../live/crypto'
import { useLiveRoom } from '../live/useLiveRoom'
import { pickAlias, aliasLabel, aliasLabels } from '../live/aliases'
import {
  APP_ID, DECK_ORDER, PHASE, isPeerState, findHost, participantsOf, deckFor, cardFor, hasVoted,
  type HostState, type ParticipantState, type PeerState,
} from '../liveSession'
import { EyeIcon, CheckIcon } from './icons'

/** The code rides in the fragment, which browsers never send to a server. */
function buildJoinUrl(code: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = `join=${code}`
  return url.toString()
}

/** How long a joiner waits for a host before calling the code wrong. */
const HOST_WAIT_MS = 12_000

interface Props {
  onBack: () => void
  onSessionEnd: (
    results: { title: string; finalEstimate: string | null }[],
    deckType: DeckType,
  ) => void
  initialMode: 'host' | 'join'
}

/** Host-only: story titles and outcomes never leave the host's device. */
interface LocalStory {
  round: number
  title: string
  finalEstimate: string | null
}

const deckOptions: { value: DeckType; labelKey: string }[] = [
  { value: 'fibonacci', labelKey: 'setup.deck_fibonacci' },
  { value: 'tshirt',    labelKey: 'setup.deck_tshirt' },
  { value: 'powers2',   labelKey: 'setup.deck_powers2' },
]

export default function TeamSession({ onBack, onSessionEnd, initialMode }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language ?? 'en'
  const [joinInput, setJoinInput] = useState(() => formatRoomCode(parseJoinCodeParam()))
  // A join link (#join=...) always means "join," regardless of which button
  // the user came in through.
  const [mode, setMode] = useState<'host-setup' | 'join-setup' | 'host' | 'participant'>(
    () => (initialMode === 'join' || parseJoinCodeParam() ? 'join-setup' : 'host-setup')
  )
  const [code, setCode] = useState<string | null>(null)
  const [joinAsObserver, setJoinAsObserver] = useState(false)
  const [alias] = useState(() => pickAlias())
  const [selectedDeck, setSelectedDeck] = useState<DeckType>('fibonacci')
  const [blindMode, setBlindMode] = useState(false)
  const [joinError, setJoinError] = useState('')

  // Host
  const [hostState, setHostState] = useState<HostState | null>(null)
  const [stories, setStories] = useState<LocalStory[]>([])
  const [newStoryTitle, setNewStoryTitle] = useState('')
  const [finalEstimate, setFinalEstimate] = useState('')

  // Participant: the chosen card stays here until the host reveals its round.
  const [myVote, setMyVote] = useState<{ rd: number; c: number } | null>(null)
  const [hostSeen, setHostSeen] = useState(false)
  const [hostWaitOver, setHostWaitOver] = useState(false)

  const [peersForState, setPeersForState] = useState<ReadonlyMap<string, PeerState>>(new Map())
  const hostForState = mode === 'participant' ? findHost(peersForState)?.[1] ?? null : null

  const myState: PeerState | null =
    mode === 'host' ? hostState
    : mode === 'participant' ? {
        k: 'p',
        a: alias,
        o: joinAsObserver ? 1 : 0,
        rd: myVote?.rd ?? 0,
        v: myVote ? 1 : 0,
        ...(hostForState && hostForState.ph === PHASE.revealed && myVote && myVote.rd === hostForState.rd
          ? { c: myVote.c }
          : {}),
      } satisfies ParticipantState
    : null

  const { status, selfId, peers } = useLiveRoom<PeerState>(code, APP_ID, isPeerState, myState)
  useEffect(() => setPeersForState(peers), [peers])

  const host = findHost(peers)?.[1] ?? null
  useEffect(() => {
    if (host) setHostSeen(true)
  }, [host])

  // A joiner with a mistyped code would otherwise wait forever: give up on
  // finding a host a while after the relays are reachable.
  useEffect(() => {
    if (mode !== 'participant' || status !== 'online' || hostSeen) return
    const timer = setTimeout(() => setHostWaitOver(true), HOST_WAIT_MS)
    return () => clearTimeout(timer)
  }, [mode, status, hostSeen])

  // Reset final estimate when moving to a new round
  useEffect(() => {
    setFinalEstimate('')
  }, [hostState?.rd])

  const handleHost = () => {
    setCode(generateRoomCode())
    setHostState({ k: 'h', ph: PHASE.lobby, rd: 0, dk: DECK_ORDER.indexOf(selectedDeck), bl: blindMode ? 1 : 0 })
    setMode('host')
  }

  const handleJoin = () => {
    const normalized = normalizeRoomCode(joinInput)
    if (!normalized) {
      setJoinError(t('team.code_invalid'))
      return
    }
    setJoinError('')
    setHostSeen(false)
    setHostWaitOver(false)
    setMyVote(null)
    setCode(normalized)
    setMode('participant')
  }

  const handleStartVoting = () => {
    if (!hostState || !newStoryTitle.trim()) return
    const round = hostState.rd + 1
    setStories(s => [...s, { round, title: newStoryTitle.trim(), finalEstimate: null }])
    setHostState({ ...hostState, ph: PHASE.voting, rd: round })
    setNewStoryTitle('')
  }

  const handleVote = (card: CardValue) => {
    if (!host || host.ph !== PHASE.voting) return
    const c = DECKS[deckFor(host)].indexOf(card)
    if (c >= 0) setMyVote({ rd: host.rd, c })
  }

  const handleReveal = () => {
    if (hostState) setHostState({ ...hostState, ph: PHASE.revealed })
  }

  const recordFinal = (list: LocalStory[]) =>
    finalEstimate && hostState
      ? list.map(s => (s.round === hostState.rd ? { ...s, finalEstimate } : s))
      : list

  const handleNextStory = () => {
    if (!hostState || !finalEstimate) return
    setStories(recordFinal)
    setHostState({ ...hostState, ph: PHASE.lobby })
  }

  const handleEndSession = () => {
    if (!hostState) return
    const results = recordFinal(stories).map(s => ({ title: s.title, finalEstimate: s.finalEstimate }))
    // Unmounting closes the room, which says goodbye to every participant.
    onSessionEnd(results, deckFor(hostState))
  }

  // Participant labels: aliases, de-duplicated; self included so numbering is shared.
  const participantEntries = participantsOf(peers)
  const labels = useMemo(() => {
    const entries: [string, number][] = participantEntries.map(([id, p]) => [id, p.a])
    if (mode === 'participant' && selfId) entries.push([selfId, alias])
    return aliasLabels(entries, lang)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peers, selfId, alias, lang, mode])

  const statusBanner = status !== 'online' && (
    <div
      role="status"
      className={`card text-sm ${status === 'unreachable' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
    >
      {status === 'unreachable' ? t('team.unreachable') : t('team.connecting')}
    </div>
  )

  const privacyNote = (
    <p className="text-xs text-gray-400 dark:text-gray-600 text-center">{t('team.privacy_note')}</p>
  )

  // ── HOST SETUP ─────────────────────────────────────────────────────────
  if (mode === 'host-setup') {
    return (
      <div className="max-w-sm mx-auto pt-8 space-y-6">
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
          <button type="button" onClick={handleHost} className="btn-primary w-full">
            {t('team.host_session')}
          </button>
        </div>
        {privacyNote}

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
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('team.join_heading')}</h2>
          <div>
            <label className="label" htmlFor="join-code">{t('team.code_label')}</label>
            <input
              id="join-code"
              autoFocus
              className="input text-center text-xl font-mono tracking-widest uppercase"
              placeholder="XXXXX-XXXXX"
              value={joinInput}
              maxLength={13}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={e => { setJoinInput(e.target.value); setJoinError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
            />
            {joinError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{joinError}</p>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('team.you_are', { alias: aliasLabel(alias, lang) })}
          </p>
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
            disabled={!joinInput.trim()}
            className="btn-secondary w-full"
          >
            {t('team.join_session')}
          </button>
        </div>
        {privacyNote}

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

  const backLink = (
    <button type="button" onClick={onBack} className="w-full text-sm text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400">
      {t('session.back')}
    </button>
  )

  // ── HOST VIEW ──────────────────────────────────────────────────────────
  if (mode === 'host' && hostState && code) {
    const deck = DECKS[deckFor(hostState)]
    const currentTitle = stories.find(s => s.round === hostState.rd)?.title ?? '—'
    const voters = participantEntries.filter(([, p]) => p.o === 0)
    const voteCount = voters.filter(([, p]) => hasVoted(p, hostState)).length
    const allVoted = voters.length > 0 && voteCount >= voters.length

    if (hostState.ph === PHASE.lobby) {
      return (
        <div className="max-w-sm mx-auto pt-8 space-y-6">
          {statusBanner}
          <div className="card text-center space-y-3">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('team.code_label')}
            </p>
            <div className="text-3xl font-mono font-bold text-brand-600 dark:text-brand-400 tracking-widest bg-brand-50 dark:bg-gray-800 px-5 py-3 rounded-2xl inline-block select-all">
              {formatRoomCode(code)}
            </div>
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="bg-white p-2 rounded-xl inline-block">
                <QRCodeSVG value={buildJoinUrl(code)} size={128} />
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
                    {labels.get(id)}
                    {p.o === 1 && (
                      <span className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1">
                        <EyeIcon className="w-3.5 h-3.5" /> {t('team.observer_badge')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card space-y-3">
            <label className="label" htmlFor="story-title">{t('team.story_label')}</label>
            <input
              id="story-title"
              className="input"
              placeholder={t('team.story_placeholder')}
              value={newStoryTitle}
              onChange={e => setNewStoryTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleStartVoting() }}
            />
            <p className="text-xs text-gray-400 dark:text-gray-600">
              {t('team.story_local_hint', { n: hostState.rd + 1 })}
            </p>
            <button
              type="button"
              onClick={handleStartVoting}
              disabled={!newStoryTitle.trim()}
              className="btn-primary w-full"
            >
              {t('team.start_voting')}
            </button>
          </div>

          {stories.length > 0 && (
            <button type="button" onClick={handleEndSession} className="btn-secondary w-full">
              {t('team.end_session')}
            </button>
          )}
          {backLink}
        </div>
      )
    }

    if (hostState.ph === PHASE.voting) {
      return (
        <div className="max-w-sm mx-auto pt-8 space-y-6">
          {statusBanner}
          <div className="card">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              {t('team.story_n', { n: hostState.rd })}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{currentTitle}</p>
          </div>

          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('team.vote_progress', { done: voteCount, total: voters.length })}
                {voters.length < participantEntries.length && (
                  <span className="ml-1 text-xs text-gray-400 dark:text-gray-600">({t('team.voters_only')})</span>
                )}
              </p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                allVoted
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {allVoted
                  ? <><CheckIcon className="w-3 h-3" /> {t('team.all_voted')}</>
                  : t('team.waiting_for_votes')}
              </span>
            </div>
            <ul className="space-y-1">
              {participantEntries.map(([id, p]) => (
                <li key={id} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span className="flex items-center gap-1.5">
                    {labels.get(id)}
                    {p.o === 1 && (
                      <span className="text-xs text-gray-400 dark:text-gray-600"><EyeIcon className="w-3.5 h-3.5" /></span>
                    )}
                  </span>
                  {p.o === 1 ? (
                    <span className="text-xs text-gray-400 dark:text-gray-600">{t('team.observer_badge')}</span>
                  ) : (
                    <span className={`text-xs flex items-center gap-1 ${hasVoted(p, hostState) ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}>
                      {hasVoted(p, hostState) ? <><CheckIcon className="w-3 h-3" /> {t('team.voted_badge')}</> : '…'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <button type="button" onClick={handleReveal} className="btn-primary w-full">
            {t('team.reveal')}
          </button>
        </div>
      )
    }

    // Revealed: cards arrive as each participant sees the reveal.
    return (
      <div className="max-w-sm mx-auto pt-8 space-y-6">
        {statusBanner}
        <div className="card">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
            {t('team.story_n', { n: hostState.rd })} · {currentTitle}
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            {voters.map(([id, p]) => (
              <div key={id} className="flex flex-col items-center gap-1">
                <div className="w-10 h-14 rounded-lg border-2 border-brand-300 dark:border-brand-600 bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center text-sm font-bold text-brand-700 dark:text-brand-300">
                  {cardFor(p, hostState) ?? (hasVoted(p, hostState) ? '…' : '—')}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 max-w-[56px] truncate text-center">
                  {labels.get(id)}
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
          <button type="button" onClick={handleEndSession} className="btn-primary flex-1">
            {t('team.end_session')}
          </button>
        </div>
      </div>
    )
  }

  // ── PARTICIPANT VIEW ───────────────────────────────────────────────────
  if (mode === 'participant' && code) {
    if (!host) {
      const message =
        status === 'unreachable' ? t('team.unreachable')
        : hostSeen ? t('team.host_left')
        : hostWaitOver ? t('team.join_error')
        : null
      return (
        <div className="max-w-sm mx-auto flex flex-col items-center gap-4 pt-16 text-center text-gray-500 dark:text-gray-400">
          {message ? (
            <p>{message}</p>
          ) : (
            <>
              <div className="w-8 h-8 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-sm">{t('team.connecting')}</p>
            </>
          )}
          <button type="button" onClick={onBack} className="btn-secondary">
            {t('session.back')}
          </button>
        </div>
      )
    }

    const deck = DECKS[deckFor(host)]
    const voters = participantEntries.filter(([, p]) => p.o === 0)
    const selfVoted = !joinAsObserver && myVote?.rd === host.rd
    const voteCount = voters.filter(([, p]) => hasVoted(p, host)).length + (selfVoted ? 1 : 0)
    const voterTotal = voters.length + (joinAsObserver ? 0 : 1)
    const myCard = myVote && myVote.rd === host.rd ? deck[myVote.c] ?? null : null
    const storyHeading = (
      <div className="card">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
          {t('team.story_label')}
        </p>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('team.story_n', { n: host.rd })}</p>
      </div>
    )

    if (host.ph === PHASE.lobby) {
      return (
        <div className="flex flex-col items-center gap-4 pt-16 text-gray-500 dark:text-gray-400">
          {statusBanner}
          <p className="text-lg font-medium">{t('team.waiting_for_players')}</p>
          <p className="text-sm">{t('team.you_are', { alias: labels.get(selfId) ?? aliasLabel(alias, lang) })}</p>
          <button type="button" onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400">
            {t('session.back')}
          </button>
        </div>
      )
    }

    if (host.ph === PHASE.voting) {
      if (joinAsObserver) {
        return (
          <div className="max-w-sm mx-auto pt-8 space-y-6">
            {statusBanner}
            {storyHeading}
            <div className="card text-center space-y-2 py-6">
              <div className="flex justify-center text-gray-400 dark:text-gray-500"><EyeIcon className="w-9 h-9" /></div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('team.observer_badge')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">
                {t('team.vote_progress', { done: voteCount, total: voterTotal })}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600">{t('team.waiting_for_votes')}</p>
            </div>
          </div>
        )
      }

      return (
        <div className="max-w-sm mx-auto pt-8 space-y-6">
          {statusBanner}
          {storyHeading}

          {myCard ? (
            <div className="card text-center space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('team.your_vote')}</p>
              <div className="w-16 h-24 rounded-xl border-2 border-brand-400 bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center text-2xl font-bold text-brand-700 dark:text-brand-300 mx-auto">
                {myCard}
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
              {t('team.vote_progress', { done: voteCount, total: voterTotal })}
            </p>
            <ul className="space-y-1">
              {voters.map(([id, p], idx) => (
                <li key={id} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>{host.bl ? t('team.anonymous_voter', { n: idx + 1 }) : labels.get(id)}</span>
                  <span className={`text-xs ${hasVoted(p, host) ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}>
                    {hasVoted(p, host) ? t('team.voted_badge') : '…'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )
    }

    // Revealed
    const revealed: { id: string; label: string; card: string | null; self: boolean }[] = [
      ...(joinAsObserver ? [] : [{ id: selfId, label: labels.get(selfId) ?? aliasLabel(alias, lang), card: myCard, self: true }]),
      ...voters.map(([id, p]) => ({ id, label: labels.get(id) ?? '?', card: cardFor(p, host), self: false })),
    ]
    return (
      <div className="max-w-sm mx-auto pt-8 space-y-6">
        {statusBanner}
        <div className="card">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
            {t('team.story_n', { n: host.rd })}
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            {revealed.map(({ id, label, card, self }) => (
              <div key={id} className="flex flex-col items-center gap-1">
                <div className={`w-10 h-14 rounded-lg border-2 flex items-center justify-center text-sm font-bold ${
                  self
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                }`}>
                  {card ?? '—'}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 max-w-[56px] truncate text-center">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-sm text-gray-400 dark:text-gray-600">{t('team.waiting_for_votes')}</p>
      </div>
    )
  }

  return null
}
