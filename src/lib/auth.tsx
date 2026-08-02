import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, googleProvider, isFirebaseConfigured } from './firebase'
import { fetchRole } from './firestore'
import type { Role } from './types'

interface AuthState {
  user: User | null
  role: Role | null
  loading: boolean
  isAdmin: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    return onAuthStateChanged(auth(), async (nextUser) => {
      setUser(nextUser)
      if (nextUser) {
        try {
          setRole(await fetchRole(nextUser.uid))
        } catch {
          setRole(null)
        }
      } else {
        setRole(null)
      }
      setLoading(false)
    })
  }, [])

  const value: AuthState = {
    user,
    role,
    loading,
    isAdmin: role === 'admin',
    signIn: async () => {
      await signInWithPopup(auth(), googleProvider)
    },
    signOut: async () => {
      await firebaseSignOut(auth())
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
