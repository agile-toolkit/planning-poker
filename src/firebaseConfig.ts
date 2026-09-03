/**
 * Firebase configuration and the feature gate that reads it.
 *
 * Deliberately separate from `firebase.ts`: this module imports nothing from
 * the Firebase SDK, so `App.tsx` can ask "is the team-session feature
 * available?" without dragging ~450 kB of SDK into the entry chunk. Everything
 * that actually touches the database lives behind the lazy-loaded
 * `TeamSession`, which is the only thing that needs it.
 */
export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL)
