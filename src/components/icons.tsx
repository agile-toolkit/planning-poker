/**
 * Copy this file into src/components/icons.tsx when adopting in an app.
 *
 * A small shared set of SVG icons replacing the suite's most commonly
 * typed decorative emoji (✕ ✓ → ← 💡 ⚠️ 📊 🔄 🔗 📅 👤 ✏️ 🖨️ 📋 🤝 🎯 🏁 📁
 * 🔔 🔇 🔍 👁 ☀️ ❓ 📤 ⬇️ 👍 ☑ ☐ 🔀, plus a few semantic-colored ones:
 * warning, celebrate, trophy, fire, star. Emoji that are FUNCTIONAL CONTENT rather than decoration —
 * Team Identity's Identity Symbols picker, Planning Poker's ☕ card value,
 * the Dashboard's live pass-through of a team's chosen symbol — are not
 * covered here and should stay as real emoji; only decorative UI chrome
 * (buttons, badges, section headers) is in scope.
 *
 * Most icons use `fill="currentColor"` / `stroke="currentColor"` so they
 * inherit whatever Tailwind text-color class already sits on the
 * surrounding button or span (e.g. a delete button's `text-red-400`
 * colors its icon automatically) — matching the existing convention used
 * by AppHeader's GridIcon, ThemeToggle's sun/moon, and FacilitatorToggle's
 * ProjectorIcon. A few icons (Warning, Celebrate, Trophy, Fire, StarFilled)
 * carry a fixed semantic color instead, since the color IS the meaning
 * (amber warning, gold trophy, etc.) regardless of surrounding context.
 *
 * Usage:
 *   import { CloseIcon, WarningIcon } from './icons'
 *   <button className="text-red-500 hover:text-red-700"><CloseIcon className="w-4 h-4" /></button>
 *   <WarningIcon className="w-4 h-4" />
 */

interface IconProps {
  className?: string
}

// ── Neutral (currentColor) — UI chrome ──────────────────────────────────

export function CloseIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  )
}

export function CheckIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5l3.2 3.2L13 4.5" />
    </svg>
  )
}

export function ArrowLeftIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3L5 8l5 5" />
    </svg>
  )
}

export function ArrowRightIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3l5 5-5 5" />
    </svg>
  )
}

export function TipIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 1.5a4.5 4.5 0 00-2.5 8.25c.35.25.5.6.5 1v.25h4v-.25c0-.4.15-.75.5-1A4.5 4.5 0 008 1.5z" />
      <path d="M6.25 13.5h3.5M6.75 15h2.5" strokeLinecap="round" />
    </svg>
  )
}

export function ChartIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1.5" y="9" width="3" height="5.5" rx="0.5" />
      <rect x="6.5" y="5.5" width="3" height="9" rx="0.5" />
      <rect x="11.5" y="2" width="3" height="12.5" rx="0.5" />
    </svg>
  )
}

export function RefreshIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M13.5 8A5.5 5.5 0 013 10.2M2.5 8A5.5 5.5 0 0113 5.8" />
      <path d="M13.5 3v3h-3M2.5 13v-3h3" strokeLinejoin="round" />
    </svg>
  )
}

export function LinkIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M6.5 9.5l3-3" />
      <path d="M7 4.5l.7-.7a2.5 2.5 0 013.5 3.5l-.7.7M9 11.5l-.7.7a2.5 2.5 0 01-3.5-3.5l.7-.7" />
    </svg>
  )
}

export function CalendarIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" strokeLinecap="round" />
    </svg>
  )
}

export function PersonIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="5" r="2.75" />
      <path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" strokeLinecap="round" />
    </svg>
  )
}

export function EditIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 2.5l2.5 2.5-8 8L3 13.5l0-2.5z" />
    </svg>
  )
}

export function PrintIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5.5" width="10" height="6" rx="1" />
      <path d="M4.5 5.5V2.5h7v3M4.5 9.5h7v4h-7z" />
    </svg>
  )
}

export function ClipboardIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="2.5" width="10" height="12" rx="1.5" />
      <path d="M6 2.5V2a1 1 0 011-1h2a1 1 0 011 1v.5M5.5 7h5M5.5 9.5h5M5.5 12h3" strokeLinecap="round" />
    </svg>
  )
}

export function TargetIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3.2" />
      <circle cx="8" cy="8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function FlagIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 1.5v13" strokeLinecap="round" />
      <path d="M3.5 2.5h9l-2 3 2 3h-9z" />
    </svg>
  )
}

export function FolderIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M1.5 4a1 1 0 011-1h3.5l1.5 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H2.5a1 1 0 01-1-1z" />
    </svg>
  )
}

