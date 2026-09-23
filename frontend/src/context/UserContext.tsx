import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getMe } from '../api/endpoints'
import { formatApiError } from '../api/errors'
import type { User } from '../api/types'

/** Демо-пользователи из seed (см. корневой README). */
export const DEMO_USERS = [
  { id: 1, label: '1 — director@sto.local (директор)' },
  { id: 2, label: '2 — manager.lenina@sto.local (руководитель)' },
  { id: 3, label: '3 — manager.south@sto.local (руководитель)' },
  { id: 4, label: '4 — worker.suspension@sto.local (рабочий)' },
  { id: 5, label: '5 — worker.paint@sto.local (рабочий)' },
  { id: 6, label: '6 — worker.south@sto.local (рабочий)' },
] as const

const DEFAULT_USER_ID: number = DEMO_USERS[0].id

type UserContextValue = {
  userId: number
  setUserId: (id: number) => void
  me: User | null
  meLoading: boolean
  meError: string | null
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<number>(DEFAULT_USER_ID)
  const [me, setMe] = useState<User | null>(null)
  const [meLoading, setMeLoading] = useState(true)
  const [meError, setMeError] = useState<string | null>(null)

  const setUserId = useCallback((id: number) => {
    setUserIdState(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    setMeLoading(true)
    setMeError(null)

    getMe(userId)
      .then((user) => {
        if (!cancelled) {
          setMe(user)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMe(null)
          setMeError(formatApiError(err))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMeLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const value = useMemo(
    () => ({ userId, setUserId, me, meLoading, meError }),
    [userId, setUserId, me, meLoading, meError],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) {
    throw new Error('useUser must be used within UserProvider')
  }
  return ctx
}
