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
  ListItemAvatar
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
  Assignment as AssignmentIcon,
  AssignmentReturn as ReturnIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm, Controller } from 'react-hook-form'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import assignmentService from '../services/assignmentService'
import assetService from '../services/assetService'

const AssignmentsPage = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // State management
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [filters, setFilters] = useState({
    search: '',
    status: 'active',
    baseId: user?.role === 'BASE_COMMANDER' ? user.baseId : '',
    dateFrom: null,
    dateTo: null
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)

  // Form management
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      assetId: '',
      assignedToId: '',
      purpose: '',
      notes: ''
    }
  })

  const { control: returnControl, handleSubmit: handleReturnSubmit, reset: resetReturn } = useForm({
    defaultValues: {
      notes: '',
      condition: 'GOOD'
    }
  })

  // Assignment statuses
  const assignmentStatuses = [
    { value: 'active', label: 'Active Assignments' },
    { value: 'returned', label: 'Returned Assets' },
    { value: 'all', label: 'All Assignments' }
  ]

  const assetConditions = [
    { value: 'GOOD', label: 'Good Condition' },
    { value: 'DAMAGED', label: 'Damaged' },
    { value: 'NEEDS_MAINTENANCE', label: 'Needs Maintenance' },
    { value: 'DECOMMISSIONED', label: 'Decommissioned' }
  ]

  // Fetch assignments
  const {
    data: assignmentsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['assignments', page, rowsPerPage, filters],
    () => assignmentService.getAssignments({
      page: page + 1,
      limit: rowsPerPage,
      ...filters
    }),
    {
      keepPreviousData: true
    }
  )

  // Fetch available assets for assignment
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

  // Create assignment mutation
  const createAssignmentMutation = useMutation(
    assignmentService.createAssignment,
    {
      onSuccess: () => {
        toast.success('Assignment created successfully')
        setCreateDialogOpen(false)
        reset()
        queryClient.invalidateQueries('assignments')
        queryClient.invalidateQueries('assets')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to create assignment')
      }
    }
  )

  // Return assignment mutation
  const returnAssignmentMutation = useMutation(
    ({ id, data }) => assignmentService.returnAssignment(id, data),
    {
      onSuccess: () => {
        toast.success('Asset returned successfully')
        setReturnDialogOpen(false)
        resetReturn()
        queryClient.invalidateQueries('assignments')
        queryClient.invalidateQueries('assets')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to return asset')
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
      status: 'active',
      baseId: user?.role === 'BASE_COMMANDER' ? user.baseId : '',
      dateFrom: null,
      dateTo: null
    })
    setPage(0)
  }

  const handleCreateAssignment = (data) => {
    const formattedData = {
      ...data,
      baseId: user?.baseId
    }
    createAssignmentMutation.mutate(formattedData)
  }

  const handleReturnAsset = (data) => {
    if (selectedAssignment) {
      returnAssignmentMutation.mutate({
        id: selectedAssignment.id,
        data
      })
    }
  }

  const handleViewAssignment = (assignment) => {
    setSelectedAssignment(assignment)
    setViewDialogOpen(true)
  }

  const handleReturnClick = (assignment) => {
    setSelectedAssignment(assignment)
    setReturnDialogOpen(true)
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading assignments..." />
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Error loading assignments: {error.message}
        </Alert>
      </Box>
    )
  }

  const assignments = assignmentsData?.data?.assignments || []
  const pagination = assignmentsData?.data?.pagination || { total: 0 }
  const availableAssets = assetsData?.data?.assets || []

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Asset Assignments
        </Typography>
        {['ADMIN', 'BASE_COMMANDER'].includes(user?.role) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New Assignment
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
                placeholder="Asset name, personnel..."
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
                {assignmentStatuses.map((status) => (
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

      {/* Assignments Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Asset</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell>Assigned Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box sx={{ py: 3 }}>
                      <AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        No assignments found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create your first assignment to get started
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>
                          <InventoryIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {assignment.asset?.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {assignment.asset?.serialNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'secondary.light' }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {assignment.assignedTo?.firstName} {assignment.assignedTo?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {assignment.assignedTo?.username}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {assignment.purpose || 'Not specified'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {dayjs(assignment.assignedAt).format('MMM DD, YYYY')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={assignment.returnedAt ? 'Returned' : 'Active'}
                        size="small"
                        color={assignment.returnedAt ? 'default' : 'success'}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewAssignment(assignment)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {!assignment.returnedAt && ['ADMIN', 'BASE_COMMANDER'].includes(user?.role) && (
                        <Tooltip title="Return Asset">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleReturnClick(assignment)}
                          >
                            <ReturnIcon />
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

      {/* Create Assignment Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Assignment</DialogTitle>
        <form onSubmit={handleSubmit(handleCreateAssignment)}>
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
              <Grid item xs={12}>
                <Controller
                  name="assignedToId"
                  control={control}
                  rules={{ required: 'Personnel is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      select
                      label="Assign To"
                      error={!!errors.assignedToId}
                      helperText={errors.assignedToId?.message}
                    >
                      <MenuItem value="">Select personnel</MenuItem>
                      {/* This would be populated with actual users */}
                      <MenuItem value="user1">John Doe</MenuItem>
                      <MenuItem value="user2">Jane Smith</MenuItem>
                      <MenuItem value="user3">Mike Johnson</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="purpose"
                  control={control}
                  rules={{ required: 'Purpose is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Purpose"
                      multiline
                      rows={3}
                      error={!!errors.purpose}
                      helperText={errors.purpose?.message}
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
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createAssignmentMutation.isLoading}
            >
              {createAssignmentMutation.isLoading ? 'Creating...' : 'Create Assignment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Return Asset Dialog */}
      <Dialog
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Return Asset</DialogTitle>
        <form onSubmit={handleReturnSubmit(handleReturnAsset)}>
          <DialogContent>
            {selectedAssignment && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Returning: <strong>{selectedAssignment.asset?.name}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  From: <strong>{selectedAssignment.assignedTo?.firstName} {selectedAssignment.assignedTo?.lastName}</strong>
                </Typography>
              </Box>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="condition"
                  control={returnControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      select
                      label="Asset Condition"
                    >
                      {assetConditions.map((condition) => (
                        <MenuItem key={condition.value} value={condition.value}>
                          {condition.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={returnControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Return Notes"
                      multiline
                      rows={3}
                      placeholder="Any issues, damage, or notes about the asset condition..."
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReturnDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="warning"
              disabled={returnAssignmentMutation.isLoading}
            >
              {returnAssignmentMutation.isLoading ? 'Processing...' : 'Return Asset'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Assignment Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Assignment Details</DialogTitle>
        <DialogContent>
          {selectedAssignment && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Asset
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedAssignment.asset?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Serial: {selectedAssignment.asset?.serialNumber}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Assigned To
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedAssignment.assignedTo?.firstName} {selectedAssignment.assignedTo?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedAssignment.assignedTo?.username} • {selectedAssignment.assignedTo?.role}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Assigned Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {dayjs(selectedAssignment.assignedAt).format('MMMM DD, YYYY HH:mm')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedAssignment.returnedAt ? 'Returned' : 'Active'}
                  color={selectedAssignment.returnedAt ? 'default' : 'success'}
                  sx={{ mb: 1 }}
                />
              </Grid>
              {selectedAssignment.returnedAt && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Returned Date
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {dayjs(selectedAssignment.returnedAt).format('MMMM DD, YYYY HH:mm')}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Purpose
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedAssignment.purpose}
                </Typography>
              </Grid>
              {selectedAssignment.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedAssignment.notes}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created By
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedAssignment.createdBy?.firstName} {selectedAssignment.createdBy?.lastName}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedAssignment && !selectedAssignment.returnedAt && ['ADMIN', 'BASE_COMMANDER'].includes(user?.role) && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<ReturnIcon />}
              onClick={() => {
                setViewDialogOpen(false)
                handleReturnClick(selectedAssignment)
              }}
            >
              Return Asset
            </Button>
          )}
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AssignmentsPage
