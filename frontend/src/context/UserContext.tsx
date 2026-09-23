import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getMe, listDemoUsers } from '../api/endpoints'
import { formatApiError } from '../api/errors'
import type { User } from '../api/types'
import { roleLabel } from '../lib/roles'

const DEFAULT_USER_ID = 1

export function demoUserLabel(user: User): string {
  return `${user.id} — ${user.email} (${roleLabel(user.role)})`
}

type UserContextValue = {
  userId: number
  setUserId: (id: number) => void
  me: User | null
  meLoading: boolean
  meError: string | null
  /** Пользователи для select «Роль» в шапке (включая новых). */
  directory: User[]
  directoryLoading: boolean
  reloadDirectory: () => void
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<number>(DEFAULT_USER_ID)
  const [me, setMe] = useState<User | null>(null)
  const [meLoading, setMeLoading] = useState(true)
  const [meError, setMeError] = useState<string | null>(null)
  const [directory, setDirectory] = useState<User[]>([])
  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [directoryTick, setDirectoryTick] = useState(0)

  const setUserId = useCallback((id: number) => {
    setUserIdState(id)
  }, [])

  const reloadDirectory = useCallback(() => {
    setDirectoryTick((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setDirectoryLoading(true)
    listDemoUsers(userId)
      .then((users) => {
        if (!cancelled) setDirectory(users)
      })
      .catch(() => {
        if (!cancelled) setDirectory([])
      })
      .finally(() => {
        if (!cancelled) setDirectoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [directoryTick, userId])

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
    () => ({
      userId,
      setUserId,
      me,
      meLoading,
      meError,
      directory,
      directoryLoading,
      reloadDirectory,
    }),
    [
      userId,
      setUserId,
      me,
      meLoading,
      meError,
      directory,
      directoryLoading,
      reloadDirectory,
    ],
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
