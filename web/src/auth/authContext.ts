import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isCloudConfigured } from '../lib/cloudMode'

export type AuthCtx = {
  session: Session | null
  user: User | null
  ready: boolean
}

export const AuthContext = createContext<AuthCtx>({
  session: null,
  user: null,
  ready: !isCloudConfigured(),
})
