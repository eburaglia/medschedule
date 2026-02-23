import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme';
import Login from '../Login';

// Mock do useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock do AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: jest.fn().mockResolvedValue({ success: true }),
  }),
}));

describe('Login Page', () => {
  test('renders login form', () => {
    render(
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <Login />
        </ThemeProvider>
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/Usuário ou Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });

  test('submits form with credentials', async () => {
    render(
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <Login />
        </ThemeProvider>
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/Usuário ou Email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('shows error message on failed login', async () => {
    // Mock de login com erro
    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockImplementation(() => ({
      login: jest.fn().mockResolvedValue({ 
        success: false, 
        error: 'Credenciais inválidas' 
      }),
    }));

    render(
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <Login />
        </ThemeProvider>
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/Usuário ou Email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
    });
  });
});
