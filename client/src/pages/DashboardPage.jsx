import React, { useState } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  Inventory,
  Assignment,
  ShoppingCart,
  SwapHoriz,
  Refresh,
  FilterList,
  Info,
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useQuery } from 'react-query'
import dayjs from 'dayjs'

import { dashboardService } from '../services/dashboardService'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

const DashboardPage = () => {
  const { user } = useAuth()
  const [filters, setFilters] = useState({
    baseId: user?.role !== 'ADMIN' ? user?.baseId : '',
    equipmentType: '',
    dateFrom: null,
    dateTo: null,
  })
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Fetch dashboard metrics
  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useQuery(
    ['dashboard-metrics', filters],
    () => dashboardService.getMetrics(filters),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  )

  // Fetch net movement details
  const {
    data: netMovementDetails,
    isLoading: detailsLoading,
  } = useQuery(
    ['net-movement-details', filters],
    () => dashboardService.getNetMovementDetails(filters),
    {
      enabled: detailsOpen,
    }
  )

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const clearFilters = () => {
    setFilters({
      baseId: user?.role !== 'ADMIN' ? user?.baseId : '',
      equipmentType: '',
      dateFrom: null,
      dateTo: null,
    })
  }

  const equipmentTypes = [
    'VEHICLE',
    'WEAPON',
    'AMMUNITION',
    'COMMUNICATION',
    'MEDICAL',
    'SUPPLY',
    'OTHER',
  ]

  if (metricsLoading) {
    return <LoadingSpinner message="Loading dashboard..." />
  }

  const metricsData = metrics?.data || {}

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => refetchMetrics()}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FilterList />
          <Typography variant="h6">Filters</Typography>
          <Button size="small" onClick={clearFilters}>
            Clear All
          </Button>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Equipment Type"
              value={filters.equipmentType}
              onChange={(e) => handleFilterChange('equipmentType', e.target.value)}
              size="small"
            >
              <MenuItem value="">All Types</MenuItem>
              {equipmentTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="Date From"
              value={filters.dateFrom}
              onChange={(value) => handleFilterChange('dateFrom', value)}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="Date To"
              value={filters.dateTo}
              onChange={(value) => handleFilterChange('dateTo', value)}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Opening Balance
                  </Typography>
                  <Typography variant="h4">
                    {metricsData.openingBalance || 0}
                  </Typography>
                </Box>
                <Inventory sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Closing Balance
                  </Typography>
                  <Typography variant="h4">
                    {metricsData.closingBalance || 0}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setDetailsOpen(true)}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Net Movement
                  </Typography>
                  <Typography variant="h4" color={metricsData.netMovement >= 0 ? 'success.main' : 'error.main'}>
                    {metricsData.netMovement >= 0 ? '+' : ''}{metricsData.netMovement || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SwapHoriz sx={{ fontSize: 40, color: 'info.main' }} />
                  <IconButton size="small">
                    <Info />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Currently Assigned
                  </Typography>
                  <Typography variant="h4">
                    {metricsData.assigned || 0}
                  </Typography>
                </Box>
                <Assignment sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Secondary Metrics */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Purchases
                  </Typography>
                  <Typography variant="h5">
                    {metricsData.purchases || 0}
                  </Typography>
                </Box>
                <ShoppingCart sx={{ fontSize: 32, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Transfers In
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    +{metricsData.transfersIn || 0}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 32, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Transfers Out
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    -{metricsData.transfersOut || 0}
                  </Typography>
                </Box>
                <TrendingDown sx={{ fontSize: 32, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Expended
                  </Typography>
                  <Typography variant="h5">
                    {metricsData.expended || 0}
                  </Typography>
                </Box>
                <TrendingDown sx={{ fontSize: 32, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Net Movement Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Net Movement Details
          <Typography variant="body2" color="text.secondary">
            Breakdown of purchases, transfers in, and transfers out
          </Typography>
        </DialogTitle>
        <DialogContent>
          {detailsLoading ? (
            <LoadingSpinner message="Loading details..." />
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Chip
                  label={`Purchases: +${metricsData.purchases || 0}`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label={`Transfers In: +${metricsData.transfersIn || 0}`}
                  color="info"
                  variant="outlined"
                />
                <Chip
                  label={`Transfers Out: -${metricsData.transfersOut || 0}`}
                  color="error"
                  variant="outlined"
                />
              </Box>
              
              {/* Additional details would be rendered here */}
              <Typography variant="body2" color="text.secondary">
                Detailed transaction history would be displayed here with tables showing individual purchases, transfers, etc.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DashboardPage
