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
  Alert,
  Avatar
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
  MonetizationOn as ExpenditureIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm, Controller } from 'react-hook-form'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import expenditureService from '../services/expenditureService'
import assetService from '../services/assetService'

const ExpendituresPage = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // State management
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [filters, setFilters] = useState({
    search: '',
    reason: '',
    baseId: user?.role === 'BASE_COMMANDER' ? user.baseId : '',
    dateFrom: null,
    dateTo: null,
    equipmentType: ''
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedExpenditure, setSelectedExpenditure] = useState(null)

  // Form management
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      assetId: '',
      quantity: 1,
      reason: '',
      description: '',
      expendedAt: dayjs()
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

  // Common expenditure reasons
  const expenditureReasons = [
    'TRAINING_EXERCISE',
    'COMBAT_OPERATION',
    'MAINTENANCE_CONSUMPTION',
    'DAMAGED_BEYOND_REPAIR',
    'EXPIRED',
    'LOST',
    'STOLEN',
    'DECOMMISSIONED',
    'OTHER'
  ]

  // Fetch expenditures
  const {
    data: expendituresData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['expenditures', page, rowsPerPage, filters],
    () => expenditureService.getExpenditures({
      page: page + 1,
      limit: rowsPerPage,
      ...filters
    }),
    {
      keepPreviousData: true
    }
  )

  // Fetch available assets for expenditure
  const { data: assetsData } = useQuery(
    ['assets', 'expendable'],
    () => assetService.getAssets({
      status: 'AVAILABLE,ASSIGNED',
      baseId: user?.baseId,
      limit: 100
    }),
    {
      enabled: createDialogOpen && !!user?.baseId
    }
  )

  // Create expenditure mutation
  const createExpenditureMutation = useMutation(
    expenditureService.createExpenditure,
    {
      onSuccess: () => {
        toast.success('Expenditure recorded successfully')
        setCreateDialogOpen(false)
        reset()
        queryClient.invalidateQueries('expenditures')
        queryClient.invalidateQueries('assets')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to record expenditure')
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
      reason: '',
      baseId: user?.role === 'BASE_COMMANDER' ? user.baseId : '',
      dateFrom: null,
      dateTo: null,
      equipmentType: ''
    })
    setPage(0)
  }

  const handleCreateExpenditure = (data) => {
    const formattedData = {
      ...data,
      baseId: user?.baseId,
      expendedAt: data.expendedAt.toISOString(),
      quantity: parseInt(data.quantity)
    }
    createExpenditureMutation.mutate(formattedData)
  }

  const handleViewExpenditure = (expenditure) => {
    setSelectedExpenditure(expenditure)
    setViewDialogOpen(true)
  }

  const getReasonColor = (reason) => {
    switch (reason) {
      case 'TRAINING_EXERCISE':
      case 'COMBAT_OPERATION':
        return 'primary'
      case 'MAINTENANCE_CONSUMPTION':
        return 'info'
      case 'DAMAGED_BEYOND_REPAIR':
      case 'LOST':
      case 'STOLEN':
        return 'error'
      case 'EXPIRED':
      case 'DECOMMISSIONED':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading expenditures..." />
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Error loading expenditures: {error.message}
        </Alert>
      </Box>
    )
  }

  const expenditures = expendituresData?.data?.expenditures || []
  const pagination = expendituresData?.data?.pagination || { total: 0 }
  const availableAssets = assetsData?.data?.assets || []

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Asset Expenditures
        </Typography>
        {['ADMIN', 'BASE_COMMANDER'].includes(user?.role) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Record Expenditure
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Asset name..."
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                select
                label="Reason"
                value={filters.reason}
                onChange={(e) => handleFilterChange('reason', e.target.value)}
              >
                <MenuItem value="">All Reasons</MenuItem>
                {expenditureReasons.map((reason) => (
                  <MenuItem key={reason} value={reason}>
                    {reason.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </TextField>
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

      {/* Expenditures Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Asset</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Base</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenditures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box sx={{ py: 3 }}>
                      <ExpenditureIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        No expenditures found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Record your first expenditure to get started
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                expenditures.map((expenditure) => (
                  <TableRow key={expenditure.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'error.light' }}>
                          <WarningIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {expenditure.asset?.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {expenditure.asset?.serialNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={expenditure.reason?.replace(/_/g, ' ')}
                        size="small"
                        color={getReasonColor(expenditure.reason)}
                      />
                    </TableCell>
                    <TableCell>{expenditure.quantity}</TableCell>
                    <TableCell>
                      {dayjs(expenditure.expendedAt).format('MMM DD, YYYY')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={expenditure.base?.name || 'Unknown'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewExpenditure(expenditure)}
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

      {/* Create Expenditure Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Record Asset Expenditure</DialogTitle>
        <form onSubmit={handleSubmit(handleCreateExpenditure)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="assetId"
                  control={control}
                  rules={{ required: 'Asset is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      select
                      label="Select Asset"
                      error={!!errors.assetId}
                      helperText={errors.assetId?.message}
                    >
                      <MenuItem value="">Select an asset</MenuItem>
                      {availableAssets.map((asset) => (
                        <MenuItem key={asset.id} value={asset.id}>
                          {asset.name} - {asset.serialNumber}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="quantity"
                  control={control}
                  rules={{
                    required: 'Quantity is required',
                    min: { value: 1, message: 'Quantity must be at least 1' }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Quantity"
                      type="number"
                      error={!!errors.quantity}
                      helperText={errors.quantity?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="expendedAt"
                  control={control}
                  rules={{ required: 'Expenditure date is required' }}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Expenditure Date"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          error={!!errors.expendedAt}
                          helperText={errors.expendedAt?.message}
                        />
                      )}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="reason"
                  control={control}
                  rules={{ required: 'Reason is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      select
                      label="Reason for Expenditure"
                      error={!!errors.reason}
                      helperText={errors.reason?.message}
                    >
                      {expenditureReasons.map((reason) => (
                        <MenuItem key={reason} value={reason}>
                          {reason.replace(/_/g, ' ')}
                        </MenuItem>
                      ))}
                    </TextField>
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
                      placeholder="Provide details about the expenditure..."
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
              color="error"
              disabled={createExpenditureMutation.isLoading}
            >
              {createExpenditureMutation.isLoading ? 'Recording...' : 'Record Expenditure'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Expenditure Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Expenditure Details</DialogTitle>
        <DialogContent>
          {selectedExpenditure && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Asset
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedExpenditure.asset?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Serial: {selectedExpenditure.asset?.serialNumber}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Equipment Type
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedExpenditure.asset?.equipmentType?.replace('_', ' ')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Reason
                </Typography>
                <Chip
                  label={selectedExpenditure.reason?.replace(/_/g, ' ')}
                  color={getReasonColor(selectedExpenditure.reason)}
                  sx={{ mb: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Quantity
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedExpenditure.quantity}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Expenditure Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {dayjs(selectedExpenditure.expendedAt).format('MMMM DD, YYYY')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Base
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedExpenditure.base?.name}
                </Typography>
              </Grid>
              {selectedExpenditure.description && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedExpenditure.description}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Recorded By
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedExpenditure.createdBy?.firstName} {selectedExpenditure.createdBy?.lastName}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Recorded Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {dayjs(selectedExpenditure.createdAt).format('MMMM DD, YYYY HH:mm')}
                </Typography>
              </Grid>
              {selectedExpenditure.asset?.value && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Asset Value
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    ${selectedExpenditure.asset.value.toLocaleString()}
                  </Typography>
                </Grid>
              )}
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

export default ExpendituresPage
