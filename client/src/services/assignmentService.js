import api from './api'

export const assignmentService = {
  // Get all assignments with filters
  getAssignments: async (params = {}) => {
    const response = await api.get('/assignments', { params })
    return response.data
  },

  // Get assignment by ID
  getAssignmentById: async (id) => {
    const response = await api.get(`/assignments/${id}`)
    return response.data
  },

  // Create new assignment
  createAssignment: async (data) => {
    const response = await api.post('/assignments', data)
    return response.data
  },

  // Return assignment
  returnAssignment: async (id, data = {}) => {
    const response = await api.put(`/assignments/${id}/return`, data)
    return response.data
  }
}

export default assignmentService
