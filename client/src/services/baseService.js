import api from './api'

export const baseService = {
  // Get all bases with filters
  getBases: async (params = {}) => {
    const response = await api.get('/bases', { params })
    return response.data
  },

  // Get base by ID
  getBaseById: async (id) => {
    const response = await api.get(`/bases/${id}`)
    return response.data
  },

  // Create new base
  createBase: async (data) => {
    const response = await api.post('/bases', data)
    return response.data
  },

  // Update base
  updateBase: async (id, data) => {
    const response = await api.put(`/bases/${id}`, data)
    return response.data
  },

  // Delete base
  deleteBase: async (id) => {
    const response = await api.delete(`/bases/${id}`)
    return response.data
  }
}

export default baseService
