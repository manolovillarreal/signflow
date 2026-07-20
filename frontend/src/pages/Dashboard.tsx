import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Grid, Card, CardContent, CardActions, Button, AppBar, Toolbar, IconButton, Fab } from '@mui/material';
import { Add as AddIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Group } from '../types';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const fetchGroups = async () => {
        // Query groups where user is a member or admin. For simplicity, checking miembros array.
        // In Firestore, we use 'array-contains'. 
        const q = query(collection(db, 'groups'), where('miembros', 'array-contains', user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedGroups: Group[] = [];
        querySnapshot.forEach((doc) => {
          fetchedGroups.push({ id: doc.id, ...doc.data() } as Group);
        });
        setGroups(fetchedGroups);
      };
      fetchGroups();
    }
  }, [user]);

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
            Hola, {user?.nombre}
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

        <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 32 }} onClick={() => {
          // Implement create group modal
        }}>
          <AddIcon />
        </Fab>
      </Container>
    </Box>
  );
};

export default Dashboard;
