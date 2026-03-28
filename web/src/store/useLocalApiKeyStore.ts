import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type State = {
  googleApiKey: string | null
  setGoogleApiKey: (k: string | null) => void
}

export const useLocalApiKeyStore = create<State>()(
  persist(
    (set) => ({
      googleApiKey: null,
      setGoogleApiKey: (k) => set({ googleApiKey: k }),
    }),
    { name: 'budgio-iq-local-apikey' },
  ),
)
