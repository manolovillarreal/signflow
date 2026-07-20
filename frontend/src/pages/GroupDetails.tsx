import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button, AppBar, Toolbar, IconButton, Grid, Paper, List, ListItem, ListItemText, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from '@mui/material';
import { ArrowBack as ArrowBackIcon, UploadFile as UploadIcon } from '@mui/icons-material';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Group, Document as DocType } from '../types';

const GroupDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [documents, setDocuments] = useState<DocType[]>([]);

  // Upload Modal State
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchGroupAndDocs = async () => {
    if (!id) return;
    const groupSnap = await getDoc(doc(db, 'groups', id));
    if (groupSnap.exists()) {
      setGroup({ id: groupSnap.id, ...groupSnap.data() } as Group);
    }

    const q = query(collection(db, 'documents'), where('grupoId', '==', id));
    const docSnap = await getDocs(q);
    const docs: DocType[] = [];
    docSnap.forEach((d) => docs.push({ id: d.id, ...d.data() } as DocType));
    setDocuments(docs);
  };

  useEffect(() => {
    fetchGroupAndDocs();
  }, [id]);

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user || !file || !docName.trim()) return;
    setUploading(true);

    try {
      const storagePath = `documents/${id}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);

      const newDocData = {
        nombre: docName.trim(),
        grupoId: id,
        creadorUid: user.uid,
        fecha: Date.now(),
        estado: 'Pendiente' as const,
        versionActual: 1,
        rutaPdfActual: storagePath,
        rutaPdfOriginal: storagePath
      };

      const docRef = await addDoc(collection(db, 'documents'), newDocData);
      setDocuments(prev => [...prev, { id: docRef.id, ...newDocData }]);
      setDocName('');
      setFile(null);
      setOpenUploadModal(false);
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setUploading(false);
    }
  };

  if (!group) return <Typography sx={{ p: 4 }}>Cargando grupo...</Typography>;

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate('/')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {group.nombre}
          </Typography>
          <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setOpenUploadModal(true)}>
            Subir Documento
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h5" gutterBottom>Documentos</Typography>
              <List>
                {documents.length === 0 ? (
                  <Typography color="textSecondary">No hay documentos en este grupo.</Typography>
                ) : (
                  documents.map((doc) => (
                    <ListItem key={doc.id} onClick={() => navigate(`/document/${doc.id}`)} sx={{ border: '1px solid #eee', mb: 1, borderRadius: 2, cursor: 'pointer' }}>
                      <ListItemText 
                        primary={doc.nombre} 
                        secondary={`Actualizado: ${new Date(doc.fecha).toLocaleDateString()}`}
                      />
                      <Chip 
                        label={doc.estado} 
                        color={doc.estado === 'Firmado' ? 'success' : doc.estado === 'En proceso' ? 'warning' : 'default'} 
                        size="small" 
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" gutterBottom>Detalles del Grupo</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {group.descripcion}
              </Typography>
              <Typography variant="subtitle2">Miembros ({group.miembros.length})</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Upload Document Modal */}
        <Dialog open={openUploadModal} onClose={() => setOpenUploadModal(false)} maxWidth="xs" fullWidth>
          <form onSubmit={handleUploadDocument}>
            <DialogTitle>Subir Documento PDF</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Nombre del Documento"
                fullWidth
                variant="outlined"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              <Button variant="outlined" component="label" fullWidth sx={{ mt: 1 }}>
                {file ? file.name : 'Seleccionar archivo PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      if (!docName) {
                        setDocName(e.target.files[0].name.replace('.pdf', ''));
                      }
                    }
                  }}
                />
              </Button>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenUploadModal(false)} disabled={uploading}>Cancelar</Button>
              <Button type="submit" variant="contained" color="primary" disabled={uploading || !file || !docName.trim()}>
                {uploading ? <CircularProgress size={24} /> : 'Subir'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </Box>
  );
};

export default GroupDetails;
