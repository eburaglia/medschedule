import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  useMediaQuery,
  Tab,
  Tabs,
  Chip,
  Avatar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Download,
  Print,
  DateRange,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  People,
  Event,
  Category,
  Assessment,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ShowChart,
  CalendarToday,
  Receipt,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Cores para gráficos
const COLORS = ['#1976d2', '#9c27b0', '#2e7d32', '#ed6c02', '#d32f2f', '#0288d1'];

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Reports() {
  const theme = useTheme();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: new Date(),
  });
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [professionals, setProfessionals] = useState([]);
  const [categories, setCategories] = useState([]);

  // Dados dos relatórios
  const [revenueData, setRevenueData] = useState([]);
  const [appointmentsData, setAppointmentsData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [providerData, setProviderData] = useState([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalAppointments: 0,
    averageTicket: 0,
    cancellationRate: 0,
    topProvider: null,
    busiestDay: null,
  });

  useEffect(() => {
    loadReports();
    loadFilters();
  }, [dateRange, selectedProvider, selectedCategory]);

  const loadFilters = async () => {
    try {
      const [professionalsRes, categoriesRes] = await Promise.all([
        api.get('/api/v1/users', { params: { user_type: 'prestador' } }),
        api.get('/api/v1/categories'),
      ]);
      setProfessionals(professionalsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
        end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
        provider_id: selectedProvider !== 'all' ? selectedProvider : undefined,
        category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
      };

      const response = await api.get('/api/v1/reports/dashboard', { params });
      
      setRevenueData(response.data.revenueByDay || []);
      setAppointmentsData(response.data.appointmentsByHour || []);
      setCategoryData(response.data.byCategory || []);
      setProviderData(response.data.byProvider || []);
      setSummary(response.data.summary || {});
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    const end = new Date();
    let start;

    switch (period) {
      case 'week':
        start = subDays(end, 7);
        break;
      case 'month':
        start = subMonths(end, 1);
        break;
      case 'quarter':
        start = subMonths(end, 3);
        break;
      case 'year':
        start = subMonths(end, 12);
        break;
      default:
        start = subMonths(end, 1);
    }

    setDateRange({ startDate: start, endDate: end });
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Receita por dia
    const revenueSheet = XLSX.utils.json_to_sheet(
      revenueData.map(item => ({
        Data: item.date,
        Receita: item.revenue / 100,
        Agendamentos: item.count,
      }))
    );
    XLSX.utils.book_append_sheet(wb, revenueSheet, 'Receita');

    // Por categoria
    const categorySheet = XLSX.utils.json_to_sheet(
      categoryData.map(item => ({
        Categoria: item.name,
        Quantidade: item.value,
        Receita: item.revenue / 100,
      }))
    );
    XLSX.utils.book_append_sheet(wb, categorySheet, 'Categorias');

    // Por profissional
    const providerSheet = XLSX.utils.json_to_sheet(
      providerData.map(item => ({
        Profissional: item.name,
        Agendamentos: item.appointments,
        Receita: item.revenue / 100,
        Comissão: item.commission / 100,
      }))
    );
    XLSX.utils.book_append_sheet(wb, providerSheet, 'Profissionais');

    const fileName = `relatorio_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Desempenho', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Período: ${format(dateRange.startDate, 'dd/MM/yyyy')} a ${format(dateRange.endDate, 'dd/MM/yyyy')}`, 14, 32);
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo', 14, 45);
    
    doc.setFontSize(10);
    doc.text(`Receita Total: R$ ${(summary.totalRevenue / 100).toFixed(2)}`, 14, 55);
    doc.text(`Total de Agendamentos: ${summary.totalAppointments}`, 14, 62);
    doc.text(`Ticket Médio: R$ ${(summary.averageTicket / 100).toFixed(2)}`, 14, 69);
    doc.text(`Taxa de Cancelamento: ${summary.cancellationRate}%`, 14, 76);

    // Tabela de profissionais
    doc.setFontSize(14);
    doc.text('Desempenho por Profissional', 14, 90);

    const tableColumn = ['Profissional', 'Agendamentos', 'Receita', 'Comissão'];
    const tableRows = providerData.map(item => [
      item.name,
      item.appointments,
      `R$ ${(item.revenue / 100).toFixed(2)}`,
      `R$ ${(item.commission / 100).toFixed(2)}`,
    ]);

    doc.autoTable({
      startY: 95,
      head: [tableColumn],
      body: tableRows,
    });

    doc.save(`relatorio_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const StatCard = ({ title, value, icon, trend, subtitle }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography color="textSecondary" variant="body2">
            {title}
          </Typography>
          <Avatar sx={{ bgcolor: 'primary.light', width: 40, height: 40 }}>
            {icon}
          </Avatar>
        </Box>
        <Typography variant="h5" component="div" sx={{ mb: 1 }}>
          {value}
        </Typography>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {trend > 0 ? (
              <TrendingUp sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
            ) : (
              <TrendingDown sx={{ color: 'error.main', fontSize: 16, mr: 0.5 }} />
            )}
            <Typography variant="caption" color="textSecondary">
              {Math.abs(trend)}% em relação ao período anterior
            </Typography>
          </Box>
        )}
        {subtitle && (
          <Typography variant="caption" color="textSecondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Relatórios</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Exportar Excel">
            <IconButton onClick={handleExportExcel} color="primary">
              <Download />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exportar PDF">
            <IconButton onClick={handleExportPDF} color="primary">
              <Print />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Período</InputLabel>
              <Select
                value={selectedPeriod}
                label="Período"
                onChange={(e) => handlePeriodChange(e.target.value)}
              >
                <MenuItem value="week">Últimos 7 dias</MenuItem>
                <MenuItem value="month">Último mês</MenuItem>
                <MenuItem value="quarter">Último trimestre</MenuItem>
                <MenuItem value="year">Último ano</MenuItem>
                <MenuItem value="custom">Personalizado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {selectedPeriod === 'custom' && (
            <>
              <Grid item xs={12} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                  <DatePicker
                    label="Data Inicial"
                    value={dateRange.startDate}
                    onChange={(date) => setDateRange({ ...dateRange, startDate: date })}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                  <DatePicker
                    label="Data Final"
                    value={dateRange.endDate}
                    onChange={(date) => setDateRange({ ...dateRange, endDate: date })}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
            </>
          )}

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Profissional</InputLabel>
              <Select
                value={selectedProvider}
                label="Profissional"
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                {professionals.map((prof) => (
                  <MenuItem key={prof.id} value={prof.id}>{prof.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoria</InputLabel>
              <Select
                value={selectedCategory}
                label="Categoria"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">Todas</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Cards de Resumo */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Receita Total"
                value={formatCurrency(summary.totalRevenue)}
                icon={<AttachMoney />}
                trend={12}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Agendamentos"
                value={summary.totalAppointments}
                icon={<Event />}
                trend={8}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Ticket Médio"
                value={formatCurrency(summary.averageTicket)}
                icon={<Assessment />}
                trend={-3}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Cancelamentos"
                value={`${summary.cancellationRate}%`}
                icon={<TrendingDown />}
                trend={5}
              />
            </Grid>
          </Grid>

          {/* Tabs de Relatórios */}
          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={tabValue}
              onChange={(e, v) => setTabValue(v)}
              variant={isMobile ? 'scrollable' : 'fullWidth'}
              scrollButtons="auto"
            >
              <Tab icon={<ShowChart />} label="Receita" />
              <Tab icon={<BarChartIcon />} label="Agendamentos" />
              <Tab icon={<PieChartIcon />} label="Categorias" />
              <Tab icon={<People />} label="Profissionais" />
            </Tabs>

            {/* Receita */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Receita por Dia
                </Typography>
                <Box sx={{ width: '100%', height: isMobile ? 300 : 400 }}>
                  <ResponsiveContainer>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Receita"
                        stroke={theme.palette.primary.main}
                        fill={theme.palette.primary.light}
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Top Dias
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Data</TableCell>
                          <TableCell align="right">Agendamentos</TableCell>
                          <TableCell align="right">Receita</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {revenueData.slice(0, 5).map((item) => (
                          <TableRow key={item.date}>
                            <TableCell>{item.date}</TableCell>
                            <TableCell align="right">{item.count}</TableCell>
                            <TableCell align="right">{formatCurrency(item.revenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Box>
            </TabPanel>

            {/* Agendamentos */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Agendamentos por Hora
                </Typography>
                <Box sx={{ width: '100%', height: isMobile ? 300 : 400 }}>
                  <ResponsiveContainer>
                    <BarChart data={appointmentsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="count" name="Agendamentos" fill={theme.palette.primary.main} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Dia mais movimentado
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6">{summary.busiestDay || '-'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Horário de pico
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6">
                        {appointmentsData.reduce((max, item) => 
                          item.count > (max?.count || 0) ? item : max, null)?.hour || '-'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>

            {/* Categorias */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ p: 2 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Distribuição por Categoria
                    </Typography>
                    <Box sx={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={isMobile ? 80 : 100}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Detalhamento
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Categoria</TableCell>
                            <TableCell align="right">Quantidade</TableCell>
                            <TableCell align="right">Receita</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {categoryData.map((item) => (
                            <TableRow key={item.name}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell align="right">{item.value}</TableCell>
                              <TableCell align="right">{formatCurrency(item.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>

            {/* Profissionais */}
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Ranking de Profissionais
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Profissional</TableCell>
                        <TableCell align="right">Agendamentos</TableCell>
                        <TableCell align="right">Receita</TableCell>
                        <TableCell align="right">Comissão</TableCell>
                        <TableCell align="right">Ticket Médio</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {providerData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                                {item.name?.charAt(0)}
                              </Avatar>
                              {item.name}
                            </Box>
                          </TableCell>
                          <TableCell align="right">{item.appointments}</TableCell>
                          <TableCell align="right">{formatCurrency(item.revenue)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.commission)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.averageTicket)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {summary.topProvider && (
                  <Box sx={{ mt: 3 }}>
                    <Alert severity="info">
                      <Typography variant="subtitle2">
                        Destaque do período: {summary.topProvider.name}
                      </Typography>
                      <Typography variant="body2">
                        {summary.topProvider.appointments} agendamentos | 
                        Receita: {formatCurrency(summary.topProvider.revenue)}
                      </Typography>
                    </Alert>
                  </Box>
                )}
              </Box>
            </TabPanel>
          </Paper>
        </>
      )}
    </Box>
  );
}
