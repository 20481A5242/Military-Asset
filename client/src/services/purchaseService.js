import api from './api'

export const purchaseService = {
  // Get all purchases with filters
  getPurchases: async (params = {}) => {
    const response = await api.get('/purchases', { params })
    return response.data
  },

  // Get purchase by ID
  getPurchaseById: async (id) => {
    const response = await api.get(`/purchases/${id}`)
    return response.data
  },

  // Create new purchase
  createPurchase: async (data) => {
    const response = await api.post('/purchases', data)
    return response.data
  }
}

export default purchaseService
