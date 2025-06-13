import api from './api'

export const assetService = {
  // Get all assets with filters
  getAssets: async (params = {}) => {
    const response = await api.get('/assets', { params })
    return response.data
  },

  // Get asset by ID
  getAssetById: async (id) => {
    const response = await api.get(`/assets/${id}`)
    return response.data
  },

  // Create new asset
  createAsset: async (data) => {
    const response = await api.post('/assets', data)
    return response.data
  },

  // Update asset
  updateAsset: async (id, data) => {
    const response = await api.put(`/assets/${id}`, data)
    return response.data
  },

  // Delete asset
  deleteAsset: async (id) => {
    const response = await api.delete(`/assets/${id}`)
    return response.data
  }
}

export default assetService
