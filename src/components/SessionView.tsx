import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PokerSession, CardValue } from '../types'
import { CARD_VALUES } from '../types'

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

export default function SessionView({ session, onChange, onBack }: Props) {
  const { t } = useTranslation()
  const [participantInput, setParticipantInput] = useState('')
  const [storyInput, setStoryInput] = useState('')
  const [storyDesc, setStoryDesc] = useState('')
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [addingStory, setAddingStory] = useState(false)

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
  }

  function reveal() {
    update({ revealed: true })
  }

  function resetVotes() {
    if (!currentStory) return
    const updatedStories = session.stories.map(s =>
      s.id === currentStory.id ? { ...s, votes: {} } : s
    )
    const updatedParticipants = session.participants.map(p => ({ ...p, vote: null }))
    update({ stories: updatedStories, participants: updatedParticipants, revealed: false })
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

  const voteValues = currentStory ? Object.values(currentStory.votes) : []
  const numVotes = numericVotes(voteValues as string[])
  const avg = numVotes.length ? numVotes.reduce((a, b) => a + b, 0) / numVotes.length : null
  const med = numVotes.length ? median(numVotes) : null
  const consensus = numVotes.length > 0 && new Set(voteValues).size === 1
  const spread = numVotes.length >= 2 ? Math.max(...numVotes) - Math.min(...numVotes) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="btn-ghost text-sm">
          ← {t('session.back')}
        </button>
        <h1 className="text-xl font-bold text-white flex-1 truncate">{session.name}</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white text-sm">{t('session.addParticipant')}</h2>
              <button
                type="button"
                onClick={() => setAddingParticipant(v => !v)}
                className="text-xs bg-brand-900/50 text-brand-300 hover:bg-brand-900 px-2 py-1 rounded font-medium"
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
                {session.participants.map(p => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-200">{p.name}</span>
                    <div className="flex items-center gap-2">
                      {currentStory && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            currentStory.votes[p.id]
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-gray-700 text-gray-500'
                          }`}
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
                        title={t('session.removeParticipant')}
                        className="text-gray-500 hover:text-red-400 text-xs"
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
              <h2 className="font-semibold text-white text-sm">{t('session.addStory')}</h2>
              <button
                type="button"
                onClick={() => setAddingStory(v => !v)}
                className="text-xs bg-brand-900/50 text-brand-300 hover:bg-brand-900 px-2 py-1 rounded font-medium"
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
              {session.stories.filter(s => s.finalEstimate === null).map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => selectStory(s.id)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${
                      s.id === session.currentStoryId
                        ? 'bg-brand-900/40 text-brand-200 font-medium'
                        : 'text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
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
                <h2 className="font-bold text-white">{currentStory.title}</h2>
                {currentStory.description && (
                  <p className="text-sm text-gray-400 mt-1">{currentStory.description}</p>
                )}
              </div>

              {session.participants.map(participant => (
                <div key={participant.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-200 text-sm">{participant.name}</span>
                    {currentStory.votes[participant.id] && !session.revealed && (
                      <span className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full">
                        {t('session.voted')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CARD_VALUES.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => castVote(participant.id, v)}
                        disabled={session.revealed}
                        title={t(`cards.${cardKey(v)}`)}
                        className={`w-10 h-14 border-2 rounded-lg font-bold text-sm transition-all ${
                          currentStory.votes[participant.id] === v
                            ? 'border-brand-400 bg-brand-900/40 text-brand-200 scale-105 shadow'
                            : session.revealed
                              ? 'border-gray-600 text-gray-500 cursor-default'
                              : 'border-gray-600 text-gray-200 hover:border-brand-500 hover:bg-gray-700/50'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-2">
                {!session.revealed ? (
                  <button
                    type="button"
                    onClick={reveal}
                    disabled={voteValues.length === 0}
                    className="btn-primary disabled:opacity-40"
                  >
                    {t('session.reveal')}
                  </button>
                ) : (
                  <button type="button" onClick={nextStory} className="btn-primary bg-green-600 hover:bg-green-700">
                    {t('session.nextStory')}
                  </button>
                )}
                <button type="button" onClick={resetVotes} className="btn-secondary">
                  {t('session.resetVotes')}
                </button>
              </div>

              {session.revealed && voteValues.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-white mb-3 text-sm">{t('session.statistics')}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-400 mb-1">{t('session.average')}</div>
                      <div className="font-bold text-white">{avg !== null ? avg.toFixed(1) : '—'}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-400 mb-1">{t('session.median')}</div>
                      <div className="font-bold text-white">{med !== null ? String(med) : '—'}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-400 mb-1">{t('session.consensus')}</div>
                      <div className={`font-bold ${consensus ? 'text-green-400' : 'text-red-400'}`}>
                        {consensus ? t('session.yes') : t('session.no')}
                      </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-400 mb-1">{t('session.spread')}</div>
                      <div className="font-bold text-white">{spread !== null ? String(spread) : '—'}</div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-2">{t('session.finalEstimate')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CARD_VALUES.map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setFinalEstimate(v)}
                          title={t(`cards.${cardKey(v)}`)}
                          className={`w-10 h-14 border-2 rounded-lg font-bold text-sm transition-all ${
                            currentStory.finalEstimate === v
                              ? 'border-green-400 bg-green-900/30 text-green-200 scale-105 shadow'
                              : 'border-gray-600 text-gray-200 hover:border-green-500 hover:bg-green-900/20'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {estimatedStories.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-3 text-sm">{t('session.history')}</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-700">
                  {estimatedStories.map(s => (
                    <tr key={s.id}>
                      <td className="py-2 text-gray-200">{s.title}</td>
                      <td className="py-2 text-right">
                        <span className="bg-brand-900/50 text-brand-200 font-bold px-2 py-0.5 rounded">
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
