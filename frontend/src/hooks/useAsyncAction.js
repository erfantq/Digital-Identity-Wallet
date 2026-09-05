import { useCallback, useState } from 'react'
import { ApiError } from '@/api/client'

export function useAsyncAction(action) {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: false,
  })

  const run = useCallback(
    async (...args) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const data = await action(...args)
        setState({ data, error: null, loading: false })
        return data
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Something went wrong'
        setState({ data: null, error: message, loading: false })
        throw err
      }
    },
    [action],
  )

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false })
  }, [])

  return { ...state, run, reset }
}
