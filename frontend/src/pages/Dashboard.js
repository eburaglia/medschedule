import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  TrendingUp,
  TrendingDown,
  People,
  Event,
  AttachMoney,
  Star,
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
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Dados de exemplo (depois virão da API)
const appointmentData = [
  { name: 'Seg', agendamentos: 4 },
  { name: 'Ter', agendamentos: 3 },
  { name: 'Qua', agendamentos: 7 },
  { name: 'Qui', agendamentos: 5 },
  { name: 'Sex', agendamentos: 6 },
  { name: 'Sáb', agendamentos: 2 },
  { name: 'Dom', agendamentos: 1 },
];

const revenueData = [
  { name: 'Jan', receita: 4000 },
  { name: 'Fev', receita: 3000 },
  { name: 'Mar', receita: 5000 },
  { name: 'Abr', receita: 4500 },
  { name: 'Mai', receita: 6000 },
  { name: 'Jun', receita: 5500 },
];

const categoryData = [
  { name: 'Consultas', value: 45 },
  { name: 'Exames', value: 25 },
  { name: 'Procedimentos', value: 15 },
  { name: 'Outros', value: 15 },
];

const COLORS = ['#1976d2', '#9c27b0', '#2e7d32', '#ed6c02'];

const StatCard = ({ title, value, icon, trend, trendValue }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography color="textSecondary" gutterBottom variant={isMobile ? 'body2' : 'body1'}>
            {title}
          </Typography>
          <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        </Box>
        <Typography variant={isMobile ? 'h5' : 'h4'} component="div" sx={{ mb: 1 }}>
          {value}
        </Typography>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {trend === 'up' ? (
              <TrendingUp sx={{ color: 'success.main', mr: 0.5, fontSize: 20 }} />
            ) : (
              <TrendingDown sx={{ color: 'error.main', mr: 0.5, fontSize: 20 }} />
            )}
            <Typography variant="body2" color="textSecondary">
              {trendValue} em relação ao mês passado
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Dashboard
      </Typography>

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Agendamentos Hoje"
            value="12"
            icon={<Event />}
            trend="up"
            trendValue="+8%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Usuários Ativos"
            value="1,234"
            icon={<People />}
            trend="up"
            trendValue="+12%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Receita Mensal"
            value="R$ 45.678"
            icon={<AttachMoney />}
            trend="up"
            trendValue="+15%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Satisfação"
            value="4.8"
            icon={<Star />}
            trend="down"
            trendValue="-2%"
          />
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Gráfico de Agendamentos */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Agendamentos da Semana
              </Typography>
              <Box sx={{ width: '100%', height: isMobile ? 250 : 300 }}>
                <ResponsiveContainer>
                  <AreaChart data={appointmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="agendamentos"
                      stroke={theme.palette.primary.main}
                      fill={theme.palette.primary.light}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfico de Categorias */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Serviços por Categoria
              </Typography>
              <Box sx={{ width: '100%', height: isMobile ? 250 : 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={isMobile ? 70 : 80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfico de Receita */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Receita Mensal
              </Typography>
              <Box sx={{ width: '100%', height: isMobile ? 250 : 300 }}>
                <ResponsiveContainer>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="receita" fill={theme.palette.secondary.main} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
