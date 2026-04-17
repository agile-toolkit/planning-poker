import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Session, CardValue, Story } from '../types';
import { CARD_VALUES } from '../types';

interface Props {
  session: Session;
  onChange: (s: Session) => void;
  onBack: () => void;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function numericVotes(votes: string[]): number[] {
  return votes
    .map(v => v === '½' ? 0.5 : parseFloat(v))
    .filter(n => !isNaN(n));
}

export default function SessionView({ session, onChange, onBack }: Props) {
  const { t } = useTranslation();
  const [participantInput, setParticipantInput] = useState('');
  const [storyInput, setStoryInput] = useState('');
  const [storyDesc, setStoryDesc] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [addingStory, setAddingStory] = useState(false);

  const currentStory = session.stories.find(s => s.id === session.currentStoryId) ?? null;
  const estimatedStories = session.stories.filter(s => s.finalEstimate !== null);

  function update(patch: Partial<Session>) {
    onChange({ ...session, ...patch });
  }

  function addParticipant() {
    const name = participantInput.trim();
    if (!name) return;
    update({
      participants: [...session.participants, { id: crypto.randomUUID(), name, vote: null }],
    });
    setParticipantInput('');
    setAddingParticipant(false);
  }

  function removeParticipant(id: string) {
    update({ participants: session.participants.filter(p => p.id !== id) });
  }

  function addStory() {
    const title = storyInput.trim();
    if (!title) return;
    const story: Story = {
      id: crypto.randomUUID(),
      title,
      description: storyDesc.trim() || undefined,
      finalEstimate: null,
      votes: {},
    };
    const newStories = [...session.stories, story];
    update({
      stories: newStories,
      currentStoryId: session.currentStoryId ?? story.id,
    });
    setStoryInput('');
    setStoryDesc('');
    setAddingStory(false);
  }

  function selectStory(id: string) {
    update({ currentStoryId: id, revealed: false });
  }

  function castVote(participantId: string, value: CardValue) {
    if (!currentStory || session.revealed) return;
    const updated = session.stories.map(s =>
      s.id === currentStory.id
        ? { ...s, votes: { ...s.votes, [participantId]: value } }
        : s
    );
    const updatedParticipants = session.participants.map(p =>
      p.id === participantId ? { ...p, vote: value } : p
    );
    update({ stories: updated, participants: updatedParticipants });
  }

  function reveal() {
    update({ revealed: true });
  }

  function resetVotes() {
    if (!currentStory) return;
    const updated = session.stories.map(s =>
      s.id === currentStory.id ? { ...s, votes: {} } : s
    );
    const updatedParticipants = session.participants.map(p => ({ ...p, vote: null }));
    update({ stories: updated, participants: updatedParticipants, revealed: false });
  }

  function setFinalEstimate(value: CardValue) {
    if (!currentStory) return;
    const updated = session.stories.map(s =>
      s.id === currentStory.id ? { ...s, finalEstimate: value } : s
    );
    update({ stories: updated });
  }

  function nextStory() {
    const unestimated = session.stories.filter(s => s.finalEstimate === null && s.id !== session.currentStoryId);
    const next = unestimated[0] ?? null;
    const updatedParticipants = session.participants.map(p => ({ ...p, vote: null }));
    update({ currentStoryId: next?.id ?? null, revealed: false, participants: updatedParticipants });
  }

  const voteValues = currentStory ? Object.values(currentStory.votes) : [];
  const numVotes = numericVotes(voteValues);
  const avg = numVotes.length ? numVotes.reduce((a, b) => a + b, 0) / numVotes.length : null;
  const med = numVotes.length ? median(numVotes) : null;
  const consensus = numVotes.length > 0 && new Set(voteValues).size === 1;
  const spread = numVotes.length >= 2 ? Math.max(...numVotes) - Math.min(...numVotes) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 text-sm">← {t('session.title')}</button>
        <h1 className="text-xl font-bold text-slate-900 flex-1">{session.name}</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: participants + stories */}
        <div className="space-y-4">
          {/* Participants */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 text-sm">{t('session.addParticipant')}</h2>
              <button
                onClick={() => setAddingParticipant(v => !v)}
                className="text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 px-2 py-1 rounded font-medium"
              >
                +
              </button>
            </div>
            {addingParticipant && (
              <div className="flex gap-2 mb-3">
                <input
                  autoFocus
                  type="text" value={participantInput} placeholder={t('session.participantName')}
                  onChange={e => setParticipantInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addParticipant()}
                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button onClick={addParticipant} className="bg-brand-600 text-white px-3 py-1 rounded text-sm font-medium">
                  {t('common.add')}
                </button>
              </div>
            )}
            {session.participants.length === 0 ? (
              <p className="text-xs text-slate-400">{t('session.noParticipants')}</p>
            ) : (
              <ul className="space-y-1">
                {session.participants.map(p => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{p.name}</span>
                    <div className="flex items-center gap-2">
                      {currentStory && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          currentStory.votes[p.id]
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {currentStory.votes[p.id]
                            ? (session.revealed ? currentStory.votes[p.id] : t('session.voted'))
                            : t('session.waiting')}
                        </span>
                      )}
                      <button
                        onClick={() => removeParticipant(p.id)}
                        title={t('session.removeParticipant')}
                        className="text-slate-300 hover:text-red-400 text-xs"
                      >✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Stories queue */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 text-sm">{t('session.addStory')}</h2>
              <button
                onClick={() => setAddingStory(v => !v)}
                className="text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 px-2 py-1 rounded font-medium"
              >
                +
              </button>
            </div>
            {addingStory && (
              <div className="space-y-2 mb-3">
                <input
                  autoFocus
                  type="text" value={storyInput} placeholder={t('session.storyTitlePlaceholder')}
                  onChange={e => setStoryInput(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <input
                  type="text" value={storyDesc} placeholder={t('session.storyDesc')}
                  onChange={e => setStoryDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addStory()}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button onClick={addStory} className="w-full bg-brand-600 text-white px-3 py-1.5 rounded text-sm font-medium">
                  {t('common.add')}
                </button>
              </div>
            )}
            <ul className="space-y-1">
              {session.stories.filter(s => s.finalEstimate === null).map(s => (
                <li key={s.id}>
                  <button
                    onClick={() => selectStory(s.id)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${
                      s.id === session.currentStoryId
                        ? 'bg-brand-50 text-brand-800 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
              {session.stories.filter(s => s.finalEstimate === null).length === 0 && (
                <li className="text-xs text-slate-400">{t('session.noCurrentStory')}</li>
              )}
            </ul>
          </div>
        </div>

        {/* Center: voting area */}
        <div className="lg:col-span-2 space-y-4">
          {!currentStory ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 shadow-sm">
              {t('session.noCurrentStory')}
            </div>
          ) : (
            <>
              {/* Story info */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <h2 className="font-bold text-slate-900">{currentStory.title}</h2>
                {currentStory.description && (
                  <p className="text-sm text-slate-500 mt-1">{currentStory.description}</p>
                )}
              </div>

              {/* Per-participant voting */}
              {session.participants.map(participant => (
                <div key={participant.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-slate-700 text-sm">{participant.name}</span>
                    {currentStory.votes[participant.id] && !session.revealed && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t('session.voted')}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CARD_VALUES.map(v => (
                      <button
                        key={v}
                        onClick={() => castVote(participant.id, v)}
                        disabled={session.revealed}
                        className={`w-10 h-14 border-2 rounded-lg font-bold text-sm transition-all ${
                          currentStory.votes[participant.id] === v
                            ? 'border-brand-500 bg-brand-50 text-brand-700 scale-105 shadow'
                            : session.revealed
                            ? 'border-slate-200 text-slate-400 cursor-default'
                            : 'border-slate-300 text-slate-600 hover:border-brand-400 hover:bg-brand-50'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Controls */}
              <div className="flex flex-wrap gap-2">
                {!session.revealed ? (
                  <button
                    onClick={reveal}
                    disabled={voteValues.length === 0}
                    className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                  >
                    {t('session.reveal')}
                  </button>
                ) : (
                  <button
                    onClick={nextStory}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                  >
                    {t('session.nextStory')}
                  </button>
                )}
                <button
                  onClick={resetVotes}
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                >
                  {t('session.resetVotes')}
                </button>
              </div>

              {/* Statistics */}
              {session.revealed && voteValues.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-slate-800 mb-3 text-sm">{t('session.statistics')}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">{t('session.average')}</div>
                      <div className="font-bold text-slate-800">{avg !== null ? avg.toFixed(1) : '—'}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">{t('session.median')}</div>
                      <div className="font-bold text-slate-800">{med !== null ? med : '—'}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">{t('session.consensus')}</div>
                      <div className={`font-bold ${consensus ? 'text-green-600' : 'text-red-500'}`}>
                        {consensus ? t('session.yes') : t('session.no')}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">{t('session.spread')}</div>
                      <div className="font-bold text-slate-800">{spread !== null ? spread : '—'}</div>
                    </div>
                  </div>

                  {/* Final estimate */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2">{t('session.finalEstimate')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CARD_VALUES.map(v => (
                        <button
                          key={v}
                          onClick={() => setFinalEstimate(v)}
                          className={`w-10 h-14 border-2 rounded-lg font-bold text-sm transition-all ${
                            currentStory.finalEstimate === v
                              ? 'border-green-500 bg-green-50 text-green-700 scale-105 shadow'
                              : 'border-slate-300 text-slate-600 hover:border-green-400 hover:bg-green-50'
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

          {/* History */}
          {estimatedStories.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-3 text-sm">{t('session.history')}</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {estimatedStories.map(s => (
                    <tr key={s.id}>
                      <td className="py-2 text-slate-700">{s.title}</td>
                      <td className="py-2 text-right">
                        <span className="bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded">
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
  );
}
