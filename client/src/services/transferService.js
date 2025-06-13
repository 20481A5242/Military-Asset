import api from './api'

export const transferService = {
  // Get all transfers with filters
  getTransfers: async (params = {}) => {
    const response = await api.get('/transfers', { params })
    return response.data
  },

  // Get transfer by ID
  getTransferById: async (id) => {
    const response = await api.get(`/transfers/${id}`)
    return response.data
  },

  // Create new transfer
  createTransfer: async (data) => {
    const response = await api.post('/transfers', data)
    return response.data
  },

  // Approve transfer
  approveTransfer: async (id, data = {}) => {
    const response = await api.put(`/transfers/${id}/approve`, data)
    return response.data
  },

  // Complete transfer
  completeTransfer: async (id) => {
    const response = await api.put(`/transfers/${id}/complete`)
    return response.data
  },

  // Cancel transfer
  cancelTransfer: async (id, data = {}) => {
    const response = await api.put(`/transfers/${id}/cancel`, data)
    return response.data
  }
}

export default transferService
