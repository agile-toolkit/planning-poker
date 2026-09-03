import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Last line of defence for an app whose state lives entirely in localStorage.
 *
 * Why this exists: every app in the suite reads payloads written by *other*
 * apps, historically via `JSON.parse(raw) as SomeType` with no runtime check.
 * When one of those payloads has the wrong shape — an older schema, a
 * half-restored workspace, a hand-edited key — the dereference throws during
 * render. Without a boundary React unmounts the whole tree and the user gets a
 * blank page. Reloading does not help, because the bad data is still in
 * localStorage: the app is bricked until someone knows to open devtools.
 *
 * So the boundary's job is not just to show a nicer message. It is to offer
 * the one action that actually recovers: clearing this app's own keys.
 *
 * Deliberately dependency-free — no i18next, no shared utils. A boundary that
 * needs the app's modules to have initialised correctly is no use when the
 * failure is in initialisation. The small string table below is the price of
 * that, and it is worth paying.
 */

type Lang = 'en' | 'es' | 'ru' | 'be'

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Something went wrong',
    body: 'This page hit an error it could not recover from. Your data is still on this device.',
    reload: 'Reload the page',
    reset: "Clear this app's saved data",
    confirm: "This deletes only this app's saved data on this device. Other apps in the toolkit are not affected. Continue?",
    details: 'Technical details',
  },
  es: {
    title: 'Algo salió mal',
    body: 'Esta página encontró un error del que no pudo recuperarse. Tus datos siguen en este dispositivo.',
    reload: 'Recargar la página',
    reset: 'Borrar los datos guardados de esta app',
    confirm: 'Esto borra solo los datos guardados de esta app en este dispositivo. Las demás apps no se ven afectadas. ¿Continuar?',
    details: 'Detalles técnicos',
  },
  ru: {
    title: 'Что-то пошло не так',
    body: 'На этой странице произошла ошибка, из-за которой не удалось восстановиться. Ваши данные остались на устройстве.',
    reload: 'Перезагрузить страницу',
    reset: 'Очистить сохранённые данные этого приложения',
    confirm: 'Будут удалены только данные этого приложения на этом устройстве. Другие приложения не затронуты. Продолжить?',
    details: 'Технические детали',
  },
  be: {
    title: 'Нешта пайшло не так',
    body: 'На гэтай старонцы адбылася памылка, з якой не ўдалося аднавіцца. Вашы даныя засталіся на прыладзе.',
    reload: 'Перазагрузіць старонку',
    reset: 'Ачысціць захаваныя даныя гэтага дадатку',
    confirm: 'Будуць выдалены толькі даныя гэтага дадатку на гэтай прыладзе. Іншыя дадаткі не закрануты. Працягнуць?',
    details: 'Тэхнічныя падрабязнасці',
  },
}

function detectLang(): Lang {
  try {
    const raw = (localStorage.getItem('i18nextLng') ?? navigator.language ?? 'en').slice(0, 2)
    if (raw === 'es' || raw === 'ru' || raw === 'be') return raw
  } catch {
    /* storage unavailable — fall through to English */
  }
  return 'en'
}

interface Props {
  children: ReactNode
  /**
   * localStorage key prefixes this app owns. "Clear this app's saved data"
   * removes only keys matching one of these, so recovering one app never
   * destroys another's data — they all share one origin.
   *
   * Keep this in step with the app's entry in the Dashboard's `data-keys.ts`.
   */
  storagePrefixes: string[]
  /** Extra exact key names that predate the prefix convention. */
  legacyKeys?: string[]
}

interface State {
  error: Error | null
}

/**
 * The keys a reset would delete, given everything currently in storage.
 *
 * Split out from the handler so the blast radius is testable without
 * rendering: getting this wrong in either direction is silent — too narrow
 * leaves the app bricked, too wide destroys a neighbouring app's data.
 */
export function keysToClear(
  allKeys: string[],
  storagePrefixes: string[],
  legacyKeys: string[] = [],
): string[] {
  return allKeys.filter(
    key => storagePrefixes.some(p => key.startsWith(p)) || legacyKeys.includes(key),
  )
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No telemetry in this suite by design (no backend, no data collection),
    // so the console is where a report has to come from.
    console.error('Unrecoverable render error:', error, info.componentStack)
  }

  private handleReset = () => {
    const s = STRINGS[detectLang()]
    if (!window.confirm(s.confirm)) return
    try {
      const { storagePrefixes, legacyKeys } = this.props
      const all: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) all.push(key)
      }
      // Collected first: removing while iterating shifts the indices.
      keysToClear(all, storagePrefixes, legacyKeys).forEach(k => localStorage.removeItem(k))
    } catch {
      /* nothing more we can do; the reload below is still worth trying */
    }
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const s = STRINGS[detectLang()]
    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-gray-950"
      >
        <div className="max-w-md w-full text-center space-y-5 py-12">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">{s.title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{s.body}</p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:opacity-90 transition-opacity"
            >
              {s.reload}
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              {s.reset}
            </button>
          </div>

          <details className="text-left pt-4">
            <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer select-none">
              {s.details}
            </summary>
            <pre className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-48 overflow-auto">
              {error.name}: {error.message}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
