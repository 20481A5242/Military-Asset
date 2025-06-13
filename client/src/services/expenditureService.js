import api from './api'

export const expenditureService = {
  // Get all expenditures with filters
  getExpenditures: async (params = {}) => {
    const response = await api.get('/expenditures', { params })
    return response.data
  },

  // Get expenditure by ID
  getExpenditureById: async (id) => {
    const response = await api.get(`/expenditures/${id}`)
    return response.data
  },

  // Create new expenditure
  createExpenditure: async (data) => {
    const response = await api.post('/expenditures', data)
    return response.data
  }
}

export default expenditureService
