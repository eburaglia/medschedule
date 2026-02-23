import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme';
import Dashboard from '../Dashboard';

const queryClient = new QueryClient();

describe('Dashboard Page', () => {
  test('renders dashboard with stats cards', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <Dashboard />
        </ThemeProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Agendamentos Hoje')).toBeInTheDocument();
      expect(screen.getByText('Usuários Ativos')).toBeInTheDocument();
      expect(screen.getByText('Receita Mensal')).toBeInTheDocument();
    });
  });

  test('displays charts', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <Dashboard />
        </ThemeProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Agendamentos da Semana')).toBeInTheDocument();
      expect(screen.getByText('Serviços por Categoria')).toBeInTheDocument();
      expect(screen.getByText('Receita Mensal')).toBeInTheDocument();
    });
  });
});
