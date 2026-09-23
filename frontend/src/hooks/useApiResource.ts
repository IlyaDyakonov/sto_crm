import { useCallback, useEffect, useState } from 'react'
import { formatApiError } from '../api/errors'
import { useUser } from '../context/UserContext'

type ResourceState<T> = {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Загрузка ресурса с привязкой к текущему X-User-Id.
 * При смене роли / deps / reload() данные перезапрашиваются.
 */
export function useApiResource<T>(
  fetcher: (userId: number) => Promise<T>,
  deps: readonly unknown[] = [],
): ResourceState<T> {
  const { userId } = useUser()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => {
    setTick((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetcher(userId)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null)
          setError(formatApiError(err))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps passed explicitly
  }, [userId, tick, fetcher, ...deps])

  return { data, loading, error, reload }
}
