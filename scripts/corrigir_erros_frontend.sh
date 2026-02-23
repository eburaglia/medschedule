#!/bin/bash

echo "==================================="
echo "🔧 Corrigindo Erros do Frontend"
echo "==================================="

# 1. Instalar dependências no container
echo "📦 Instalando dependências no container..."
docker exec medschedule-frontend sh -c "
    cd /app &&
    npm install axios @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/x-date-pickers @mui/x-data-grid &&
    npm install react-router-dom react-hook-form yup react-toastify react-query recharts date-fns &&
    npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
"

# 2. Criar diretórios necessários
echo "📁 Criando diretórios..."
docker exec medschedule-frontend mkdir -p /app/src/components/Users /app/src/services /app/src/pages

# 3. Copiar arquivos corrigidos para o container
echo "📋 Copiando arquivos para o container..."

# Criar UserDetails.js temporariamente no host e copiar
cat > /tmp/UserDetails.js << 'EOF'
import React from 'react';
import { Grid, Typography, Chip, Box, Avatar } from '@mui/material';

export default function UserDetails({ user }) {
  const getStatusChip = (status) => {
    const colors = {
      active: 'success',
      inactive: 'error',
      pending: 'warning'
    };
    return <Chip label={status} color={colors[status] || 'default'} size="small" />;
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar sx={{ width: 60, height: 60, mr: 2 }}>
          {user?.name?.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="h6">{user?.name}</Typography>
          <Typography variant="body2" color="textSecondary">{user?.email}</Typography>
        </Box>
      </Grid>
      <Grid item xs={6}>
        <Typography variant="subtitle2" color="textSecondary">CPF</Typography>
        <Typography variant="body1">{user?.cpf || '-'}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant="subtitle2" color="textSecondary">Tipo</Typography>
        <Typography variant="body1">
          {user?.user_type === 'prestador' ? 'Prestador' : 'Cliente'}
        </Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant="subtitle2" color="textSecondary">Status</Typography>
        <Box sx={{ mt: 0.5 }}>{getStatusChip(user?.status)}</Box>
      </Grid>
    </Grid>
  );
}
EOF

docker cp /tmp/UserDetails.js medschedule-frontend:/app/src/components/Users/UserDetails.js

# Criar api.js
cat > /tmp/api.js << 'EOF'
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:50800',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
EOF

docker cp /tmp/api.js medschedule-frontend:/app/src/services/api.js

# Criar theme.js
cat > /tmp/theme.js << 'EOF'
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
    background: { default: '#f5f5f5' },
  },
});

export default theme;
EOF

docker cp /tmp/theme.js medschedule-frontend:/app/src/theme.js

# 4. Reiniciar o frontend
echo "🔄 Reiniciando frontend..."
docker restart medschedule-frontend

echo "⏳ Aguardando 10 segundos..."
sleep 10

# 5. Verificar logs
echo ""
echo "📋 Logs após correção:"
docker logs --tail 30 medschedule-frontend

echo ""
echo "==================================="
echo "✅ Correção aplicada"
echo "==================================="
