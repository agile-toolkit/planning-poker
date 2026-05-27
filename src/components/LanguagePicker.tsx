import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Copy this file into src/components/ when adopting in an app.
 * Requires: react-i18next, configured with en / es / be / ru locales.
 */

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'be', label: 'BE' },
  { code: 'ru', label: 'RU' },
] as const

type LangCode = (typeof LANGUAGES)[number]['code']

function currentCode(language: string): LangCode {
  const code = language.slice(0, 2) as LangCode
  return LANGUAGES.some(l => l.code === code) ? code : 'en'
}

export default function LanguagePicker() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = LANGUAGES.find(l => l.code === currentCode(i18n.language))!

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault(); setOpen(true); return
    }
    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const idx = LANGUAGES.findIndex(l => l.code === currentCode(i18n.language))
      const next = e.key === 'ArrowDown'
        ? (idx + 1) % LANGUAGES.length
        : (idx - 1 + LANGUAGES.length) % LANGUAGES.length
      i18n.changeLanguage(LANGUAGES[next].code)
    }
  }

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors select-none"
      >
        <span>{active.label}</span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 min-w-[110px]"
        >
          {LANGUAGES.map(lang => {
            const isCurrent = lang.code === currentCode(i18n.language)
            return (
              <li
                key={lang.code}
                role="option"
                aria-selected={isCurrent}
              >
                <button
                  type="button"
                  onClick={() => { i18n.changeLanguage(lang.code); setOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                    isCurrent
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{lang.label}</span>
                  {isCurrent && (
                    <svg className="ml-auto w-3.5 h-3.5 text-brand-600" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 7l3.5 3.5L12 3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
