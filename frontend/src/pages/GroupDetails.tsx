import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button, AppBar, Toolbar, IconButton, Grid, Paper, List, ListItem, ListItemText, Chip } from '@mui/material';
import { ArrowBack as ArrowBackIcon, UploadFile as UploadIcon } from '@mui/icons-material';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Group, Document as DocType } from '../types';

const GroupDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [documents, setDocuments] = useState<DocType[]>([]);

  useEffect(() => {
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

    fetchGroupAndDocs();
  }, [id]);

  if (!group) return <Typography>Cargando...</Typography>;

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
          <Button variant="contained" startIcon={<UploadIcon />} onClick={() => {/* Open Upload Modal */}}>
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
              {/* Here we would fetch member names if we had them or just show their UIDs/roles */}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default GroupDetails;
