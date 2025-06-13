import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'

import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AssetsPage from './pages/AssetsPage'
import PurchasesPage from './pages/PurchasesPage'
import TransfersPage from './pages/TransfersPage'
import AssignmentsPage from './pages/AssignmentsPage'
import ExpendituresPage from './pages/ExpendituresPage'
import UsersPage from './pages/UsersPage'
import BasesPage from './pages/BasesPage'
import LoadingSpinner from './components/LoadingSpinner'

// Protected Route Component
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } 
        />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/assets" element={<AssetsPage />} />
                  <Route path="/purchases" element={<PurchasesPage />} />
                  <Route path="/transfers" element={<TransfersPage />} />
                  <Route 
                    path="/assignments" 
                    element={
                      <ProtectedRoute roles={['ADMIN', 'BASE_COMMANDER']}>
                        <AssignmentsPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/expenditures" 
                    element={
                      <ProtectedRoute roles={['ADMIN', 'BASE_COMMANDER']}>
                        <ExpendituresPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/users" 
                    element={
                      <ProtectedRoute roles={['ADMIN']}>
                        <UsersPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/bases" 
                    element={
                      <ProtectedRoute roles={['ADMIN']}>
                        <BasesPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Box>
  )
}

export default App
