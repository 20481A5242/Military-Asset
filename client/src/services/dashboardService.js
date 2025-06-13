import api from './api'

export const dashboardService = {
  // Get dashboard metrics
  getMetrics: async (filters = {}) => {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value)
      }
    })
    
    const response = await api.get(`/dashboard/metrics?${params}`)
    return response.data
  },

  // Get net movement details
  getNetMovementDetails: async (filters = {}) => {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value)
      }
    })
    
    const response = await api.get(`/dashboard/net-movement-details?${params}`)
    return response.data
  },

  // Get recent activities
  getRecentActivities: async (limit = 10) => {
    const response = await api.get(`/dashboard/recent-activities?limit=${limit}`)
    return response.data
  },

  // Get asset distribution
  getAssetDistribution: async () => {
    const response = await api.get('/dashboard/asset-distribution')
    return response.data
  },
}
