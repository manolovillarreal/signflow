import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, firebaseUser: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Fetch or create user in Firestore
        const userRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userRef);
        
        const SUPERUSER_UID = 'PdKtgSfemAVAkIScFDdxEAnIqL33';
        const isSuperUser = fbUser.uid === SUPERUSER_UID;

        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          if (isSuperUser && userData.rol !== 'superuser') {
            const updatedUser = { ...userData, rol: 'superuser' as const };
            await setDoc(userRef, { rol: 'superuser' }, { merge: true });
            setUser(updatedUser);
          } else {
            setUser(userData);
          }
        } else {
          const newUser: User = {
            uid: fbUser.uid,
            nombre: fbUser.displayName || 'Usuario',
            email: fbUser.email || '',
            foto: fbUser.photoURL || '',
            fechaCreacion: Date.now(),
            rol: isSuperUser ? 'superuser' : 'user'
          };
          await setDoc(userRef, newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
