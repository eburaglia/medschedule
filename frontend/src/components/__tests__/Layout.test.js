import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme';
import Layout from '../Layout/Layout';

// Mock do AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test User' },
    logout: jest.fn(),
  }),
}));

describe('Layout Component', () => {
  test('renders layout with menu items', () => {
    render(
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <Layout />
        </ThemeProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Medschedule')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Usuários')).toBeInTheDocument();
    expect(screen.getByText('Categorias')).toBeInTheDocument();
  });

  test('displays user name in header', () => {
    render(
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <Layout />
        </ThemeProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});
