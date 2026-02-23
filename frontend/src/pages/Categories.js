import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
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
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Search,
  Add,
  Edit,
  Delete,
  FileUpload,
  Category as CategoryIcon,
  Visibility,
  CheckCircle,
  Block,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ImportDialog from '../components/ImportDialog';

// Schema de validação
const categorySchema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  description: yup.string(),
  status: yup.string().required('Status é obrigatório'),
  tenant_ids: yup.array().min(1, 'Selecione pelo menos um tenant'),
});

export default function Categories() {
  const theme = useTheme();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const [categories, setCategories] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [duplicates, setDuplicates] = useState([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      status: 'active',
      tenant_ids: [],
    },
  });

  useEffect(() => {
    loadCategories();
    loadTenants();
  }, [page, rowsPerPage, search, filterStatus, filterTenant]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: search || undefined,
        status: filterStatus || undefined,
        tenant_id: filterTenant || undefined,
      };

      const response = await api.get('/api/v1/categories', { params });
      setCategories(response.data);
      setTotal(parseInt(response.headers['x-total-count'] || '0'));
    } catch (error) {
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const response = await api.get('/api/v1/tenants');
      setTenants(response.data);
    } catch (error) {
      console.error('Erro ao carregar tenants:', error);
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

  const handleOpenDialog = (category = null) => {
    if (category) {
      setSelectedCategory(category);
      setValue('name', category.name);
      setValue('description', category.description || '');
      setValue('status', category.status);
      setValue(
        'tenant_ids',
        category.tenants?.map((t) => t.id) || []
      );
    } else {
      setSelectedCategory(null);
      reset();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCategory(null);
    reset();
  };

  const handleOpenDetails = (category) => {
    setSelectedCategory(category);
    setOpenDetailsDialog(true);
  };

  const onSubmit = async (data) => {
    try {
      if (selectedCategory) {
        await api.put(`/api/v1/categories/${selectedCategory.id}`, data);
        toast.success('Categoria atualizada com sucesso!');
      } else {
        await api.post('/api/v1/categories', data);
        toast.success('Categoria criada com sucesso!');
      }
      handleCloseDialog();
      loadCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar categoria');
    }
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm('Tem certeza que deseja deletar esta categoria?')) {
      try {
        await api.delete(`/api/v1/categories/${categoryId}`);
        toast.success('Categoria deletada com sucesso!');
        loadCategories();
      } catch (error) {
        toast.error('Erro ao deletar categoria');
      }
    }
  };

  const handleToggleStatus = async (category) => {
    try {
      const newStatus = category.status === 'active' ? 'inactive' : 'active';
      await api.put(`/api/v1/categories/${category.id}`, {
        ...category,
        status: newStatus,
      });
      toast.success(`Categoria ${newStatus === 'active' ? 'ativada' : 'desativada'} com sucesso!`);
      loadCategories();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/v1/categories/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.duplicates_found?.length > 0) {
        setDuplicates(response.data.duplicates_found);
      }

      toast.success(`Importação concluída! ${response.data.new_records} novas categorias.`);
      
      if (response.data.errors?.length > 0) {
        console.warn('Erros na importação:', response.data.errors);
      }

      setOpenImportDialog(false);
      loadCategories();
    } catch (error) {
      toast.error('Erro ao importar arquivo');
    }
  };

  const handleResolveDuplicate = async (duplicate, action) => {
    try {
      await api.post(`/api/v1/categories/resolve-duplicate/${duplicate.existing_category.id}`, {
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
    return status === 'active' ? (
      <Chip size="small" icon={<CheckCircle />} label="Ativo" color="success" variant="outlined" />
    ) : (
      <Chip size="small" icon={<Block />} label="Inativo" color="error" variant="outlined" />
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Categorias</Typography>
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
            Nova Categoria
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
              placeholder="Buscar por nome..."
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
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="active">Ativo</MenuItem>
                <MenuItem value="inactive">Inativo</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Tenant</InputLabel>
              <Select
                value={filterTenant}
                label="Tenant"
                onChange={(e) => setFilterTenant(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {tenants.map((tenant) => (
                  <MenuItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Lista de Categorias */}
      {isMobile ? (
        <Grid container spacing={2}>
          {categories.map((category) => (
            <Grid item xs={12} key={category.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CategoryIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">{category.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {category.description || 'Sem descrição'}
                      </Typography>
                    </Box>
                    {getStatusChip(category.status)}
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Tenants:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {category.tenants?.map((tenant) => (
                        <Chip
                          key={tenant.id}
                          size="small"
                          label={tenant.name}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Tooltip title="Visualizar">
                      <IconButton size="small" onClick={() => handleOpenDetails(category)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenDialog(category)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={category.status === 'active' ? 'Desativar' : 'Ativar'}>
                      <IconButton size="small" onClick={() => handleToggleStatus(category)}>
                        {category.status === 'active' ? <Block /> : <CheckCircle />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Tenants</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CategoryIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                      {category.name}
                    </Box>
                  </TableCell>
                  <TableCell>{category.description || '-'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {category.tenants?.map((tenant) => (
                        <Chip
                          key={tenant.id}
                          size="small"
                          label={tenant.name}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>{getStatusChip(category.status)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Visualizar">
                      <IconButton size="small" onClick={() => handleOpenDetails(category)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenDialog(category)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={category.status === 'active' ? 'Desativar' : 'Ativar'}>
                      <IconButton size="small" onClick={() => handleToggleStatus(category)}>
                        {category.status === 'active' ? <Block /> : <CheckCircle />}
                      </IconButton>
                    </Tooltip>
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
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {selectedCategory ? 'Editar Categoria' : 'Nova Categoria'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nome da Categoria"
                      fullWidth
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
                      label="Descrição"
                      fullWidth
                      multiline
                      rows={3}
                      error={!!errors.description}
                      helperText={errors.description?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.status}>
                      <InputLabel>Status</InputLabel>
                      <Select {...field} label="Status">
                        <MenuItem value="active">Ativo</MenuItem>
                        <MenuItem value="inactive">Inativo</MenuItem>
                      </Select>
                      {errors.status && (
                        <FormHelperText>{errors.status.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="tenant_ids"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.tenant_ids}>
                      <InputLabel>Tenants</InputLabel>
                      <Select
                        {...field}
                        multiple
                        label="Tenants"
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((id) => {
                              const tenant = tenants.find((t) => t.id === id);
                              return (
                                <Chip
                                  key={id}
                                  label={tenant?.name}
                                  size="small"
                                />
                              );
                            })}
                          </Box>
                        )}
                      >
                        {tenants.map((tenant) => (
                          <MenuItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.tenant_ids && (
                        <FormHelperText>{errors.tenant_ids.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button type="submit" variant="contained">
              {selectedCategory ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de Detalhes */}
      <Dialog
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Detalhes da Categoria</DialogTitle>
        <DialogContent dividers>
          {selectedCategory && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Nome</Typography>
                <Typography variant="body1">{selectedCategory.name}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Descrição</Typography>
                <Typography variant="body1">
                  {selectedCategory.description || 'Sem descrição'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusChip(selectedCategory.status)}</Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Tenants</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                  {selectedCategory.tenants?.map((tenant) => (
                    <Chip key={tenant.id} label={tenant.name} size="small" />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Criado em</Typography>
                <Typography variant="body2">
                  {new Date(selectedCategory.created_at).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Atualizado em</Typography>
                <Typography variant="body2">
                  {new Date(selectedCategory.updated_at).toLocaleDateString()}
                </Typography>
              </Grid>
            </Grid>
          )}
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
        entityName="categorias"
        templateColumns={['nome', 'descricao', 'status']}
      />
    </Box>
  );
}
