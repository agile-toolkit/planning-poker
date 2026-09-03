import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig'

// Re-exported so existing importers keep working; new code that only needs
// the gate should import from './firebaseConfig' directly, which costs no SDK.
export { isFirebaseConfigured }

let app: FirebaseApp | null = null

export const getFirebaseDb = () => {
  if (!isFirebaseConfigured()) return null
  if (!getApps().length) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]
  }
  return getDatabase(app)
}
