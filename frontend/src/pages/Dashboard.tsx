import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Grid, Card, CardContent, CardActions, Button, AppBar, Toolbar, IconButton, Fab, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from '@mui/material';
import { Add as AddIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Group } from '../types';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const navigate = useNavigate();

  // Create Group Modal State
  const [openModal, setOpenModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchGroups = async () => {
    if (!user) return;
    const q = query(collection(db, 'groups'), where('miembros', 'array-contains', user.uid));
    const querySnapshot = await getDocs(q);
    const fetchedGroups: Group[] = [];
    querySnapshot.forEach((doc) => {
      fetchedGroups.push({ id: doc.id, ...doc.data() } as Group);
    });
    setGroups(fetchedGroups);
  };

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !nombre.trim()) return;
    setCreating(true);
    try {
      const groupData = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        creadorUid: user.uid,
        administradores: [user.uid],
        miembros: [user.uid],
        fechaCreacion: Date.now()
      };
      const docRef = await addDoc(collection(db, 'groups'), groupData);
      setGroups(prev => [...prev, { id: docRef.id, ...groupData }]);
      setNombre('');
      setDescripcion('');
      setOpenModal(false);
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'primary.main', fontWeight: 'bold' }}>
            SignFlow
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Hola, {user?.nombre} {user?.rol === 'superuser' ? '(SuperAdmin)' : ''}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Mis Grupos de Trabajo
        </Typography>

        <Grid container spacing={3}>
          {groups.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Typography color="textSecondary">No perteneces a ningún grupo aún.</Typography>
              </Box>
            </Grid>
          ) : (
            groups.map((group) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={group.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>{group.nombre}</Typography>
                    <Typography color="textSecondary" variant="body2">
                      {group.descripcion}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" color="primary" onClick={() => navigate(`/group/${group.id}`)}>
                      Ver Grupo
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>

        { (user?.rol === 'superuser' || user?.rol === 'admin' || user?.uid === 'PdKtgSfemAVAkIScFDdxEAnIqL33') && (
          <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 32 }} onClick={() => setOpenModal(true)}>
            <AddIcon />
          </Fab>
        )}

        {/* Create Group Modal */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
          <form onSubmit={handleCreateGroup}>
            <DialogTitle>Crear Nuevo Grupo</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Nombre del Grupo"
                fullWidth
                variant="outlined"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Descripción"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenModal(false)} disabled={creating}>Cancelar</Button>
              <Button type="submit" variant="contained" color="primary" disabled={creating || !nombre.trim()}>
                {creating ? <CircularProgress size={24} /> : 'Crear'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Dashboard;
