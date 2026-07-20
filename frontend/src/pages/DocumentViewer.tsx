import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, AppBar, Toolbar, IconButton, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { ref, getDownloadURL, uploadString } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Document as DocType, SignatureConfig } from '../types';
import SignatureCanvas from 'react-signature-canvas';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DocumentViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [docData, setDocData] = useState<DocType | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<SignatureConfig[]>([]);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // Signing modal state
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [selectedSignatureConfig, setSelectedSignatureConfig] = useState<SignatureConfig | null>(null);
  const sigCanvasRef = useRef<any>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'documents', id));
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as DocType;
          setDocData(data);

          // Get download URL
          const url = await getDownloadURL(ref(storage, data.rutaPdfActual));
          setPdfUrl(url);

          // Fetch signatures configs
          const q = query(collection(db, 'signatures_config'), where('documentId', '==', id));
          const sigSnap = await getDocs(q);
          const sigs: SignatureConfig[] = [];
          sigSnap.forEach(s => sigs.push({ id: s.id, ...s.data() } as SignatureConfig));
          setSignatures(sigs);
        }
      } catch (error) {
        console.error("Error fetching doc:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleOpenSignModal = (sigConfig: SignatureConfig) => {
    setSelectedSignatureConfig(sigConfig);
    setIsSignModalOpen(true);
  };

  const handleSignSubmit = async () => {
    if (!sigCanvasRef.current || !selectedSignatureConfig || !user || !docData) return;
    
    const dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
    
    try {
      setLoading(true);
      // Upload signature to storage
      const sigRef = ref(storage, `signatures/${docData.grupoId}/${user.uid}_${Date.now()}.png`);
      await uploadString(sigRef, dataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(sigRef);

      // Update signature config in firestore
      await updateDoc(doc(db, 'signatures_config', selectedSignatureConfig.id), {
        firmadoPorUid: user.uid,
        fechaFirma: Date.now(),
        urlImagenFirma: downloadUrl
      });

      setIsSignModalOpen(false);
      // We would likely need to refetch or listen to realtime updates here
      // For now, reload window to see changes
      window.location.reload();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (!docData || !pdfUrl) return <Typography>Documento no encontrado</Typography>;

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f0f0f0' }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {docData.nombre} - {docData.estado}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: 'white', p: 2, boxShadow: 3, position: 'relative' }}>
          <Document 
            file={pdfUrl} 
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<CircularProgress />}
          >
            <Page pageNumber={pageNumber} width={800} renderAnnotationLayer={false} renderTextLayer={false} />
            
            {/* Overlay signature spots */}
            {signatures.filter(s => s.pagina === pageNumber).map(sig => {
              const isMyTurn = !sig.firmadoPorUid && (sig.asignadoAUid === null || sig.asignadoAUid === user?.uid);
              return (
                <Box 
                  key={sig.id}
                  sx={{
                    position: 'absolute',
                    top: `${sig.posY * 100}%`,
                    left: `${sig.posX * 100}%`,
                    width: `${sig.width * 100}%`,
                    height: `${sig.height * 100}%`,
                    border: isMyTurn ? '2px dashed #10b981' : '1px solid #ccc',
                    bgcolor: sig.firmadoPorUid ? 'rgba(0,0,0,0.1)' : 'rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isMyTurn ? 'pointer' : 'default',
                  }}
                  onClick={() => isMyTurn ? handleOpenSignModal(sig) : null}
                >
                  {!sig.firmadoPorUid && isMyTurn && (
                    <Typography variant="caption" fontWeight="bold" color="secondary.main">
                      Click para firmar
                    </Typography>
                  )}
                  {sig.firmadoPorUid && (
                    <Typography variant="caption" color="textSecondary">
                      Firmado
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Document>
        </Box>
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)}>Anterior</Button>
          <Typography component="span" sx={{ mx: 2 }}>Página {pageNumber} de {numPages}</Typography>
          <Button disabled={pageNumber >= (numPages || 1)} onClick={() => setPageNumber(p => p + 1)}>Siguiente</Button>
        </Box>
      </Container>

      {/* Signature Modal */}
      <Dialog open={isSignModalOpen} onClose={() => setIsSignModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Firma el Documento</DialogTitle>
        <DialogContent>
          <Box sx={{ border: '1px solid #ccc', borderRadius: 2, overflow: 'hidden' }}>
            <SignatureCanvas 
              ref={sigCanvasRef} 
              penColor='black'
              canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }} 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => sigCanvasRef.current?.clear()}>Limpiar</Button>
          <Button onClick={() => setIsSignModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSignSubmit} variant="contained" color="primary">Confirmar Firma</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentViewer;
