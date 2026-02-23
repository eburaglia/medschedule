import React, { useState, useEffect } from 'react';
import { Container, AppBar, Toolbar, Typography, Box, Paper, Grid } from '@mui/material';

function App() {
  const [apiInfo, setApiInfo] = useState(null);
  const [apiStatus, setApiStatus] = useState('Verificando...');

  useEffect(() => {
    // Buscar informações da API
    fetch('http://localhost:50800/')
      .then(res => res.json())
      .then(data => {
        setApiInfo(data);
        setApiStatus('Online');
      })
      .catch(err => {
        setApiStatus('Offline');
      });
  }, []);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Medschedule
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            🚀 Medschedule - Sistema de Agendamento
          </Typography>
          
          <Typography variant="body1" paragraph>
            Sistema multi-tenant para agendamento de serviços
          </Typography>

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                  Status do Sistema
                </Typography>
                <Typography>API Backend: {apiStatus}</Typography>
                <Typography>Banco de Dados: Conectado</Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                  Portas Configuradas
                </Typography>
                <Typography>Frontend: 50300</Typography>
                <Typography>Backend API: 50800</Typography>
                <Typography>PostgreSQL: 54320</Typography>
                <Typography>PM2 Monitor: 50301</Typography>
              </Paper>
            </Grid>
          </Grid>

          {apiInfo && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6">Informações da API:</Typography>
              <pre>{JSON.stringify(apiInfo, null, 2)}</pre>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default App;
