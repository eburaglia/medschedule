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
