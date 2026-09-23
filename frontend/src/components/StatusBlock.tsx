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
    return <p className="state-msg">Загрузка…</p>
  }
  if (error) {
    return (
      <p className="state-msg state-msg--error" role="alert">
        Ошибка: {error}
      </p>
    )
  }
  if (empty) {
    return <p className="empty-hint">{emptyText}</p>
  }
  return <>{children}</>
}
