import api from './api'

export const userService = {
  // Get all users with filters
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params })
    return response.data
  },

  // Get user by ID
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  // Create new user
  createUser: async (data) => {
    const response = await api.post('/users', data)
    return response.data
  },

  // Update user
  updateUser: async (id, data) => {
    const response = await api.put(`/users/${id}`, data)
    return response.data
  },

  // Delete user
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  }
}

export default userService
