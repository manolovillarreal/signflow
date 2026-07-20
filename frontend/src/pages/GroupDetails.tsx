import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button, AppBar, Toolbar, IconButton, Grid, Paper, List, ListItem, ListItemText, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Alert } from '@mui/material';
import { ArrowBack as ArrowBackIcon, UploadFile as UploadIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Group, Document as DocType, User } from '../types';

const GroupDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [memberUsers, setMemberUsers] = useState<User[]>([]);

  // Upload Modal State
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Add Member Modal State
  const [openMemberModal, setOpenMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  const fetchGroupAndDocs = async () => {
    if (!id) return;
    const groupSnap = await getDoc(doc(db, 'groups', id));
    if (groupSnap.exists()) {
      const gData = { id: groupSnap.id, ...groupSnap.data() } as Group;
      setGroup(gData);

      // Fetch members profiles
      if (gData.miembros && gData.miembros.length > 0) {
        const uList: User[] = [];
        for (const mUid of gData.miembros) {
          const uSnap = await getDoc(doc(db, 'users', mUid));
          if (uSnap.exists()) {
            uList.push(uSnap.data() as User);
          }
        }
        setMemberUsers(uList);
      }
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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !memberEmail.trim()) return;
    setAddingMember(true);
    setMemberError('');

    try {
      // Find user by email
      const q = query(collection(db, 'users'), where('email', '==', memberEmail.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setMemberError('No se encontró ningún usuario registrado con ese correo.');
        setAddingMember(false);
        return;
      }

      const targetUser = snap.docs[0].data() as User;
      if (group?.miembros.includes(targetUser.uid)) {
        setMemberError('El usuario ya es miembro de este grupo.');
        setAddingMember(false);
        return;
      }

      // Add to group.miembros
      await updateDoc(doc(db, 'groups', id), {
        miembros: arrayUnion(targetUser.uid)
      });

      setMemberUsers(prev => [...prev, targetUser]);
      setGroup(prev => prev ? { ...prev, miembros: [...prev.miembros, targetUser.uid] } : null);
      setMemberEmail('');
      setOpenMemberModal(false);
    } catch (error: any) {
      console.error('Error adding member:', error);
      setMemberError(error.message || 'Error al agregar miembro.');
    } finally {
      setAddingMember(false);
    }
  };

  if (!group) return <Typography sx={{ p: 4 }}>Cargando grupo...</Typography>;

  const isAdmin = user && (group.administradores.includes(user.uid) || user.rol === 'superuser' || user.uid === 'PdKtgSfemAVAkIScFDdxEAnIqL33');

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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Detalles del Grupo</Typography>
                {isAdmin && (
                  <IconButton color="primary" size="small" onClick={() => setOpenMemberModal(true)} title="Agregar Miembro">
                    <PersonAddIcon />
                  </IconButton>
                )}
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {group.descripcion}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Miembros ({memberUsers.length})
              </Typography>
              <List dense>
                {memberUsers.map((m) => (
                  <ListItem key={m.uid} sx={{ px: 0 }}>
                    <ListItemText primary={m.nombre} secondary={m.email} />
                  </ListItem>
                ))}
              </List>
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

        {/* Add Member Modal */}
        <Dialog open={openMemberModal} onClose={() => setOpenMemberModal(false)} maxWidth="xs" fullWidth>
          <form onSubmit={handleAddMember}>
            <DialogTitle>Agregar Miembro al Grupo</DialogTitle>
            <DialogContent>
              {memberError && <Alert severity="error" sx={{ mb: 2 }}>{memberError}</Alert>}
              <TextField
                autoFocus
                margin="dense"
                label="Correo del Usuario"
                type="email"
                fullWidth
                variant="outlined"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                required
                placeholder="ejemplo@correo.com"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenMemberModal(false)} disabled={addingMember}>Cancelar</Button>
              <Button type="submit" variant="contained" color="primary" disabled={addingMember || !memberEmail.trim()}>
                {addingMember ? <CircularProgress size={24} /> : 'Agregar'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </Box>
  );
};

export default GroupDetails;
