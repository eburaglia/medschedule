import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Avatar,
  IconButton,
  Alert,
  Snackbar,
  useMediaQuery,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Tooltip,
  Badge,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Person,
  Security,
  Notifications,
  Palette,
  Language,
  Backup,
  Storage,
  Payment,
  Email,
  VpnKey,
  Edit,
  Save,
  PhotoCamera,
  Delete,
  CheckCircle,
  Warning,
  Info,
  Business,
  Settings as SettingsIcon,
  AccountCircle,
  Lock,
  ColorLens,
  Translate,
  CloudUpload,
  AttachMoney,
  Schedule,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import ColorPicker from '../components/Settings/ColorPicker';
import NotificationPreferences from '../components/Settings/NotificationPreferences';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Schema de validação para perfil
const profileSchema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  email: yup.string().email('Email inválido').required('Email é obrigatório'),
  phone: yup.string(),
  birth_date: yup.date(),
});

// Schema para alterar senha
const passwordSchema = yup.object({
  current_password: yup.string().required('Senha atual é obrigatória'),
  new_password: yup.string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .required('Nova senha é obrigatória'),
  confirm_password: yup.string()
    .oneOf([yup.ref('new_password'), null], 'Senhas não conferem')
    .required('Confirmação de senha é obrigatória'),
});

