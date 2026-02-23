import React, { useState } from 'react';
import {
  Popover,
  Box,
  TextField,
  Button,
  Typography,
} from '@mui/material';
import { SketchPicker } from 'react-color';

export default function ColorPicker({ label, value, onChange }) {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (color) => {
    onChange(color.hex);
  };

  return (
    <Box>
      <Typography variant="body2" gutterBottom>
        {label}
      </Typography>
      <Box
        onClick={handleClick}
        sx={{
          width: '100%',
          height: 40,
          borderRadius: 1,
          cursor: 'pointer',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: value,
        }}
      />
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <SketchPicker color={value} onChange={handleChange} />
      </Popover>
    </Box>
  );
}
