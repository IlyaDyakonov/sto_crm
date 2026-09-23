import type { ReactNode } from 'react'

type StatusBlockProps = {
  loading: boolean
  error: string | null
  empty?: boolean
  emptyText?: string
  children: ReactNode
}

/** Общий блок loading / error / empty / content для страниц. */
export function StatusBlock({
  loading,
  error,
  empty = false,
  emptyText = 'Нет данных',
  children,
}: StatusBlockProps) {
  if (loading) {
    return <p>Загрузка…</p>
  }
  if (error) {
    return <p>Ошибка: {error}</p>
  }
  if (empty) {
    return <p>{emptyText}</p>
  }
  return <>{children}</>
}
