import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  IconButton,
  Chip,
  Avatar,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Tooltip,
  Alert,
  Badge,
  Card,
  CardContent,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Add,
  Event,
  AccessTime,
  Person,
  Category,
  AttachMoney,
  Close,
  CheckCircle,
  Cancel,
  Schedule,
} from '@mui/icons-material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Schema de validação
const scheduleSchema = yup.object({
  provider_id: yup.string().required('Profissional é obrigatório'),
  user_id: yup.string().required('Cliente é obrigatório'),
  product_id: yup.string().required('Produto é obrigatório'),
  start_time: yup.string().required('Horário de início é obrigatório'),
  end_time: yup.string().required('Horário de término é obrigatório'),
  notes: yup.string(),
});

export default function Calendar() {
  const theme = useTheme();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('month'); // month, week, day

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(scheduleSchema),
  });

  const selectedProvider = watch('provider_id');
  const selectedProduct = watch('product_id');

  useEffect(() => {
    loadSchedules();
    loadProfessionals();
    loadUsers();
  }, [currentDate, selectedDate]);

  useEffect(() => {
    if (selectedProvider) {
      loadProducts(selectedProvider);
    }
  }, [selectedProvider]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      const response = await api.get('/api/v1/schedules', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });
      setSchedules(response.data);
    } catch (error) {
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
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

  const loadProducts = async (providerId) => {
    try {
      const response = await api.get('/api/v1/products', {
        params: { professional_id: providerId }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/api/v1/users', {
        params: { user_type: 'usuario_final' }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    if (isMobile) {
      // Em mobile, abrir lista de agendamentos do dia
      const daySchedules = getSchedulesByDate(date);
      if (daySchedules.length > 0) {
        // Mostrar lista
      }
    }
  };

  const handleOpenDialog = (date = selectedDate, timeSlot = null) => {
    setSelectedSchedule(null);
    reset({
      start_time: timeSlot ? format(timeSlot, 'HH:mm') : '09:00',
      end_time: timeSlot ? format(addMinutes(timeSlot, 60), 'HH:mm') : '10:00',
    });
    setOpenDialog(true);
  };

  const handleOpenDetails = (schedule) => {
    setSelectedSchedule(schedule);
    setOpenDetailsDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSchedule(null);
    reset();
  };

  const onSubmit = async (data) => {
    try {
      // Combinar data selecionada com horários
      const startDateTime = `${format(selectedDate, 'yyyy-MM-dd')}T${data.start_time}:00`;
      const endDateTime = `${format(selectedDate, 'yyyy-MM-dd')}T${data.end_time}:00`;

      const scheduleData = {
        ...data,
        start_date: startDateTime,
        end_date: endDateTime,
        tenant_id: user.tenant_id,
      };

      if (selectedSchedule) {
        await api.put(`/api/v1/schedules/${selectedSchedule.id}`, scheduleData);
        toast.success('Agendamento atualizado com sucesso!');
      } else {
        await api.post('/api/v1/schedules', scheduleData);
        toast.success('Agendamento criado com sucesso!');
      }

      handleCloseDialog();
      loadSchedules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar agendamento');
    }
  };

  const handleCancelSchedule = async (scheduleId) => {
    if (window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      try {
        await api.post(`/api/v1/schedules/${scheduleId}/cancel`);
        toast.success('Agendamento cancelado com sucesso!');
        loadSchedules();
        setOpenDetailsDialog(false);
      } catch (error) {
        toast.error('Erro ao cancelar agendamento');
      }
    }
  };

  const getSchedulesByDate = (date) => {
    return schedules.filter((s) => 
      isSameDay(parseISO(s.start_date), date)
    );
  };

  const getDaySchedulesCount = (date) => {
    return getSchedulesByDate(date).length;
  };

  const formatTime = (dateTime) => {
    return format(parseISO(dateTime), 'HH:mm');
  };

  const formatPrice = (price) => {
    if (!price) return 'Sob consulta';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price / 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'cancelled': return 'error';
      case 'completed': return 'info';
      default: return 'warning';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Confirmado';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Realizado';
      default: return 'Pendente';
    }
  };

  // Gerar dias do mês
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  // Dias da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Calendário</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Today />}
            onClick={handleToday}
            size={isMobile ? 'small' : 'medium'}
          >
            Hoje
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            size={isMobile ? 'small' : 'medium'}
          >
            Novo Agendamento
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Calendário */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            {/* Cabeçalho do calendário */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton onClick={handlePreviousMonth}>
                  <ChevronLeft />
                </IconButton>
                <Typography variant="h6" sx={{ mx: 2 }}>
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </Typography>
                <IconButton onClick={handleNextMonth}>
                  <ChevronRight />
                </IconButton>
              </Box>
            </Box>

            {/* Dias da semana */}
            <Grid container spacing={1} sx={{ mb: 1 }}>
              {weekDays.map((day) => (
                <Grid item xs key={day} sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {isMobile ? day.charAt(0) : day}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            {/* Dias do mês */}
            <Grid container spacing={1}>
              {monthDays.map((day) => {
                const daySchedules = getSchedulesByDate(day);
                const count = daySchedules.length;
                const isCurrentDay = isToday(day);
                const isSelected = isSameDay(day, selectedDate);

                return (
                  <Grid item xs key={day.toString()}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1,
                        minHeight: isMobile ? 60 : 100,
                        cursor: 'pointer',
                        bgcolor: isSelected ? 'primary.light' : isCurrentDay ? 'action.hover' : 'background.paper',
                        color: isSelected ? 'white' : 'inherit',
                        '&:hover': {
                          bgcolor: isSelected ? 'primary.main' : 'action.hover',
                        },
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onClick={() => handleDateClick(day)}
                    >
                      <Typography
                        variant={isMobile ? 'caption' : 'body2'}
                        sx={{ fontWeight: isCurrentDay ? 'bold' : 'normal' }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      
                      {count > 0 && (
                        <Badge
                          badgeContent={count}
                          color="primary"
                          sx={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            '& .MuiBadge-badge': {
                              fontSize: isMobile ? 8 : 10,
                              height: isMobile ? 16 : 20,
                              minWidth: isMobile ? 16 : 20,
                            },
                          }}
                        />
                      )}

                      {/* Mini preview dos agendamentos (apenas desktop) */}
                      {!isMobile && count > 0 && (
                        <Box sx={{ mt: 1 }}>
                          {daySchedules.slice(0, 2).map((schedule) => (
                            <Chip
                              key={schedule.id}
                              size="small"
                              label={formatTime(schedule.start_date)}
                              sx={{
                                height: 20,
                                mb: 0.5,
                                fontSize: 10,
                                bgcolor: getStatusColor(schedule.status) + '.light',
                              }}
                            />
                          ))}
                          {count > 2 && (
                            <Typography variant="caption" color="text.secondary">
                              +{count - 2} mais
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>

        {/* Agendamentos do dia selecionado */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Agendamentos - {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </Typography>

            {getSchedulesByDate(selectedDate).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Event sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary">
                  Nenhum agendamento para este dia
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog()}
                  sx={{ mt: 2 }}
                  size="small"
                >
                  Agendar
                </Button>
              </Box>
            ) : (
              <Box>
                {getSchedulesByDate(selectedDate)
                  .sort((a, b) => a.start_date.localeCompare(b.start_date))
                  .map((schedule) => (
                    <Card
                      key={schedule.id}
                      sx={{
                        mb: 2,
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: 3,
                        },
                        borderLeft: 4,
                        borderLeftColor: `${getStatusColor(schedule.status)}.main`,
                      }}
                      onClick={() => handleOpenDetails(schedule)}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2">
                              {schedule.product?.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <AccessTime sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {formatTime(schedule.start_date)} - {formatTime(schedule.end_date)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <Person sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {schedule.user?.name}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            size="small"
                            label={getStatusLabel(schedule.status)}
                            color={getStatusColor(schedule.status)}
                            variant="outlined"
                          />
                        </Box>
                        {schedule.service_price && (
                          <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                            {formatPrice(schedule.service_price)}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog de Cadastro/Edição */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {selectedSchedule ? 'Editar Agendamento' : 'Novo Agendamento'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Data selecionada: {format(selectedDate, "dd/MM/yyyy")}
                </Alert>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="provider_id"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.provider_id}>
                      <InputLabel>Profissional</InputLabel>
                      <Select {...field} label="Profissional">
                        {professionals.map((prof) => (
                          <MenuItem key={prof.id} value={prof.id}>
                            {prof.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.provider_id && (
                        <FormHelperText>{errors.provider_id.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="user_id"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.user_id}>
                      <InputLabel>Cliente</InputLabel>
                      <Select {...field} label="Cliente">
                        {users.map((user) => (
                          <MenuItem key={user.id} value={user.id}>
                            {user.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.user_id && (
                        <FormHelperText>{errors.user_id.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="product_id"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.product_id}>
                      <InputLabel>Produto/Serviço</InputLabel>
                      <Select {...field} label="Produto/Serviço">
                        {products.map((product) => (
                          <MenuItem key={product.id} value={product.id}>
                            {product.name} - {formatPrice(product.price)}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.product_id && (
                        <FormHelperText>{errors.product_id.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="start_time"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Horário de Início"
                      type="time"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.start_time}
                      helperText={errors.start_time?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="end_time"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Horário de Término"
                      type="time"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.end_time}
                      helperText={errors.end_time?.message}
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
              {selectedSchedule ? 'Atualizar' : 'Agendar'}
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
        <DialogTitle>Detalhes do Agendamento</DialogTitle>
        <DialogContent dividers>
          {selectedSchedule && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">{selectedSchedule.product?.name}</Typography>
                  <Chip
                    label={getStatusLabel(selectedSchedule.status)}
                    color={getStatusColor(selectedSchedule.status)}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Data</Typography>
                <Typography variant="body2">
                  {format(parseISO(selectedSchedule.start_date), "dd/MM/yyyy")}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Horário</Typography>
                <Typography variant="body2">
                  {formatTime(selectedSchedule.start_date)} - {formatTime(selectedSchedule.end_date)}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Profissional</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                    {selectedSchedule.provider?.name?.charAt(0)}
                  </Avatar>
                  <Typography>{selectedSchedule.provider?.name}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Cliente</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                    {selectedSchedule.user?.name?.charAt(0)}
                  </Avatar>
                  <Typography>{selectedSchedule.user?.name}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Categoria</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Category sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
                  <Typography>{selectedSchedule.category?.name}</Typography>
                </Box>
              </Grid>

              {selectedSchedule.service_price && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Valor</Typography>
                  <Typography variant="h6" color="primary">
                    {formatPrice(selectedSchedule.service_price)}
                  </Typography>
                </Grid>
              )}

              {selectedSchedule.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Observações</Typography>
                  <Paper variant="outlined" sx={{ p: 1, mt: 0.5 }}>
                    <Typography variant="body2">{selectedSchedule.notes}</Typography>
                  </Paper>
                </Grid>
              )}

              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Criado em</Typography>
                <Typography variant="body2">
                  {format(parseISO(selectedSchedule.created_at), "dd/MM/yyyy HH:mm")}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedSchedule?.status === 'active' && (
            <Button
              color="error"
              startIcon={<Cancel />}
              onClick={() => handleCancelSchedule(selectedSchedule.id)}
            >
              Cancelar Agendamento
            </Button>
          )}
          <Button onClick={() => setOpenDetailsDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
