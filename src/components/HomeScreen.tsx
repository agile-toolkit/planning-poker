import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  onStart: (name: string, facilitator: string) => void;
}

export default function HomeScreen({ onStart }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [facilitator, setFacilitator] = useState('');

  return (
    <div className="space-y-8">
      <div className="text-center py-6">
        <div className="text-5xl mb-3">🃏</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('home.headline')}</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">{t('home.intro')}</p>
      </div>

      {/* New session form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-md mx-auto">
        <h2 className="font-semibold text-slate-800 mb-4">{t('home.newSession')}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">{t('home.sessionName')}</label>
            <input
              type="text" value={name} placeholder={t('home.sessionNamePlaceholder')}
              onChange={e => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">{t('home.yourName')}</label>
            <input
              type="text" value={facilitator} placeholder={t('home.yourNamePlaceholder')}
              onChange={e => setFacilitator(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && onStart(name, facilitator)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <button
            onClick={() => name.trim() && onStart(name, facilitator)}
            disabled={!name.trim()}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors"
          >
            {t('home.start')}
          </button>
        </div>
      </div>

      {/* Card deck preview */}
      <div className="flex justify-center gap-1 flex-wrap">
        {['½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'].map(v => (
          <div key={v} className="w-10 h-14 bg-white border-2 border-brand-300 rounded-lg flex items-center justify-center font-bold text-brand-600 text-sm shadow-sm">
            {v}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-2">{t('home.whyPoker')}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{t('home.whyText')}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-2">{t('home.fibonacci')}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{t('home.fibText')}</p>
        </div>
      </div>
    </div>
  );
}
