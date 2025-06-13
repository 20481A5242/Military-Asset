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
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Security as CommanderIcon,
  LocalShipping as LogisticsIcon
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm, Controller } from 'react-hook-form'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import userService from '../services/userService'

const UsersPage = () => {
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
    role: '',
    baseId: '',
    isActive: ''
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // Form management
  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'LOGISTICS_OFFICER',
      baseId: '',
      isActive: true
    }
  })

  // User roles
  const userRoles = [
    { value: 'ADMIN', label: 'Administrator', icon: AdminIcon, color: 'error' },
    { value: 'BASE_COMMANDER', label: 'Base Commander', icon: CommanderIcon, color: 'primary' },
    { value: 'LOGISTICS_OFFICER', label: 'Logistics Officer', icon: LogisticsIcon, color: 'info' }
  ]

  // Fetch users
  const {
    data: usersData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['users', page, rowsPerPage, filters],
    () => userService.getUsers({
      page: page + 1,
      limit: rowsPerPage,
      ...filters
    }),
    {
      keepPreviousData: true
    }
  )

  // Create user mutation
  const createUserMutation = useMutation(
    userService.createUser,
    {
      onSuccess: () => {
        toast.success('User created successfully')
        setCreateDialogOpen(false)
        reset()
        queryClient.invalidateQueries('users')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to create user')
      }
    }
  )

  // Update user mutation
  const updateUserMutation = useMutation(
    ({ id, data }) => userService.updateUser(id, data),
    {
      onSuccess: () => {
        toast.success('User updated successfully')
        setEditDialogOpen(false)
        reset()
        queryClient.invalidateQueries('users')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to update user')
      }
    }
  )

  // Delete user mutation
  const deleteUserMutation = useMutation(
    userService.deleteUser,
    {
      onSuccess: () => {
        toast.success('User deleted successfully')
        queryClient.invalidateQueries('users')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to delete user')
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
      role: '',
      baseId: '',
      isActive: ''
    })
    setPage(0)
  }

  const handleCreateUser = (data) => {
    createUserMutation.mutate(data)
  }

  const handleEditUser = (data) => {
    updateUserMutation.mutate({ id: selectedUser.id, data })
  }

  const handleViewUser = (user) => {
    setSelectedUser(user)
    setViewDialogOpen(true)
  }

  const handleEditClick = (user) => {
    setSelectedUser(user)
    setValue('email', user.email)
    setValue('username', user.username)
    setValue('firstName', user.firstName)
    setValue('lastName', user.lastName)
    setValue('role', user.role)
    setValue('baseId', user.baseId || '')
    setValue('isActive', user.isActive)
    setEditDialogOpen(true)
  }

  const handleDeleteUser = (user) => {
    if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      deleteUserMutation.mutate(user.id)
    }
  }

  const getRoleInfo = (role) => {
    return userRoles.find(r => r.value === role) || userRoles[2]
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading users..." />
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Error loading users: {error.message}
        </Alert>
      </Box>
    )
  }

  const users = usersData?.data?.users || []
  const pagination = usersData?.data?.pagination || { total: 0 }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New User
        </Button>
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
                placeholder="Name, username, email..."
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                select
                label="Role"
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
              >
                <MenuItem value="">All Roles</MenuItem>
                {userRoles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
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

      {/* Users Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Base</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box sx={{ py: 3 }}>
                      <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        No users found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create your first user to get started
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const roleInfo = getRoleInfo(user.role)
                  const RoleIcon = roleInfo.icon

                  return (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: `${roleInfo.color}.light` }}>
                            <RoleIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {user.firstName} {user.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.username} • {user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={roleInfo.label}
                          size="small"
                          color={roleInfo.color}
                          icon={<RoleIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.base?.name || 'No Base'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={user.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {dayjs(user.createdAt).format('MMM DD, YYYY')}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewUser(user)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit User">
                          <IconButton
                            size="small"
                            onClick={() => handleEditClick(user)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
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
    </Box>
  )
}

export default UsersPage
