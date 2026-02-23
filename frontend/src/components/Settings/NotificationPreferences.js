import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Typography,
  Paper,
} from '@mui/material';

export default function NotificationPreferences({ settings, onChange }) {
  const categories = [
    {
      title: 'Email',
      items: [
        { key: 'emailAppointments', label: 'Novos agendamentos' },
        { key: 'emailReminders', label: 'Lembretes' },
        { key: 'emailCancellations', label: 'Cancelamentos' },
        { key: 'emailPromotions', label: 'Promoções' },
      ],
    },
    {
      title: 'SMS',
      items: [
        { key: 'smsAppointments', label: 'Novos agendamentos' },
        { key: 'smsReminders', label: 'Lembretes' },
      ],
    },
    {
      title: 'Push',
      items: [
        { key: 'pushAppointments', label: 'Novos agendamentos' },
        { key: 'pushReminders', label: 'Lembretes' },
      ],
    },
  ];

  return (
    <>
      {categories.map((category) => (
        <Paper key={category.title} variant="outlined" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ p: 2, pb: 0 }}>
            {category.title}
          </Typography>
          <List>
            {category.items.map((item) => (
              <ListItem key={item.key}>
                <ListItemText primary={item.label} />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={settings[item.key]}
                    onChange={() => onChange(item.key)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      ))}
    </>
  );
}
