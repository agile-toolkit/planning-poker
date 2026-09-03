import { useEffect, useState } from 'react'

/**
 * Copy this file into src/components/ when adopting in an app. Pair with
 * <FacilitatorToggle /> for the header button.
 *
 * Facilitator (projector) mode: bigger UI, hidden secondary chrome, for
 * in-room workshops presented on a screen. Session-scoped per tab via
 * sessionStorage — pass the shared key 'agile-toolkit:facilitatorMode'
 * (the same string in every app) so the mode survives navigating between
 * suite apps within one tab: sessionStorage is already shared across
 * pages on the same origin, and a facilitator running a session across
 * several tools (e.g. Planning Poker into Scrum Facilitator) shouldn't
 * have to re-enable it each time. This was originally app-prefixed to
 * avoid "leaking" between apps, but that's exactly the behavior a
 * cross-app presentation session needs — deliberately shared now.
 *
 * State is lifted to the app's own App.tsx rather than a self-contained
 * toggle like ThemeToggle, because most apps also need to react to
 * facilitatorMode elsewhere: hiding AppHeader's language picker/nav pills,
 * hiding secondary panels, enlarging key elements.
 *
 * Also add to the app's own src/tokens.css (or index.css):
 *   html.facilitator-mode { font-size: 1.25rem; }
 * Everything sized in rem scales automatically from that one rule.
 *
 * Usage:
 *   const [facilitatorMode, toggleFacilitatorMode] = useFacilitatorMode('agile-toolkit:facilitatorMode')
 *   ...
 *   <AppHeader title={t('app.title')} hideLanguagePicker={facilitatorMode}>
 *     <ThemeToggle />
 *     <FacilitatorToggle
 *       active={facilitatorMode}
 *       onToggle={toggleFacilitatorMode}
 *       labelOn={t('facilitator.toggle_on')}
 *       labelOff={t('facilitator.toggle_off')}
 *     />
 *   </AppHeader>
 */
export function useFacilitatorMode(storageKey: string): [boolean, () => void] {
  const [facilitatorMode, setFacilitatorMode] = useState(
    () => sessionStorage.getItem(storageKey) === '1'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('facilitator-mode', facilitatorMode)
  }, [facilitatorMode])

  const toggleFacilitatorMode = () => {
    setFacilitatorMode(prev => {
      const next = !prev
      try { sessionStorage.setItem(storageKey, next ? '1' : '0') } catch { /* quota exceeded — skip silently */ }
      return next
    })
  }

  return [facilitatorMode, toggleFacilitatorMode]
}
