import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Stepper,
  Step,
  StepLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material';
import {
  CloudUpload,
  Download,
  CheckCircle,
  Error,
  Warning,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

export default function ImportDialog({
  open,
  onClose,
  onImport,
  duplicates,
  onResolveDuplicate,
  entityName,
  templateColumns,
}) {
  const [file, setFile] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);
  const [resolveAction, setResolveAction] = useState('merge');

  const steps = ['Upload do Arquivo', 'Revisar Duplicatas', 'Resultado'];

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    onDrop: (acceptedFiles) => {
      setFile(acceptedFiles[0]);
    },
    maxFiles: 1,
  });

  const handleImport = () => {
    if (file) {
      onImport(file);
      setActiveStep(2);
    }
  };

  const handleDownloadTemplate = () => {
    // Gerar CSV template
    const header = templateColumns.join(',');
    const blob = new Blob([header], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${entityName}.csv`;
    a.click();
  };

  const handleResolve = () => {
    if (selectedDuplicate && resolveAction) {
      onResolveDuplicate(selectedDuplicate, resolveAction);
      setSelectedDuplicate(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Importar {entityName}</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Formatos aceitos: CSV, XLSX. Tamanho máximo: 10MB
            </Alert>

            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadTemplate}
              sx={{ mb: 2 }}
            >
              Baixar Template
            </Button>

            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: 'background.default',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">
                Arraste um arquivo ou clique para selecionar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {file ? file.name : 'Nenhum arquivo selecionado'}
              </Typography>
            </Box>
          </Box>
        )}

        {activeStep === 1 && duplicates?.length > 0 && (
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Foram encontradas {duplicates.length} duplicatas. Por favor, resolva cada uma.
            </Alert>

            {selectedDuplicate ? (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Resolver Duplicata - Linha {selectedDuplicate.row}
                </Typography>

                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Campo</TableCell>
                        <TableCell>Dado Existente</TableCell>
                        <TableCell>Dado Importado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.keys(selectedDuplicate.data).map((key) => (
                        <TableRow key={key}>
                          <TableCell>{key}</TableCell>
                          <TableCell>
                            {selectedDuplicate.existing_user[key]}
                          </TableCell>
                          <TableCell>
                            {selectedDuplicate.data[key]}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <FormLabel component="legend">Ação</FormLabel>
                  <RadioGroup
                    value={resolveAction}
                    onChange={(e) => setResolveAction(e.target.value)}
                  >
                    <FormControlLabel
                      value="merge"
                      control={<Radio />}
                      label="Merge (manter dados existentes, adicionar apenas campos vazios)"
                    />
                    <FormControlLabel
                      value="replace"
                      control={<Radio />}
                      label="Substituir (sobrescrever com dados importados)"
                    />
                    <FormControlLabel
                      value="discard"
                      control={<Radio />}
                      label="Descartar (ignorar importação)"
                    />
                  </RadioGroup>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setSelectedDuplicate(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleResolve}
                  >
                    Aplicar
                  </Button>
                </Box>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Linha</TableCell>
                      <TableCell>Dados</TableCell>
                      <TableCell>Registro Existente</TableCell>
                      <TableCell align="center">Ação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {duplicates.map((dup, index) => (
                      <TableRow key={index}>
                        <TableCell>{dup.row}</TableCell>
                        <TableCell>
                          <pre>{JSON.stringify(dup.data, null, 2)}</pre>
                        </TableCell>
                        <TableCell>
                          <pre>{JSON.stringify(dup.existing_user, null, 2)}</pre>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSelectedDuplicate(dup)}
                          >
                            Resolver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Importação concluída com sucesso!
            </Alert>
            {/* Mostrar resultados da importação */}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        {activeStep === 0 && (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!file}
          >
            Importar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
