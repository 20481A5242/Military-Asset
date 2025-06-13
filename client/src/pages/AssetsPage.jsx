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
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
  Build as MaintenanceIcon,
  CheckCircle as AvailableIcon,
  Error as ExpendedIcon,
  LocalShipping as InTransitIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm, Controller } from 'react-hook-form'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import assetService from '../services/assetService'

const AssetsPage = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // State management
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [filters, setFilters] = useState({
    search: '',
    equipmentType: '',
    status: '',
    baseId: user?.role === 'BASE_COMMANDER' ? user.baseId : ''
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)

  // Form management
  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      serialNumber: '',
      name: '',
      description: '',
      equipmentType: 'VEHICLE',
      baseId: user?.baseId || '',
      value: '',
      acquisitionDate: null,
      warrantyExpiry: null
    }
  })

  // Equipment types and statuses
  const equipmentTypes = [
    'VEHICLE',
    'WEAPON',
    'AMMUNITION',
    'COMMUNICATION',
    'MEDICAL',
    'SUPPLY',
    'OTHER'
  ]

  const assetStatuses = [
    { value: 'AVAILABLE', label: 'Available', color: 'success', icon: AvailableIcon },
    { value: 'ASSIGNED', label: 'Assigned', color: 'primary', icon: AssignmentIcon },
    { value: 'IN_TRANSIT', label: 'In Transit', color: 'info', icon: InTransitIcon },
    { value: 'MAINTENANCE', label: 'Maintenance', color: 'warning', icon: MaintenanceIcon },
    { value: 'EXPENDED', label: 'Expended', color: 'error', icon: ExpendedIcon },
    { value: 'DECOMMISSIONED', label: 'Decommissioned', color: 'default', icon: ExpendedIcon }
  ]

  // Fetch assets
  const {
    data: assetsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['assets', page, rowsPerPage, filters],
    () => assetService.getAssets({
      page: page + 1,
      limit: rowsPerPage,
      ...filters
    }),
    {
      keepPreviousData: true
    }
  )

  // Create asset mutation
  const createAssetMutation = useMutation(
    assetService.createAsset,
    {
      onSuccess: () => {
        toast.success('Asset created successfully')
        setCreateDialogOpen(false)
        reset()
        queryClient.invalidateQueries('assets')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to create asset')
      }
    }
  )

  // Update asset mutation
  const updateAssetMutation = useMutation(
    ({ id, data }) => assetService.updateAsset(id, data),
    {
      onSuccess: () => {
        toast.success('Asset updated successfully')
        setEditDialogOpen(false)
        reset()
        queryClient.invalidateQueries('assets')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to update asset')
      }
    }
  )

  // Delete asset mutation
  const deleteAssetMutation = useMutation(
    assetService.deleteAsset,
    {
      onSuccess: () => {
        toast.success('Asset deleted successfully')
        queryClient.invalidateQueries('assets')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to delete asset')
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
      equipmentType: '',
      status: '',
      baseId: user?.role === 'BASE_COMMANDER' ? user.baseId : ''
    })
    setPage(0)
  }

  const handleCreateAsset = (data) => {
    const formattedData = {
      ...data,
      value: data.value ? parseFloat(data.value) : null,
      acquisitionDate: data.acquisitionDate ? data.acquisitionDate.toISOString() : null,
      warrantyExpiry: data.warrantyExpiry ? data.warrantyExpiry.toISOString() : null
    }
    createAssetMutation.mutate(formattedData)
  }

  const handleEditAsset = (data) => {
    const formattedData = {
      ...data,
      value: data.value ? parseFloat(data.value) : null,
      acquisitionDate: data.acquisitionDate ? data.acquisitionDate.toISOString() : null,
      warrantyExpiry: data.warrantyExpiry ? data.warrantyExpiry.toISOString() : null
    }
    updateAssetMutation.mutate({ id: selectedAsset.id, data: formattedData })
  }

  const handleViewAsset = (asset) => {
    setSelectedAsset(asset)
    setViewDialogOpen(true)
  }

  const handleEditClick = (asset) => {
    setSelectedAsset(asset)
    setValue('serialNumber', asset.serialNumber)
    setValue('name', asset.name)
    setValue('description', asset.description || '')
    setValue('equipmentType', asset.equipmentType)
    setValue('baseId', asset.baseId)
    setValue('value', asset.value || '')
    setValue('acquisitionDate', asset.acquisitionDate ? dayjs(asset.acquisitionDate) : null)
    setValue('warrantyExpiry', asset.warrantyExpiry ? dayjs(asset.warrantyExpiry) : null)
    setEditDialogOpen(true)
  }

  const handleDeleteAsset = (asset) => {
    if (window.confirm(`Are you sure you want to delete asset "${asset.name}"?`)) {
      deleteAssetMutation.mutate(asset.id)
    }
  }

  const getStatusInfo = (status) => {
    return assetStatuses.find(s => s.value === status) || assetStatuses[0]
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading assets..." />
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Error loading assets: {error.message}
        </Alert>
      </Box>
    )
  }

  const assets = assetsData?.data?.assets || []
  const pagination = assetsData?.data?.pagination || { total: 0 }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Assets Management
        </Typography>
        {['ADMIN', 'BASE_COMMANDER'].includes(user?.role) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New Asset
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
                placeholder="Name, serial number..."
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
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
              <TextField
                fullWidth
                select
                label="Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {assetStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </TextField>
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

      {/* Assets Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Asset</TableCell>
                <TableCell>Serial Number</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Base</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 3 }}>
                      <InventoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        No assets found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create your first asset to get started
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => {
                  const statusInfo = getStatusInfo(asset.status)
                  const StatusIcon = statusInfo.icon

                  return (
                    <TableRow key={asset.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: `${statusInfo.color}.light` }}>
                            <StatusIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {asset.name}
                            </Typography>
                            {asset.description && (
                              <Typography variant="caption" color="text.secondary">
                                {asset.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {asset.serialNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={asset.equipmentType.replace('_', ' ')}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          color={statusInfo.color}
                          icon={<StatusIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={asset.base?.name || 'Unknown'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {asset.value ? `$${asset.value.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewAsset(asset)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {['ADMIN', 'BASE_COMMANDER'].includes(user?.role) && (
                          <>
                            <Tooltip title="Edit Asset">
                              <IconButton
                                size="small"
                                onClick={() => handleEditClick(asset)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            {user?.role === 'ADMIN' && (
                              <Tooltip title="Delete Asset">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteAsset(asset)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
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

      {/* Create Asset Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Asset</DialogTitle>
        <form onSubmit={handleSubmit(handleCreateAsset)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="serialNumber"
                  control={control}
                  rules={{ required: 'Serial number is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Serial Number"
                      error={!!errors.serialNumber}
                      helperText={errors.serialNumber?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Asset name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Asset Name"
                      error={!!errors.name}
                      helperText={errors.name?.message}
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
              <Grid item xs={12} sm={6}>
                <Controller
                  name="equipmentType"
                  control={control}
                  rules={{ required: 'Equipment type is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      select
                      label="Equipment Type"
                      error={!!errors.equipmentType}
                      helperText={errors.equipmentType?.message}
                    >
                      {equipmentTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type.replace('_', ' ')}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="value"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Value"
                      type="number"
                      InputProps={{ startAdornment: '$' }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="acquisitionDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Acquisition Date"
                      renderInput={(params) => (
                        <TextField {...params} fullWidth />
                      )}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="warrantyExpiry"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Warranty Expiry"
                      renderInput={(params) => (
                        <TextField {...params} fullWidth />
                      )}
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
              disabled={createAssetMutation.isLoading}
            >
              {createAssetMutation.isLoading ? 'Creating...' : 'Create Asset'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Asset</DialogTitle>
        <form onSubmit={handleSubmit(handleEditAsset)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="serialNumber"
                  control={control}
                  rules={{ required: 'Serial number is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Serial Number"
                      error={!!errors.serialNumber}
                      helperText={errors.serialNumber?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Asset name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Asset Name"
                      error={!!errors.name}
                      helperText={errors.name?.message}
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
              <Grid item xs={12} sm={6}>
                <Controller
                  name="equipmentType"
                  control={control}
                  rules={{ required: 'Equipment type is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      select
                      label="Equipment Type"
                      error={!!errors.equipmentType}
                      helperText={errors.equipmentType?.message}
                    >
                      {equipmentTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type.replace('_', ' ')}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="value"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Value"
                      type="number"
                      InputProps={{ startAdornment: '$' }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="acquisitionDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Acquisition Date"
                      renderInput={(params) => (
                        <TextField {...params} fullWidth />
                      )}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="warrantyExpiry"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Warranty Expiry"
                      renderInput={(params) => (
                        <TextField {...params} fullWidth />
                      )}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={updateAssetMutation.isLoading}
            >
              {updateAssetMutation.isLoading ? 'Updating...' : 'Update Asset'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Asset Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Asset Details</DialogTitle>
        <DialogContent>
          {selectedAsset && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Asset Name
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedAsset.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Serial Number
                </Typography>
                <Typography variant="body1" fontFamily="monospace" gutterBottom>
                  {selectedAsset.serialNumber}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Equipment Type
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedAsset.equipmentType?.replace('_', ' ')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={getStatusInfo(selectedAsset.status).label}
                  color={getStatusInfo(selectedAsset.status).color}
                  sx={{ mb: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Base
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedAsset.base?.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Value
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedAsset.value ? `$${selectedAsset.value.toLocaleString()}` : 'Not specified'}
                </Typography>
              </Grid>
              {selectedAsset.description && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedAsset.description}
                  </Typography>
                </Grid>
              )}
              {selectedAsset.acquisitionDate && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Acquisition Date
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {dayjs(selectedAsset.acquisitionDate).format('MMMM DD, YYYY')}
                  </Typography>
                </Grid>
              )}
              {selectedAsset.warrantyExpiry && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Warranty Expiry
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {dayjs(selectedAsset.warrantyExpiry).format('MMMM DD, YYYY')}
                  </Typography>
                </Grid>
              )}

              {/* Current Assignment */}
              {selectedAsset.assignments && selectedAsset.assignments.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Current Assignment
                  </Typography>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1 }}>
                      <Typography variant="body2">
                        Assigned to: <strong>{selectedAsset.assignments[0].assignedTo?.firstName} {selectedAsset.assignments[0].assignedTo?.lastName}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Since: {dayjs(selectedAsset.assignments[0].assignedAt).format('MMM DD, YYYY')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Purchase Information */}
              {selectedAsset.purchase && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Purchase Information
                  </Typography>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1 }}>
                      <Typography variant="body2">
                        Purchase Order: <strong>{selectedAsset.purchase.purchaseOrder}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Vendor: {selectedAsset.purchase.vendor}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Date: {dayjs(selectedAsset.purchase.purchaseDate).format('MMM DD, YYYY')}
                      </Typography>
                    </CardContent>
                  </Card>
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

export default AssetsPage
