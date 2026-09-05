import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { login as loginRequest } from '@/api/auth'
import { setStoredToken } from '@/api/client'
import {
  TOKEN_STORAGE_KEY,
  authUserFromToken,
  isTokenExpired,
} from '@/utils/jwt'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY))
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    return stored ? authUserFromToken(stored) : null
  })
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const logout = useCallback(() => {
    setStoredToken(null)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    if (token && isTokenExpired(token)) {
      logout()
    }
    setIsBootstrapping(false)
  }, [token, logout])

  useEffect(() => {
    const onSessionExpired = () => logout()
    window.addEventListener('diw:session-expired', onSessionExpired)
    return () => window.removeEventListener('diw:session-expired', onSessionExpired)
  }, [logout])

  const login = useCallback(async (username, password) => {
    const response = await loginRequest(username, password)
    setStoredToken(response.access_token)
    setToken(response.access_token)

    const nextUser = authUserFromToken(response.access_token)
    if (!nextUser) throw new Error('Invalid token received from server')

    setUser(nextUser)
    return nextUser
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isBootstrapping,
      login,
      logout,
    }),
    [user, token, isBootstrapping, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
