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
  Edit as EditIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  LocationOn as LocationIcon,
  Business as BaseIcon
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm, Controller } from 'react-hook-form'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import baseService from '../services/baseService'

const BasesPage = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Redirect if not admin
  if (user?.role !== 'ADMIN') {
    return (
      <Box>
        <Alert severity="error">
          Access denied. This page is only available to administrators.
        </Alert>
      </Box>
    )
  }

  // State management
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [filters, setFilters] = useState({
    search: '',
    isActive: ''
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedBase, setSelectedBase] = useState(null)

  // Form management
  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      code: '',
      location: '',
      description: '',
      isActive: true
    }
  })

  // Fetch bases
  const {
    data: basesData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['bases', page, rowsPerPage, filters],
    () => baseService.getBases({
      page: page + 1,
      limit: rowsPerPage,
      ...filters
    }),
    {
      keepPreviousData: true
    }
  )

  // Create base mutation
  const createBaseMutation = useMutation(
    baseService.createBase,
    {
      onSuccess: () => {
        toast.success('Base created successfully')
        setCreateDialogOpen(false)
        reset()
        queryClient.invalidateQueries('bases')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to create base')
      }
    }
  )

  // Update base mutation
  const updateBaseMutation = useMutation(
    ({ id, data }) => baseService.updateBase(id, data),
    {
      onSuccess: () => {
        toast.success('Base updated successfully')
        setEditDialogOpen(false)
        reset()
        queryClient.invalidateQueries('bases')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to update base')
      }
    }
  )

  // Delete base mutation
  const deleteBaseMutation = useMutation(
    baseService.deleteBase,
    {
      onSuccess: () => {
        toast.success('Base deleted successfully')
        queryClient.invalidateQueries('bases')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to delete base')
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
      isActive: ''
    })
    setPage(0)
  }

  const handleCreateBase = (data) => {
    createBaseMutation.mutate(data)
  }

  const handleEditBase = (data) => {
    updateBaseMutation.mutate({ id: selectedBase.id, data })
  }

  const handleViewBase = (base) => {
    setSelectedBase(base)
    setViewDialogOpen(true)
  }

  const handleEditClick = (base) => {
    setSelectedBase(base)
    setValue('name', base.name)
    setValue('code', base.code)
    setValue('location', base.location)
    setValue('description', base.description || '')
    setValue('isActive', base.isActive)
    setEditDialogOpen(true)
  }

  const handleDeleteBase = (base) => {
    if (window.confirm(`Are you sure you want to delete base "${base.name}"?`)) {
      deleteBaseMutation.mutate(base.id)
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading bases..." />
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Error loading bases: {error.message}
        </Alert>
      </Box>
    )
  }

  const bases = basesData?.data?.bases || []
  const pagination = basesData?.data?.pagination || { total: 0 }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Base Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Base
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Base name, code, location..."
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Status"
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
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

      {/* Bases Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Base</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Assets</TableCell>
                <TableCell>Personnel</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 3 }}>
                      <BaseIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        No bases found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create your first base to get started
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                bases.map((base) => (
                  <TableRow key={base.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>
                          <BaseIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {base.name}
                          </Typography>
                          {base.description && (
                            <Typography variant="caption" color="text.secondary">
                              {base.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {base.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                        <Typography variant="body2">
                          {base.location}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${base._count?.assets || 0} assets`}
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${base._count?.users || 0} personnel`}
                        size="small"
                        color="info"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={base.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={base.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewBase(base)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Base">
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(base)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Base">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteBase(base)}
                        >
                          <DeleteIcon />
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

      {/* Create Base Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Base</DialogTitle>
        <form onSubmit={handleSubmit(handleCreateBase)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Base name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Base Name"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="code"
                  control={control}
                  rules={{ required: 'Base code is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Base Code"
                      error={!!errors.code}
                      helperText={errors.code?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="location"
                  control={control}
                  rules={{ required: 'Location is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Location"
                      error={!!errors.location}
                      helperText={errors.location?.message}
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
              disabled={createBaseMutation.isLoading}
            >
              {createBaseMutation.isLoading ? 'Creating...' : 'Create Base'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Base Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Base</DialogTitle>
        <form onSubmit={handleSubmit(handleEditBase)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Base name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Base Name"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="code"
                  control={control}
                  rules={{ required: 'Base code is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Base Code"
                      error={!!errors.code}
                      helperText={errors.code?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="location"
                  control={control}
                  rules={{ required: 'Location is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Location"
                      error={!!errors.location}
                      helperText={errors.location?.message}
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
              <Grid item xs={12}>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      select
                      label="Status"
                    >
                      <MenuItem value={true}>Active</MenuItem>
                      <MenuItem value={false}>Inactive</MenuItem>
                    </TextField>
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
              disabled={updateBaseMutation.isLoading}
            >
              {updateBaseMutation.isLoading ? 'Updating...' : 'Update Base'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Base Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Base Details</DialogTitle>
        <DialogContent>
          {selectedBase && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Base Name
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBase.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Base Code
                </Typography>
                <Typography variant="body1" fontFamily="monospace" gutterBottom>
                  {selectedBase.code}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBase.location}
                </Typography>
              </Grid>
              {selectedBase.description && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedBase.description}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedBase.isActive ? 'Active' : 'Inactive'}
                  color={selectedBase.isActive ? 'success' : 'default'}
                  sx={{ mb: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {dayjs(selectedBase.createdAt).format('MMMM DD, YYYY')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Assets
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBase._count?.assets || 0}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Personnel
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBase._count?.users || 0}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Purchases
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBase._count?.purchases || 0}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Transfers
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {(selectedBase._count?.transfersFrom || 0) + (selectedBase._count?.transfersTo || 0)}
                </Typography>
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

export default BasesPage
