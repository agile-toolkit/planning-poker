import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Session, View } from './types';
import HomeScreen from './components/HomeScreen';
import SessionView from './components/SessionView';

function makeSession(name: string, facilitator: string): Session {
  return {
    id: crypto.randomUUID(),
    name,
    participants: facilitator.trim()
      ? [{ id: crypto.randomUUID(), name: facilitator.trim(), vote: null }]
      : [],
    stories: [],
    currentStoryId: null,
    revealed: false,
  };
}

export default function App() {
  const { i18n } = useTranslation();
  const [view, setView] = useState<View>('home');
  const [session, setSession] = useState<Session | null>(null);

  function startSession(name: string, facilitator: string) {
    setSession(makeSession(name, facilitator));
    setView('session');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-600 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setView('home')} className="font-bold text-lg tracking-tight hover:opacity-80">
            Planning Poker
          </button>
          <button
            onClick={() => i18n.changeLanguage(i18n.language.startsWith('ru') ? 'en' : 'ru')}
            className="text-sm bg-brand-700 hover:bg-brand-500 px-3 py-1 rounded transition-colors"
          >
            {i18n.language.startsWith('ru') ? 'EN' : 'RU'}
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {view === 'home' && <HomeScreen onStart={startSession} />}
        {view === 'session' && session && (
          <SessionView session={session} onChange={setSession} onBack={() => setView('home')} />
        )}
      </main>
    </div>
  );
}