export function BellIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6.5a4 4 0 018 0c0 3 1 4 1 4H3s1-1 1-4z" />
      <path d="M6.5 12.5a1.5 1.5 0 003 0" />
    </svg>
  )
}

export function BellOffIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6.5a4 4 0 018 0c0 3 1 4 1 4H3s1-1 1-4z" />
      <path d="M6.5 12.5a1.5 1.5 0 003 0" />
      <path d="M2 2l12 12" />
    </svg>
  )
}

export function SearchIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M13.5 13.5L10.5 10.5" />
    </svg>
  )
}

export function EyeIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" />
      <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SunIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
    </svg>
  )
}

export function QuestionIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="7" r="5.3" />
      <path d="M6 6a2 2 0 013.8.9c0 1.1-1.3 1.4-1.7 2.4" />
      <circle cx="8" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function UploadIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 10V2M5 5l3-3 3 3" />
      <path d="M2.5 11v2a1 1 0 001 1h9a1 1 0 001-1v-2" />
    </svg>
  )
}

export function DownloadIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v8M5 7l3 3 3-3" />
      <path d="M2.5 11v2a1 1 0 001 1h9a1 1 0 001-1v-2" />
    </svg>
  )
}

export function ThumbsUpIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M2 7h2.2v7H2zM6 7.3l1-4.3a.9.9 0 011.7.4l-.5 3h4a1 1 0 01.98 1.2l-.9 4.5a1 1 0 01-1 .8H6z" />
    </svg>
  )
}

export function CheckboxEmptyIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" />
    </svg>
  )
}

export function CheckboxCheckedIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M5 8.2l2 2 4-4.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ShuffleIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 8.5l3 3M2.5 8.5l3-3M2.5 8.5h6.5" />
      <path d="M13.5 7.5l-3-3M13.5 7.5l-3 3M13.5 7.5H7" />
    </svg>
  )
}

/** Two overlapping people — team/group */
export function TeamIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <circle cx="7" cy="6" r="2.6" />
      <path d="M2 16c0-3 2.2-5 5-5s5 2 5 5z" />
      <circle cx="14.5" cy="7" r="2.1" opacity="0.55" />
      <path d="M10.8 16c.3-2.6 2-4.3 4.2-4.3s3.6 1.5 4 3.6z" opacity="0.55" />
    </svg>
  )
}

// ── Semantic-colored — the color is part of the meaning ─────────────────

export function WarningIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5l7 12.5H1z" fill="#F59E0B" />
      <path d="M8 6v3.5" stroke="#7C2D12" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.75" fill="#7C2D12" />
    </svg>
  )
}

export function CheckCircleIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="#10B981" />
      <path d="M5 8.2l2 2 4-4.2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function XCircleIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="#EF4444" />
      <path d="M5.7 5.7l4.6 4.6M10.3 5.7l-4.6 4.6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function StarFilledIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="#F59E0B" aria-hidden="true">
      <path d="M8 1.2l2.06 4.18 4.6.67-3.33 3.25.79 4.58L8 11.7l-4.12 2.17.79-4.58L1.34 6.05l4.6-.67z" />
    </svg>
  )
}

export function TrophyIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 2.5h6v4a3 3 0 01-6 0z" fill="#F59E0B" />
      <path d="M5 3.5H2.5a2 2 0 002 2H5M11 3.5h2.5a2 2 0 01-2 2H11" stroke="#B45309" strokeWidth="1.1" />
      <path d="M7 9.3v2M6 13.5h4l-.5-2h-3z" fill="#B45309" />
    </svg>
  )
}

export function FireIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5c1 2 3.5 3 3.5 6.5a3.5 3.5 0 01-7 0c0-1 .4-1.7.9-2.3-.1.9.2 1.5.7 1.8C6 6.5 6.5 4.5 8 1.5z" fill="#F97316" />
      <path d="M8 9.2a1.5 1.5 0 01-1.5-1.5c0-.5.2-.8.4-1.1.1.5.4.8.8.9.1-.5-.1-.9-.3-1.3.8.5 1.6 1.2 1.6 2A1.5 1.5 0 018 9.2z" fill="#FDE68A" />
    </svg>
  )
}

export function CelebrateIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 14l3.5-9.5L11.5 10z" fill="#60A5FA" />
      <rect x="9.5" y="1.5" width="2" height="2" rx="0.4" fill="#F59E0B" transform="rotate(20 10.5 2.5)" />
      <rect x="12.5" y="4.5" width="1.6" height="1.6" rx="0.4" fill="#F472B6" transform="rotate(-15 13.3 5.3)" />
      <circle cx="13" cy="2" r="0.9" fill="#34D399" />
      <circle cx="4" cy="2.5" r="0.8" fill="#F472B6" />
    </svg>
  )
}