// Schema para tenant
const tenantSchema = yup.object({
  name: yup.string().required('Nome do tenant é obrigatório'),
  subdomain: yup.string()
    .required('Subdomínio é obrigatório')
    .matches(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
});

export default function Settings() {
  const theme = useTheme();
  const { user, updateUser } = useAuth();
  const { toggleTheme, mode } = useCustomTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [tabValue, setTabValue] = useState(0);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [openTenantDialog, setOpenTenantDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState({
    emailAppointments: true,
    emailReminders: true,
    emailCancellations: true,
    emailPromotions: false,
    smsAppointments: false,
    smsReminders: true,
    pushAppointments: true,
    pushReminders: true,
  });

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      birth_date: user?.birth_date?.split('T')[0] || '',
    },
  });

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: yupResolver(passwordSchema),
  });

  const {
    control: tenantControl,
    handleSubmit: handleTenantSubmit,
    reset: resetTenant,
    formState: { errors: tenantErrors },
  } = useForm({
    resolver: yupResolver(tenantSchema),
  });

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    try {
      const response = await api.get(`/api/v1/tenants/${user?.tenant_id}`);
      setTenant(response.data);
      resetTenant({
        name: response.data.name,
        subdomain: response.data.subdomain,
      });
    } catch (error) {
      console.error('Erro ao carregar tenant:', error);
    }
  };

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      await api.put(`/api/v1/users/${user.id}`, data);
      updateUser(data);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    try {
      setLoading(true);
      await api.post('/api/v1/users/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success('Senha alterada com sucesso!');
      setOpenPasswordDialog(false);
      resetPassword();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const onTenantSubmit = async (data) => {
    try {
      setLoading(true);
      await api.put(`/api/v1/tenants/${user?.tenant_id}`, data);
      toast.success('Tenant atualizado com sucesso!');
      setOpenTenantDialog(false);
      loadTenant();
    } catch (error) {
      toast.error('Erro ao atualizar tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await api.delete(`/api/v1/users/${user.id}`);
      toast.success('Conta deletada com sucesso');
      logout();
    } catch (error) {
      toast.error('Erro ao deletar conta');
    } finally {
      setLoading(false);
      setOpenDeleteDialog(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await api.post('/api/v1/users/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ photo_url: response.data.photo_url });
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar foto');
    }
  };

  const handleNotificationChange = (key) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Configurações
      </Typography>

      <Grid container spacing={3}>
        {/* Menu lateral */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Tabs
              orientation={isMobile ? 'horizontal' : 'vertical'}
              variant={isMobile ? 'scrollable' : 'standard'}
              value={tabValue}
              onChange={(e, v) => setTabValue(v)}
              sx={{ borderRight: { md: 1 }, borderColor: 'divider' }}
            >
              <Tab icon={<Person />} label="Perfil" iconPosition="start" />
              <Tab icon={<Security />} label="Segurança" iconPosition="start" />
              <Tab icon={<Notifications />} label="Notificações" iconPosition="start" />
              <Tab icon={<Business />} label="Tenant" iconPosition="start" />
              <Tab icon={<Palette />} label="Aparência" iconPosition="start" />
              <Tab icon={<Language />} label="Idioma" iconPosition="start" />
              <Tab icon={<Backup />} label="Backup" iconPosition="start" />
            </Tabs>
          </Paper>
        </Grid>

        {/* Conteúdo */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 3 }}>
            {/* Perfil */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <Tooltip title="Alterar foto">
                      <IconButton
                        component="label"
                        size="small"
                        sx={{ bgcolor: 'primary.main', color: 'white' }}
                      >
                        <PhotoCamera fontSize="small" />
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={handlePhotoUpload}
                        />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <Avatar
                    src={user?.photo_url}
                    sx={{ width: 100, height: 100, mb: 2 }}
                  />
                </Badge>
                <Box sx={{ ml: 3 }}>
                  <Typography variant="h5">{user?.name}</Typography>
                  <Typography color="textSecondary">{user?.email}</Typography>
                  <Chip
                    size="small"
                    label={user?.user_type === 'prestador' ? 'Prestador' : 'Cliente'}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>

              <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="name"
                      control={profileControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Nome Completo"
                          fullWidth
                          error={!!profileErrors.name}
                          helperText={profileErrors.name?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="email"
                      control={profileControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Email"
                          type="email"
                          fullWidth
                          error={!!profileErrors.email}
                          helperText={profileErrors.email?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="phone"
                      control={profileControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Telefone"
                          fullWidth
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="birth_date"
                      control={profileControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Data de Nascimento"
                          type="date"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<Save />}
                      disabled={loading}
                    >
                      Salvar Alterações
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </TabPanel>

            {/* Segurança */}
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                Alterar Senha
              </Typography>
              <Button
                variant="outlined"
                startIcon={<VpnKey />}
                onClick={() => setOpenPasswordDialog(true)}
              >
                Alterar Senha
              </Button>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Sessões Ativas
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Security />
                  </ListItemIcon>
                  <ListItemText
                    primary="Este dispositivo"
                    secondary="Chrome - Windows • Último acesso agora"
                  />
                  <Chip label="Atual" size="small" color="primary" />
                </ListItem>
              </List>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom color="error">
                Zona de Perigo
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                A exclusão da conta é permanente e não pode ser desfeita.
              </Alert>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setOpenDeleteDialog(true)}
              >
                Excluir Minha Conta
              </Button>
            </TabPanel>

            {/* Notificações */}
            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                Preferências de Notificação
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Email
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemText primary="Novos agendamentos" />
                          <ListItemSecondaryAction>
                            <Switch
                              edge="end"
                              checked={notificationSettings.emailAppointments}
                              onChange={() => handleNotificationChange('emailAppointments')}
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Lembretes" />
                          <ListItemSecondaryAction>
                            <Switch
                              edge="end"
                              checked={notificationSettings.emailReminders}
                              onChange={() => handleNotificationChange('emailReminders')}
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Cancelamentos" />
                          <ListItemSecondaryAction>
                            <Switch
                              edge="end"
                              checked={notificationSettings.emailCancellations}
                              onChange={() => handleNotificationChange('emailCancellations')}
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Promoções" />
                          <ListItemSecondaryAction>
                            <Switch
                              edge="end"
                              checked={notificationSettings.emailPromotions}
                              onChange={() => handleNotificationChange('emailPromotions')}
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        SMS
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemText primary="Novos agendamentos" />
                          <ListItemSecondaryAction>
                            <Switch
                              edge="end"
                              checked={notificationSettings.smsAppointments}
                              onChange={() => handleNotificationChange('smsAppointments')}
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Lembretes" />
                          <ListItemSecondaryAction>
                            <Switch
                              edge="end"
                              checked={notificationSettings.smsReminders}
                              onChange={() => handleNotificationChange('smsReminders')}
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Button variant="contained" startIcon={<Save />}>
                    Salvar Preferências
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tenant */}
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">Informações do Tenant</Typography>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setOpenTenantDialog(true)}
                >
                  Editar
                </Button>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary" variant="body2">
                    Nome do Tenant
                  </Typography>
                  <Typography variant="body1">{tenant?.name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary" variant="body2">
                    Subdomínio
                  </Typography>
                  <Typography variant="body1">{tenant?.subdomain}.medschedule.com</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary" variant="body2">
                    Status
                  </Typography>
                  <Chip
                    size="small"
                    label={tenant?.is_active ? 'Ativo' : 'Inativo'}
                    color={tenant?.is_active ? 'success' : 'error'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary" variant="body2">
                    Criado em
                  </Typography>
                  <Typography variant="body2">
                    {tenant?.created_at && format(new Date(tenant.created_at), 'dd/MM/yyyy')}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Estatísticas do Tenant
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Usuários
                      </Typography>
                      <Typography variant="h5">156</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Agendamentos (mês)
                      </Typography>
                      <Typography variant="h5">342</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Receita (mês)
                      </Typography>
                      <Typography variant="h5">R$ 45.678</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Aparência */}
            <TabPanel value={tabValue} index={4}>
              <Typography variant="h6" gutterBottom>
                Tema
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={mode === 'dark'}
                    onChange={toggleTheme}
                  />
                }
                label="Modo Escuro"
              />

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Cores
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <ColorPicker
                    label="Cor Primária"
                    value={theme.palette.primary.main}
                    onChange={(color) => console.log('Mudar cor primária:', color)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ColorPicker
                    label="Cor Secundária"
                    value={theme.palette.secondary.main}
                    onChange={(color) => console.log('Mudar cor secundária:', color)}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Layout
              </Typography>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Menu lateral compacto"
              />
              <FormControlLabel
                control={<Switch />}
                label="Tabelas com linhas zebradas"
              />
            </TabPanel>

            {/* Idioma */}
            <TabPanel value={tabValue} index={5}>
              <Typography variant="h6" gutterBottom>
                Idioma
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Idioma</InputLabel>
                <Select value="pt-BR" label="Idioma">
                  <MenuItem value="pt-BR">Português (Brasil)</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Español</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="h6" gutterBottom>
                Formato de Data
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Formato</InputLabel>
                <Select value="dd/MM/yyyy" label="Formato">
                  <MenuItem value="dd/MM/yyyy">DD/MM/AAAA</MenuItem>
                  <MenuItem value="MM/dd/yyyy">MM/DD/AAAA</MenuItem>
                  <MenuItem value="yyyy-MM-dd">AAAA-MM-DD</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="h6" gutterBottom>
                Fuso Horário
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Fuso Horário</InputLabel>
                <Select value="America/Sao_Paulo" label="Fuso Horário">
                  <MenuItem value="America/Sao_Paulo">São Paulo (GMT-3)</MenuItem>
                  <MenuItem value="America/Manaus">Manaus (GMT-4)</MenuItem>
                  <MenuItem value="America/Noronha">Fernando de Noronha (GMT-2)</MenuItem>
                </Select>
              </FormControl>
            </TabPanel>

            {/* Backup */}
            <TabPanel value={tabValue} index={6}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Os backups são realizados automaticamente todos os dias às 02:00.
              </Alert>

              <Typography variant="h6" gutterBottom>
                Últimos Backups
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Backup completo"
                    secondary="23/02/2024 02:00 - 156 MB"
                  />
                  <Button size="small">Download</Button>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Backup completo"
                    secondary="22/02/2024 02:00 - 154 MB"
                  />
                  <Button size="small">Download</Button>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Backup completo"
                    secondary="21/02/2024 02:00 - 153 MB"
                  />
                  <Button size="small">Download</Button>
                </ListItem>
              </List>

              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                sx={{ mt: 2 }}
              >
                Fazer Backup Agora
              </Button>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog Alterar Senha */}
      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)}>
        <DialogTitle>Alterar Senha</DialogTitle>
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="current_password"
                  control={passwordControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Senha Atual"
                      type="password"
                      fullWidth
                      error={!!passwordErrors.current_password}
                      helperText={passwordErrors.current_password?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="new_password"
                  control={passwordControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nova Senha"
                      type="password"
                      fullWidth
                      error={!!passwordErrors.new_password}
                      helperText={passwordErrors.new_password?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="confirm_password"
                  control={passwordControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Confirmar Nova Senha"
                      type="password"
                      fullWidth
                      error={!!passwordErrors.confirm_password}
                      helperText={passwordErrors.confirm_password?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenPasswordDialog(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              Alterar Senha
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Editar Tenant */}
      <Dialog open={openTenantDialog} onClose={() => setOpenTenantDialog(false)}>
        <DialogTitle>Editar Tenant</DialogTitle>
        <form onSubmit={handleTenantSubmit(onTenantSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={tenantControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nome do Tenant"
                      fullWidth
                      error={!!tenantErrors.name}
                      helperText={tenantErrors.name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="subdomain"
                  control={tenantControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Subdomínio"
                      fullWidth
                      error={!!tenantErrors.subdomain}
                      helperText={tenantErrors.subdomain?.message}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">.medschedule.com</InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenTenantDialog(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              Salvar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Esta ação é permanente e não pode ser desfeita. Todos os seus dados serão removidos.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteAccount}
            disabled={loading}
          >
            Excluir Minha Conta
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
