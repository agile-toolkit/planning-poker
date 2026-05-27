import LanguagePicker from './LanguagePicker'

/**
 * Copy this file (and LanguagePicker.tsx) into src/components/ when adopting in an app.
 * Requires: react-i18next.
 *
 * Usage:
 *   <AppHeader title={t('app.title')} onTitleClick={reset}>
 *     {/* optional extra controls placed right of LanguagePicker *\/}
 *   </AppHeader>
 *
 *   <AppHeader
 *     title={t('app.title')}
 *     onTitleClick={() => setScreen('home')}
 *     navItems={[
 *       { key: 'settings', label: t('nav.settings'), active: screen === 'settings', onClick: () => setScreen('settings') },
 *     ]}
 *   />
 */

interface NavItem {
  key: string
  label: string
  active: boolean
  onClick: () => void
}

interface AppHeaderProps {
  title: string
  onTitleClick?: () => void
  navItems?: NavItem[]
  children?: React.ReactNode
}

const DASHBOARD_URL = 'https://agile-toolkit.github.io/'

const GridIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <rect x="1" y="1" width="6" height="6" rx="1"/>
    <rect x="9" y="1" width="6" height="6" rx="1"/>
    <rect x="1" y="9" width="6" height="6" rx="1"/>
    <rect x="9" y="9" width="6" height="6" rx="1"/>
  </svg>
)

export default function AppHeader({ title, onTitleClick, navItems, children }: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Left: dashboard link + app title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={DASHBOARD_URL}
            title="Agile Toolkit — back to dashboard"
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <GridIcon />
          </a>
          {onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              {title}
            </button>
          ) : (
            <span className="font-semibold text-brand-600">{title}</span>
          )}
        </div>

        {/* Right: optional nav pills + language picker + children slot */}
        <div className="flex items-center gap-1 min-w-0">
          {navItems && navItems.length > 0 && (
            <nav className="flex items-center gap-0.5 mr-1">
              {navItems.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    item.active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          <LanguagePicker />

          {children}
        </div>

      </div>
    </header>
  )
}
