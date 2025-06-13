import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Tooltip,
  Alert
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm, Controller } from 'react-hook-form'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import purchaseService from '../services/purchaseService'

const PurchasesPage = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // State management
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [filters, setFilters] = useState({
    search: '',
    vendor: '',
    dateFrom: null,
    dateTo: null,
    equipmentType: ''
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState(null)

  // Form management
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      purchaseOrder: '',
      vendor: '',
      totalAmount: '',
      purchaseDate: dayjs(),
      description: '',
      baseId: user?.baseId || '',
      assets: [{ serialNumber: '', name: '', equipmentType: 'VEHICLE', value: '' }]
    }
  })

  // Equipment types
  const equipmentTypes = [
    'VEHICLE',
    'WEAPON',
    'AMMUNITION',
    'COMMUNICATION',
    'MEDICAL',
    'SUPPLY',
    'OTHER'
  ]

  // Fetch purchases
  const {
    data: purchasesData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['purchases', page, rowsPerPage, filters],
    () => purchaseService.getPurchases({
      page: page + 1,
      limit: rowsPerPage,
      ...filters
    }),
    {
      keepPreviousData: true
    }
  )

  // Create purchase mutation
  const createPurchaseMutation = useMutation(
    purchaseService.createPurchase,
    {
      onSuccess: () => {
        toast.success('Purchase created successfully')
        setCreateDialogOpen(false)
        reset()
        queryClient.invalidateQueries('purchases')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to create purchase')
      }
    }
  )

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
    setPage(0)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      vendor: '',
      dateFrom: null,
      dateTo: null,
      equipmentType: ''
    })
    setPage(0)
  }

  const handleCreatePurchase = (data) => {
    const formattedData = {
      ...data,
      purchaseDate: data.purchaseDate.toISOString(),
      totalAmount: parseFloat(data.totalAmount),
      assets: data.assets.map(asset => ({
        ...asset,
        value: asset.value ? parseFloat(asset.value) : null
      }))
    }
    createPurchaseMutation.mutate(formattedData)
  }

  const handleViewPurchase = (purchase) => {
    setSelectedPurchase(purchase)
    setViewDialogOpen(true)
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading purchases..." />
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Error loading purchases: {error.message}
        </Alert>
      </Box>
    )
  }

  const purchases = purchasesData?.data?.purchases || []
  const pagination = purchasesData?.data?.pagination || { total: 0 }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Purchases Management
        </Typography>
        {['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'].includes(user?.role) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New Purchase
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Vendor"
                value={filters.vendor}
                onChange={(e) => handleFilterChange('vendor', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                select
                label="Equipment Type"
                value={filters.equipmentType}
                onChange={(e) => handleFilterChange('equipmentType', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                {equipmentTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="From Date"
                value={filters.dateFrom}
                onChange={(value) => handleFilterChange('dateFrom', value)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="To Date"
                value={filters.dateTo}
                onChange={(value) => handleFilterChange('dateTo', value)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={1}>
              <Tooltip title="Clear Filters">
                <IconButton onClick={clearFilters}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Purchase Order</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Base</TableCell>
                <TableCell>Assets</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 3 }}>
                      <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        No purchases found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create your first purchase to get started
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id} hover>
                    <TableCell>{purchase.purchaseOrder}</TableCell>
                    <TableCell>{purchase.vendor}</TableCell>
                    <TableCell>${purchase.totalAmount?.toLocaleString()}</TableCell>
                    <TableCell>
                      {dayjs(purchase.purchaseDate).format('MMM DD, YYYY')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={purchase.base?.name || 'Unknown'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${purchase.assets?.length || 0} items`}
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewPurchase(purchase)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={pagination.total}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10))
            setPage(0)
          }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Card>

      {/* Create Purchase Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Purchase</DialogTitle>
        <form onSubmit={handleSubmit(handleCreatePurchase)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="purchaseOrder"
                  control={control}
                  rules={{ required: 'Purchase order is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Purchase Order"
                      error={!!errors.purchaseOrder}
                      helperText={errors.purchaseOrder?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="vendor"
                  control={control}
                  rules={{ required: 'Vendor is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Vendor"
                      error={!!errors.vendor}
                      helperText={errors.vendor?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="totalAmount"
                  control={control}
                  rules={{
                    required: 'Total amount is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Total Amount"
                      type="number"
                      InputProps={{ startAdornment: '$' }}
                      error={!!errors.totalAmount}
                      helperText={errors.totalAmount?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="purchaseDate"
                  control={control}
                  rules={{ required: 'Purchase date is required' }}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Purchase Date"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          error={!!errors.purchaseDate}
                          helperText={errors.purchaseDate?.message}
                        />
                      )}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Description"
                      multiline
                      rows={3}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createPurchaseMutation.isLoading}
            >
              {createPurchaseMutation.isLoading ? 'Creating...' : 'Create Purchase'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Purchase Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Purchase Details</DialogTitle>
        <DialogContent>
          {selectedPurchase && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Purchase Order
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPurchase.purchaseOrder}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Vendor
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPurchase.vendor}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Amount
                </Typography>
                <Typography variant="body1" gutterBottom>
                  ${selectedPurchase.totalAmount?.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Purchase Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {dayjs(selectedPurchase.purchaseDate).format('MMMM DD, YYYY')}
                </Typography>
              </Grid>
              {selectedPurchase.description && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedPurchase.description}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Assets ({selectedPurchase.assets?.length || 0})
                </Typography>
                {selectedPurchase.assets?.map((asset, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1 }}>
                      <Typography variant="body2">
                        <strong>{asset.name}</strong> - {asset.serialNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {asset.equipmentType} {asset.value && `• $${asset.value.toLocaleString()}`}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default PurchasesPage
