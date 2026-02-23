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
  Avatar,
  Switch,
  FormControlLabel,
  InputAdornment as MuiInputAdornment,
  Slider,
  Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Search,
  Add,
  Edit,
  Delete,
  FileUpload,
  Inventory as ProductIcon,
  Visibility,
  CheckCircle,
  Block,
  AttachMoney,
  Person,
  Category,
  Visibility as VisibilityIcon,
  VisibilityOff,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ImportDialog from '../components/ImportDialog';

// Schema de validação
const productSchema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  description: yup.string(),
  category_id: yup.string().required('Categoria é obrigatória'),
  professional_id: yup.string().required('Profissional é obrigatório'),
  price: yup.number().nullable().transform((value) => isNaN(value) ? null : value),
  professional_commission: yup.number()
    .required('Comissão é obrigatória')
    .min(0, 'Mínimo 0%')
    .max(100, 'Máximo 100%'),
  product_visible_to_end_user: yup.boolean(),
  price_visible_to_end_user: yup.boolean(),
  status: yup.string().required('Status é obrigatório'),
});

export default function Products() {
  const theme = useTheme();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    category_id: '',
    professional_id: '',
  });
  const [duplicates, setDuplicates] = useState([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: {
      status: 'active',
      product_visible_to_end_user: true,
      price_visible_to_end_user: false,
      professional_commission: 30,
    },
  });

  const priceVisible = watch('price_visible_to_end_user');

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadProfessionals();
  }, [page, rowsPerPage, search, filters]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        search: search || undefined,
        ...filters,
      };

      const response = await api.get('/api/v1/products', { params });
      setProducts(response.data);
      setTotal(parseInt(response.headers['x-total-count'] || '0'));
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/api/v1/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadProfessionals = async () => {
    try {
      const response = await api.get('/api/v1/users', {
        params: { user_type: 'prestador' }
      });
      setProfessionals(response.data);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
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

  const handleOpenDialog = (product = null) => {
    if (product) {
      setSelectedProduct(product);
      setValue('name', product.name);
      setValue('description', product.description || '');
      setValue('category_id', product.category_id);
      setValue('professional_id', product.professional_id);
      setValue('price', product.price);
      setValue('professional_commission', product.professional_commission);
      setValue('product_visible_to_end_user', product.product_visible_to_end_user);
      setValue('price_visible_to_end_user', product.price_visible_to_end_user);
      setValue('status', product.status);
    } else {
      setSelectedProduct(null);
      reset();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProduct(null);
    reset();
  };

  const handleOpenDetails = (product) => {
    setSelectedProduct(product);
    setOpenDetailsDialog(true);
  };

  const onSubmit = async (data) => {
    try {
      // Converter preço para centavos
      if (data.price) {
        data.price = Math.round(data.price * 100);
      }

      if (selectedProduct) {
        await api.put(`/api/v1/products/${selectedProduct.id}`, data);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await api.post('/api/v1/products', data);
        toast.success('Produto criado com sucesso!');
      }
      handleCloseDialog();
      loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar produto');
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Tem certeza que deseja deletar este produto?')) {
      try {
        await api.delete(`/api/v1/products/${productId}`);
        toast.success('Produto deletado com sucesso!');
        loadProducts();
      } catch (error) {
        toast.error('Erro ao deletar produto');
      }
    }
  };

  const handleToggleStatus = async (product) => {
    try {
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      await api.put(`/api/v1/products/${product.id}`, {
        ...product,
        status: newStatus,
      });
      toast.success(`Produto ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
      loadProducts();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tenant_id', user.tenant_id);

    try {
      const response = await api.post('/api/v1/products/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.duplicates_found?.length > 0) {
        setDuplicates(response.data.duplicates_found);
      }

      toast.success(`Importação concluída! ${response.data.new_records} novos produtos.`);
      
      if (response.data.errors?.length > 0) {
        console.warn('Erros na importação:', response.data.errors);
      }

      setOpenImportDialog(false);
      loadProducts();
    } catch (error) {
      toast.error('Erro ao importar arquivo');
    }
  };

  const handleResolveDuplicate = async (duplicate, action) => {
    try {
      await api.post(`/api/v1/products/resolve-duplicate/${duplicate.existing_product.id}`, {
        action,
        import_data: duplicate.data,
      });
      
      setDuplicates(duplicates.filter(d => d !== duplicate));
      toast.success(`Duplicata resolvida: ${action}`);
    } catch (error) {
      toast.error('Erro ao resolver duplicata');
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'Sob consulta';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price / 100);
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
        <Typography variant="h4">Produtos</Typography>
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
            Novo Produto
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
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
          <Grid item xs={12} sm={4} md={2}>
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
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoria</InputLabel>
              <Select
                value={filters.category_id}
                label="Categoria"
                onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
              >
                <MenuItem value="">Todas</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Profissional</InputLabel>
              <Select
                value={filters.professional_id}
                label="Profissional"
                onChange={(e) => setFilters({ ...filters, professional_id: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                {professionals.map((prof) => (
                  <MenuItem key={prof.id} value={prof.id}>{prof.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Lista de Produtos */}
      {isMobile ? (
        <Grid container spacing={2}>
          {products.map((product) => (
            <Grid item xs={12} key={product.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      <ProductIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">{product.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {product.category?.name}
                      </Typography>
                    </Box>
                    {getStatusChip(product.status)}
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Profissional:
                        </Typography>
                        <Typography variant="body2">{product.professional?.name}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Preço:
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatPrice(product.price)}
                          {!product.price_visible_to_end_user && (
                            <Chip
                              size="small"
                              icon={<VisibilityOff />}
                              label="Oculto"
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Comissão:
                        </Typography>
                        <Typography variant="body2">{product.professional_commission}%</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Visível:
                        </Typography>
                        <Typography variant="body2">
                          {product.product_visible_to_end_user ? 'Sim' : 'Não'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Tooltip title="Visualizar">
                      <IconButton size="small" onClick={() => handleOpenDetails(product)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenDialog(product)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={product.status === 'active' ? 'Desativar' : 'Ativar'}>
                      <IconButton size="small" onClick={() => handleToggleStatus(product)}>
                        {product.status === 'active' ? <Block /> : <CheckCircle />}
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
                <TableCell>Produto</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Profissional</TableCell>
                <TableCell>Preço</TableCell>
                <TableCell>Comissão</TableCell>
                <TableCell>Visibilidade</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ProductIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                      <Box>
                        <Typography variant="body2">{product.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {product.description?.substring(0, 50)}
                          {product.description?.length > 50 ? '...' : ''}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{product.category?.name}</TableCell>
                  <TableCell>{product.professional?.name}</TableCell>
                  <TableCell>
                    <Box>
                      {formatPrice(product.price)}
                      {!product.price_visible_to_end_user && (
                        <Chip
                          size="small"
                          icon={<VisibilityOff />}
                          label="Oculto"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{product.professional_commission}%</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={product.product_visible_to_end_user ? <VisibilityIcon /> : <VisibilityOff />}
                      label={product.product_visible_to_end_user ? 'Visível' : 'Oculto'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{getStatusChip(product.status)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Visualizar">
                      <IconButton size="small" onClick={() => handleOpenDetails(product)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenDialog(product)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={product.status === 'active' ? 'Desativar' : 'Ativar'}>
                      <IconButton size="small" onClick={() => handleToggleStatus(product)}>
                        {product.status === 'active' ? <Block /> : <CheckCircle />}
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
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {selectedProduct ? 'Editar Produto' : 'Novo Produto'}
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
                      label="Nome do Produto"
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
              <Grid item xs={12} sm={6}>
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.category_id}>
                      <InputLabel>Categoria</InputLabel>
                      <Select {...field} label="Categoria">
                        {categories.map((cat) => (
                          <MenuItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.category_id && (
                        <FormHelperText>{errors.category_id.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="professional_id"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.professional_id}>
                      <InputLabel>Profissional</InputLabel>
                      <Select {...field} label="Profissional">
                        {professionals.map((prof) => (
                          <MenuItem key={prof.id} value={prof.id}>
                            {prof.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.professional_id && (
                        <FormHelperText>{errors.professional_id.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="price"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Preço"
                      type="number"
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <MuiInputAdornment position="start">R$</MuiInputAdornment>
                        ),
                      }}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      error={!!errors.price}
                      helperText={errors.price?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="professional_commission"
                  control={control}
                  render={({ field }) => (
                    <Box>
                      <Typography gutterBottom>Comissão do Profissional: {field.value}%</Typography>
                      <Slider
                        value={field.value}
                        onChange={(_, value) => field.onChange(value)}
                        min={0}
                        max={100}
                        valueLabelDisplay="auto"
                      />
                      {errors.professional_commission && (
                        <FormHelperText error>{errors.professional_commission.message}</FormHelperText>
                      )}
                    </Box>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Configurações de Visibilidade
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="product_visible_to_end_user"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="Produto visível para usuário final"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="price_visible_to_end_user"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          disabled={!watch('product_visible_to_end_user')}
                        />
                      }
                      label="Preço visível para usuário final"
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
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button type="submit" variant="contained">
              {selectedProduct ? 'Atualizar' : 'Criar'}
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
        <DialogTitle>Detalhes do Produto</DialogTitle>
        <DialogContent dividers>
          {selectedProduct && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Nome</Typography>
                <Typography variant="body1">{selectedProduct.name}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Descrição</Typography>
                <Typography variant="body1">
                  {selectedProduct.description || 'Sem descrição'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Categoria</Typography>
                <Typography variant="body1">{selectedProduct.category?.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Profissional</Typography>
                <Typography variant="body1">{selectedProduct.professional?.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Preço</Typography>
                <Typography variant="body1">{formatPrice(selectedProduct.price)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Comissão</Typography>
                <Typography variant="body1">{selectedProduct.professional_commission}%</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Visibilidade do Produto</Typography>
                <Typography variant="body1">
                  {selectedProduct.product_visible_to_end_user ? 'Visível' : 'Oculto'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Visibilidade do Preço</Typography>
                <Typography variant="body1">
                  {selectedProduct.price_visible_to_end_user ? 'Visível' : 'Oculto'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusChip(selectedProduct.status)}</Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Criado em</Typography>
                <Typography variant="body2">
                  {new Date(selectedProduct.created_at).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Atualizado em</Typography>
                <Typography variant="body2">
                  {new Date(selectedProduct.updated_at).toLocaleDateString()}
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
        entityName="produtos"
        templateColumns={['nome', 'descricao', 'categoria', 'profissional_email', 'preco', 'comissao', 'visivel', 'preco_visivel']}
      />
    </Box>
  );
}
