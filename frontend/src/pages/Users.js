import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Alert,
  Snackbar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Search,
  Add,
  Edit,
  Delete,
  Block,
  CheckCircle,
  FileUpload,
  CloudUpload,
  Person,
  Email,
  Phone,
  LocationOn,
  Visibility,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UserDetails from '../components/Users/UserDetails';
import ImportDialog from '../components/ImportDialog';

// Schema de validação
const userSchema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  email: yup.string().email('Email inválido').required('Email é obrigatório'),
  cpf: yup.string().required('CPF é obrigatório').min(11, 'CPF deve ter 11 dígitos'),
  birth_date: yup.date().required('Data de nascimento é obrigatória'),
  user_type: yup.string().required('Tipo de usuário é obrigatório'),
  status: yup.string().required('Status é obrigatório'),
  phone: yup.string(),
  address: yup.string(),
  city: yup.string(),
  state: yup.string(),
  zip_code: yup.string(),
  notes: yup.string(),
});

export default function Users() {
  const theme = useTheme();
  const { user: currentUser } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    user_type: '',
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: yupResolver(userSchema),
    defaultValues: {
      status: 'pending',
      user_type: 'usuario_final',
    },
  });

  useEffect(() => {
    loadUsers();
  }, [page, rowsPerPage, search, filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: search || undefined,
        ...filters,
      };

      const response = await api.get('/api/v1/users', { params });
      setUsers(response.data);
      setTotal(parseInt(response.headers['x-total-count'] || '0'));
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event) => {
    setSearch(event.target.value);
    setPage(0);
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setSelectedUser(user);
      Object.keys(user).forEach((key) => {
        if (key === 'birth_date') {
          setValue(key, user[key]?.split('T')[0]);
        } else {
          setValue(key, user[key]);
        }
      });
    } else {
      setSelectedUser(null);
      reset();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    reset();
  };

  const handleOpenDetails = (user) => {
    setSelectedUser(user);
    setOpenDetailsDialog(true);
  };

  const onSubmit = async (data) => {
    try {
      if (selectedUser) {
        await api.put(`/api/v1/users/${selectedUser.id}`, data);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await api.post('/api/v1/users', data);
        toast.success('Usuário criado com sucesso!');
      }
      handleCloseDialog();
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar usuário');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Tem certeza que deseja deletar este usuário?')) {
      try {
        await api.delete(`/api/v1/users/${userId}`);
        toast.success('Usuário deletado com sucesso!');
        loadUsers();
      } catch (error) {
        toast.error('Erro ao deletar usuário');
      }
    }
  };

  const handleActivate = async (userId) => {
    try {
      await api.post(`/api/v1/users/${userId}/activate`);
      toast.success('Usuário ativado com sucesso!');
      loadUsers();
    } catch (error) {
      toast.error('Erro ao ativar usuário');
    }
  };

  const handleDeactivate = async (userId) => {
    try {
      await api.post(`/api/v1/users/${userId}/deactivate`);
      toast.success('Usuário desativado com sucesso!');
      loadUsers();
    } catch (error) {
      toast.error('Erro ao desativar usuário');
    }
  };

  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/v1/users/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.duplicates_found?.length > 0) {
        setDuplicates(response.data.duplicates_found);
      }

      toast.success(`Importação concluída! ${response.data.new_records} novos registros.`);
      
      if (response.data.errors?.length > 0) {
        console.warn('Erros na importação:', response.data.errors);
      }

      setOpenImportDialog(false);
      loadUsers();
    } catch (error) {
      toast.error('Erro ao importar arquivo');
    }
  };

  const handleResolveDuplicate = async (duplicate, action) => {
    try {
      await api.post(`/api/v1/users/resolve-duplicate/${duplicate.existing_user.id}`, {
        action,
        import_data: duplicate.data,
      });
      
      setDuplicates(duplicates.filter(d => d !== duplicate));
      toast.success(`Duplicata resolvida: ${action}`);
    } catch (error) {
      toast.error('Erro ao resolver duplicata');
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      active: { color: 'success', icon: <CheckCircle />, label: 'Ativo' },
      inactive: { color: 'error', icon: <Block />, label: 'Inativo' },
      pending: { color: 'warning', icon: <Block />, label: 'Pendente' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Chip
        size="small"
        icon={config.icon}
        label={config.label}
        color={config.color}
        variant="outlined"
      />
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Usuários</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileUpload />}
            onClick={() => setOpenImportDialog(true)}
            size={isMobile ? 'small' : 'medium'}
          >
            Importar
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            size={isMobile ? 'small' : 'medium'}
          >
            Novo Usuário
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por nome, email ou CPF..."
              value={search}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="active">Ativo</MenuItem>
                <MenuItem value="inactive">Inativo</MenuItem>
                <MenuItem value="pending">Pendente</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filters.user_type}
                label="Tipo"
                onChange={(e) => setFilters({ ...filters, user_type: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="prestador">Prestador</MenuItem>
                <MenuItem value="usuario_final">Usuário Final</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Lista de Usuários */}
      {isMobile ? (
        // Visualização em cards para mobile
        <Grid container spacing={2}>
          {users.map((user) => (
            <Grid item xs={12} key={user.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {user.name?.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">{user.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                    {getStatusChip(user.status)}
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip size="small" label={user.cpf} />
                    <Chip size="small" label={user.user_type === 'prestador' ? 'Prestador' : 'Cliente'} />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Tooltip title="Visualizar">
                      <IconButton size="small" onClick={() => handleOpenDetails(user)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    {user.status === 'active' ? (
                      <Tooltip title="Desativar">
                        <IconButton size="small" onClick={() => handleDeactivate(user.id)}>
                          <Block />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Ativar">
                        <IconButton size="small" onClick={() => handleActivate(user.id)}>
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        // Visualização em tabela para desktop
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuário</TableCell>
                <TableCell>CPF</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                        {user.name?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">{user.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{user.cpf}</TableCell>
                  <TableCell>
                    {user.user_type === 'prestador' ? 'Prestador' : 'Cliente'}
                  </TableCell>
                  <TableCell>{getStatusChip(user.status)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Visualizar">
                      <IconButton size="small" onClick={() => handleOpenDetails(user)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    {user.status === 'active' ? (
                      <Tooltip title="Desativar">
                        <IconButton size="small" onClick={() => handleDeactivate(user.id)}>
                          <Block />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Ativar">
                        <IconButton size="small" onClick={() => handleActivate(user.id)}>
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage={isMobile ? 'Linhas:' : 'Linhas por página:'}
      />

      {/* Dialog de Cadastro/Edição */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nome Completo"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="nickname"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Apelido"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="cpf"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="CPF"
                      fullWidth
                      error={!!errors.cpf}
                      helperText={errors.cpf?.message}
                      inputProps={{ maxLength: 11 }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="birth_date"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Data de Nascimento"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.birth_date}
                      helperText={errors.birth_date?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="user_type"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.user_type}>
                      <InputLabel>Tipo de Usuário</InputLabel>
                      <Select {...field} label="Tipo de Usuário">
                        <MenuItem value="prestador">Prestador</MenuItem>
                        <MenuItem value="usuario_final">Usuário Final</MenuItem>
                      </Select>
                      {errors.user_type && (
                        <FormHelperText>{errors.user_type.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.status}>
                      <InputLabel>Status</InputLabel>
                      <Select {...field} label="Status">
                        <MenuItem value="active">Ativo</MenuItem>
                        <MenuItem value="inactive">Inativo</MenuItem>
                        <MenuItem value="pending">Pendente</MenuItem>
                      </Select>
                      {errors.status && (
                        <FormHelperText>{errors.status.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Endereço (Opcional)
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Endereço"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  name="address_number"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Número"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  name="complement"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Complemento"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  name="zip_code"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="CEP"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  name="neighborhood"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Bairro"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Cidade"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Estado"
                      fullWidth
                      inputProps={{ maxLength: 2 }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="country"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="País"
                      fullWidth
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
                      label="Observações"
                      multiline
                      rows={3}
                      fullWidth
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button type="submit" variant="contained">
              {selectedUser ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de Detalhes */}
      <Dialog
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Detalhes do Usuário</DialogTitle>
        <DialogContent dividers>
          {selectedUser && <UserDetails user={selectedUser} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailsDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Importação */}
      <ImportDialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        onImport={handleImport}
        duplicates={duplicates}
        onResolveDuplicate={handleResolveDuplicate}
        entityName="usuários"
        templateColumns={['nome', 'email', 'cpf', 'data_nascimento', 'tipo']}
      />
    </Box>
  );
}
