import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('viewMode') || 'admin'
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setUser(JSON.parse(userData))
    }
    setLoading(false)
  }, [])

  const toggleViewMode = () => {
    const nextMode = viewMode === 'admin' ? 'employee' : 'admin'
    setViewMode(nextMode)
    localStorage.setItem('viewMode', nextMode)
    return nextMode
  }

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { access_token, role, user_id, full_name, organization_id, organization_name } = res.data
    const userData = { email, role, user_id, full_name, organization_id, organization_name, token: access_token }
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    if (role === 'admin') {
      setViewMode('admin')
      localStorage.setItem('viewMode', 'admin')
    }
    setUser(userData)
    return userData
  }

  const register = async (data) => {
    const res = await api.post('/auth/register', data)
    return res.data
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
    setViewMode('admin')
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, viewMode, toggleViewMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
