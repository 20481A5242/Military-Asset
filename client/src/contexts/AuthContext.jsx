import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { authService } from '../services/authService'
import toast from 'react-hot-toast'

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null,
}

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  CLEAR_ERROR: 'CLEAR_ERROR',
}

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        loading: true,
        error: null,
      }
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      }
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      }
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: null,
      }
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      }
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      }
    default:
      return state
  }
}

// Create context
const AuthContext = createContext()

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      
      if (token) {
        try {
          const response = await authService.getCurrentUser()
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: {
              user: response.data.user,
              token,
            },
          })
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('token')
          dispatch({ type: AUTH_ACTIONS.LOGOUT })
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
      }
    }

    checkAuth()
  }, [])

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START })
      
      const response = await authService.login(credentials)
      const { user, token } = response.data
      
      // Store token in localStorage
      localStorage.setItem('token', token)
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token },
      })
      
      toast.success(`Welcome back, ${user.firstName}!`)
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Login failed'
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage,
      })
      
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Logout function
  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      // Even if logout fails on server, we still want to clear local state
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      dispatch({ type: AUTH_ACTIONS.LOGOUT })
      toast.success('Logged out successfully')
    }
  }

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR })
  }

  // Check if user has required role
  const hasRole = (roles) => {
    if (!state.user) return false
    if (Array.isArray(roles)) {
      return roles.includes(state.user.role)
    }
    return state.user.role === roles
  }

  // Check if user can access base
  const canAccessBase = (baseId) => {
    if (!state.user) return false
    if (state.user.role === 'ADMIN') return true
    return state.user.baseId === baseId
  }

  const value = {
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    login,
    logout,
    clearError,
    hasRole,
    canAccessBase,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
