import axios from 'axios'
import toast from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const { response } = error

    // Handle different error status codes
    if (response) {
      switch (response.status) {
        case 401:
          // Unauthorized - token expired or invalid
          localStorage.removeItem('token')
          if (window.location.pathname !== '/login') {
            toast.error('Session expired. Please login again.')
            window.location.href = '/login'
          }
          break
        case 403:
          // Forbidden - insufficient permissions
          toast.error('Access denied. Insufficient permissions.')
          break
        case 404:
          // Not found
          toast.error('Resource not found.')
          break
        case 429:
          // Too many requests
          toast.error('Too many requests. Please try again later.')
          break
        case 500:
          // Server error
          toast.error('Server error. Please try again later.')
          break
        default:
          // Other errors
          const errorMessage = response.data?.error?.message || 'An error occurred'
          toast.error(errorMessage)
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.')
    } else {
      // Other error
      toast.error('An unexpected error occurred.')
    }

    return Promise.reject(error)
  }
)

export default api
