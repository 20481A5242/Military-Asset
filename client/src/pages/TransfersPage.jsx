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
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
  SwapHoriz as TransferIcon,
  CheckCircle as ApproveIcon,
  Cancel as CancelIcon,
  PlayArrow as CompleteIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import transferService from '../services/transferService'
import assetService from '../services/assetService'

const TransfersPage = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // State management
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    fromBaseId: '',
    toBaseId: '',
    dateFrom: null,
    dateTo: null
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState(null)

  // Form management
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      fromBaseId: user?.baseId || '',
      toBaseId: '',
      reason: '',
      notes: '',
      assets: []
    }
  })

  const { fields: assetFields, append: appendAsset, remove: removeAsset } = useFieldArray({
    control,
    name: 'assets'
  })

  // Transfer statuses
  const transferStatuses = [
    { value: 'PENDING', label: 'Pending', color: 'warning' },
    { value: 'APPROVED', label: 'Approved', color: 'info' },
    { value: 'IN_TRANSIT', label: 'In Transit', color: 'primary' },
    { value: 'COMPLETED', label: 'Completed', color: 'success' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'error' }
  ]

  // Fetch transfers
  const {
    data: transfersData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['transfers', page, rowsPerPage, filters],
    () => transferService.getTransfers({
      page: page + 1,
      limit: rowsPerPage,
      ...filters
    }),
    {
      keepPreviousData: true
    }
  )

  // Fetch available assets for transfer
  const { data: assetsData } = useQuery(
    ['assets', 'available'],
    () => assetService.getAssets({
      status: 'AVAILABLE',
      baseId: user?.baseId,
      limit: 100
    }),
    {
      enabled: createDialogOpen && !!user?.baseId
    }
  )

  // Create transfer mutation
  const createTransferMutation = useMutation(
    transferService.createTransfer,
    {
      onSuccess: () => {
        toast.success('Transfer created successfully')
        setCreateDialogOpen(false)
        reset()
        queryClient.invalidateQueries('transfers')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to create transfer')
      }
    }
  )

  // Approve transfer mutation
  const approveTransferMutation = useMutation(
    ({ id, data }) => transferService.approveTransfer(id, data),
    {
      onSuccess: () => {
        toast.success('Transfer approved successfully')
        queryClient.invalidateQueries('transfers')
        setViewDialogOpen(false)
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to approve transfer')
      }
    }
  )

  // Complete transfer mutation
  const completeTransferMutation = useMutation(
    transferService.completeTransfer,
    {
      onSuccess: () => {
        toast.success('Transfer completed successfully')
        queryClient.invalidateQueries('transfers')
        setViewDialogOpen(false)
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to complete transfer')
      }
    }
  )

  // Cancel transfer mutation
  const cancelTransferMutation = useMutation(
    ({ id, data }) => transferService.cancelTransfer(id, data),
    {
      onSuccess: () => {
        toast.success('Transfer cancelled successfully')
        queryClient.invalidateQueries('transfers')
        setViewDialogOpen(false)
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to cancel transfer')
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
      status: '',
      fromBaseId: '',
      toBaseId: '',
      dateFrom: null,
      dateTo: null
    })
    setPage(0)
  }

  const handleCreateTransfer = (data) => {
    if (data.assets.length === 0) {
      toast.error('Please select at least one asset to transfer')
      return
    }

    const formattedData = {
      ...data,
      assets: data.assets.map(asset => ({
        assetId: asset.assetId,
        quantity: 1,
        notes: asset.notes || ''
      }))
    }
    createTransferMutation.mutate(formattedData)
  }

  const handleViewTransfer = (transfer) => {
    setSelectedTransfer(transfer)
    setViewDialogOpen(true)
  }

  const handleApproveTransfer = () => {
    if (selectedTransfer) {
      approveTransferMutation.mutate({
        id: selectedTransfer.id,
        data: {}
      })
    }
  }

  const handleCompleteTransfer = () => {
    if (selectedTransfer) {
      completeTransferMutation.mutate(selectedTransfer.id)
    }
  }

  const handleCancelTransfer = () => {
    if (selectedTransfer) {
      const reason = prompt('Please provide a reason for cancellation:')
      if (reason) {
        cancelTransferMutation.mutate({
          id: selectedTransfer.id,
          data: { reason }
        })
      }
    }
  }

  const addAssetToTransfer = () => {
    appendAsset({ assetId: '', notes: '' })
  }

  const getStatusColor = (status) => {
    const statusObj = transferStatuses.find(s => s.value === status)
    return statusObj?.color || 'default'
  }

  const getStepperActiveStep = (status) => {
    switch (status) {
      case 'PENDING': return 0
      case 'APPROVED': return 1
      case 'IN_TRANSIT': return 1
      case 'COMPLETED': return 2
      case 'CANCELLED': return -1
      default: return 0
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading transfers..." />
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Error loading transfers: {error.message}
        </Alert>
      </Box>
    )
  }

  const transfers = transfersData?.data?.transfers || []
  const pagination = transfersData?.data?.pagination || { total: 0 }
  const availableAssets = assetsData?.data?.assets || []

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Asset Transfers
        </Typography>
        {['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'].includes(user?.role) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New Transfer
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
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                select
                label="Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {transferStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
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

      {/* Transfers Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Transfer Code</TableCell>
                <TableCell>From Base</TableCell>
                <TableCell>To Base</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assets</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 3 }}>
                      <TransferIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        No transfers found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create your first transfer to get started
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((transfer) => (
                  <TableRow key={transfer.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {transfer.transferCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transfer.fromBase?.name || 'Unknown'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transfer.toBase?.name || 'Unknown'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transfer.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(transfer.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${transfer.transferItems?.length || 0} items`}
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      {dayjs(transfer.createdAt).format('MMM DD, YYYY')}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewTransfer(transfer)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {transfer.status === 'PENDING' && ['ADMIN', 'BASE_COMMANDER'].includes(user?.role) && (
                        <Tooltip title="Approve Transfer">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              setSelectedTransfer(transfer)
                              handleApproveTransfer()
                            }}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {transfer.status === 'APPROVED' && ['ADMIN', 'BASE_COMMANDER'].includes(user?.role) && (
                        <Tooltip title="Complete Transfer">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedTransfer(transfer)
                              handleCompleteTransfer()
                            }}
                          >
                            <CompleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {['PENDING', 'APPROVED'].includes(transfer.status) && ['ADMIN', 'BASE_COMMANDER'].includes(user?.role) && (
                        <Tooltip title="Cancel Transfer">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedTransfer(transfer)
                              handleCancelTransfer()
                            }}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      )}
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

      {/* Create Transfer Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Transfer</DialogTitle>
        <form onSubmit={handleSubmit(handleCreateTransfer)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="toBaseId"
                  control={control}
                  rules={{ required: 'Destination base is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      select
                      label="To Base"
                      error={!!errors.toBaseId}
                      helperText={errors.toBaseId?.message}
                    >
                      <MenuItem value="">Select destination base</MenuItem>
                      {/* This would be populated with actual bases */}
                      <MenuItem value="base1">Fort Liberty</MenuItem>
                      <MenuItem value="base2">Camp Pendleton</MenuItem>
                      <MenuItem value="base3">Joint Base Lewis-McChord</MenuItem>
                    </TextField>
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
                      label="Reason for Transfer"
                      multiline
                      rows={3}
                      error={!!errors.reason}
                      helperText={errors.reason?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Additional Notes"
                      multiline
                      rows={2}
                    />
                  )}
                />
              </Grid>

              {/* Assets Selection */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Assets to Transfer</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addAssetToTransfer}
                    disabled={availableAssets.length === 0}
                  >
                    Add Asset
                  </Button>
                </Box>

                {assetFields.map((field, index) => (
                  <Card key={field.id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={8}>
                          <Controller
                            name={`assets.${index}.assetId`}
                            control={control}
                            rules={{ required: 'Asset is required' }}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                select
                                label="Select Asset"
                                error={!!errors.assets?.[index]?.assetId}
                                helperText={errors.assets?.[index]?.assetId?.message}
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
                        <Grid item xs={12} sm={3}>
                          <Controller
                            name={`assets.${index}.notes`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Notes"
                                size="small"
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={12} sm={1}>
                          <IconButton
                            color="error"
                            onClick={() => removeAsset(index)}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}

                {assetFields.length === 0 && (
                  <Alert severity="info">
                    No assets selected. Click "Add Asset" to select assets for transfer.
                  </Alert>
                )}
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
              disabled={createTransferMutation.isLoading}
            >
              {createTransferMutation.isLoading ? 'Creating...' : 'Create Transfer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Transfer Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Transfer Details</DialogTitle>
        <DialogContent>
          {selectedTransfer && (
            <Box>
              {/* Transfer Status Stepper */}
              <Box sx={{ mb: 3 }}>
                <Stepper activeStep={getStepperActiveStep(selectedTransfer.status)}>
                  <Step>
                    <StepLabel>Pending</StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>Approved</StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>Completed</StepLabel>
                  </Step>
                </Stepper>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Transfer Code
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedTransfer.transferCode}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedTransfer.status.replace('_', ' ')}
                    color={getStatusColor(selectedTransfer.status)}
                    sx={{ mb: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    From Base
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedTransfer.fromBase?.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    To Base
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedTransfer.toBase?.name}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Reason
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedTransfer.reason}
                  </Typography>
                </Grid>
                {selectedTransfer.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedTransfer.notes}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Assets ({selectedTransfer.transferItems?.length || 0})
                  </Typography>
                  <List>
                    {selectedTransfer.transferItems?.map((item, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemText
                            primary={item.asset?.name}
                            secondary={`Serial: ${item.asset?.serialNumber} • Type: ${item.asset?.equipmentType}`}
                          />
                          {item.notes && (
                            <ListItemSecondaryAction>
                              <Tooltip title={item.notes}>
                                <AssignmentIcon color="action" />
                              </Tooltip>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                        {index < selectedTransfer.transferItems.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Created By
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedTransfer.createdBy?.firstName} {selectedTransfer.createdBy?.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Created Date
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {dayjs(selectedTransfer.createdAt).format('MMMM DD, YYYY HH:mm')}
                  </Typography>
                </Grid>
                {selectedTransfer.approvedBy && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Approved By
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {selectedTransfer.approvedBy?.firstName} {selectedTransfer.approvedBy?.lastName}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Approved Date
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {dayjs(selectedTransfer.approvedAt).format('MMMM DD, YYYY HH:mm')}
                      </Typography>
                    </Grid>
                  </>
                )}
                {selectedTransfer.completedAt && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Completed Date
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {dayjs(selectedTransfer.completedAt).format('MMMM DD, YYYY HH:mm')}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedTransfer?.status === 'PENDING' && ['ADMIN', 'BASE_COMMANDER'].includes(user?.role) && (
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={handleApproveTransfer}
              disabled={approveTransferMutation.isLoading}
            >
              Approve
            </Button>
          )}
          {selectedTransfer?.status === 'APPROVED' && ['ADMIN', 'BASE_COMMANDER'].includes(user?.role) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<CompleteIcon />}
              onClick={handleCompleteTransfer}
              disabled={completeTransferMutation.isLoading}
            >
              Complete
            </Button>
          )}
          {['PENDING', 'APPROVED'].includes(selectedTransfer?.status) && ['ADMIN', 'BASE_COMMANDER'].includes(user?.role) && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={handleCancelTransfer}
              disabled={cancelTransferMutation.isLoading}
            >
              Cancel
            </Button>
          )}
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TransfersPage
