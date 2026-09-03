/**
 * Copy this file (and useFacilitatorMode.ts) into src/components/ / src/
 * when adopting in an app. See useFacilitatorMode.ts for the full usage
 * example and the html.facilitator-mode CSS rule this button toggles.
 */

interface FacilitatorToggleProps {
  active: boolean
  onToggle: () => void
  labelOn: string
  labelOff: string
}

function ProjectorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="1" y="3" width="14" height="9" rx="1" />
      <path d="M8 12v2M5 14h6" />
      <circle cx="8" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function FacilitatorToggle({ active, onToggle, labelOn, labelOff }: FacilitatorToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      title={active ? labelOff : labelOn}
      className={`p-1.5 rounded-lg transition-colors ${
        active
          ? 'text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-gray-800'
          : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
      }`}
    >
      <ProjectorIcon className="w-4 h-4" />
    </button>
  )
}
