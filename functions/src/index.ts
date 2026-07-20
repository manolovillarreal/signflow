import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { PDFDocument } from 'pdf-lib';


if (!admin.apps.length) {
  admin.initializeApp();
}

export const processSignature = functions.firestore
  .document('signatures_config/{signatureId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if it was just signed
    if (!before.firmadoPorUid && after.firmadoPorUid && after.urlImagenFirma) {
      const documentId = after.documentId;
      const db = admin.firestore();
      
      try {
        // 1. Get the document metadata
        const docRef = db.collection('documents').doc(documentId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
          console.error(`Document ${documentId} not found`);
          return null;
        }
        
        const docData = docSnap.data()!;
        const currentPdfPath = docData.rutaPdfActual;

        // 2. Download the current PDF from Storage
        const bucket = admin.storage().bucket();
        const pdfFile = bucket.file(currentPdfPath);
        const [pdfBuffer] = await pdfFile.download();
        
        // 3. Load PDF with pdf-lib
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();
        const page = pages[after.pagina - 1]; // Assuming 1-indexed in DB

        // 4. Download Signature Image
        // In node 18+ we can use global fetch. Functions node 20 has it.
        const sigResponse = await fetch(after.urlImagenFirma);
        const sigBuffer = await sigResponse.arrayBuffer();
        
        // 5. Embed image
        // We'll assume it's a PNG for now (react-signature-canvas produces PNG Data URLs)
        // If it's a direct URL, we might need to handle JPG as well
        let imageToEmbed;
        try {
          imageToEmbed = await pdfDoc.embedPng(sigBuffer);
        } catch (e) {
          imageToEmbed = await pdfDoc.embedJpg(sigBuffer);
        }

        // 6. Draw image on PDF
        // Need to convert percentages/normalized coordinates to points
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        // If posX, posY, width, height in DB are percentages (0-1)
        const x = after.posX * pageWidth;
        const y = after.posY * pageHeight;
        const drawWidth = after.width * pageWidth;
        const drawHeight = after.height * pageHeight;

        // Note: pdf-lib uses bottom-left as origin (0,0)
        // We might need to invert Y if UI uses top-left origin.
        // Assuming UI uses top-left:
        const pdfY = pageHeight - y - drawHeight;

        page.drawImage(imageToEmbed, {
          x,
          y: pdfY,
          width: drawWidth,
          height: drawHeight,
        });

        // 7. Save new PDF
        const newPdfBytes = await pdfDoc.save();
        const newVersion = (docData.versionActual || 1) + 1;
        const newPdfPath = `documents/${docData.grupoId}/${documentId}_v${newVersion}.pdf`;
        
        const newPdfFile = bucket.file(newPdfPath);
        await newPdfFile.save(newPdfBytes, {
          contentType: 'application/pdf'
        });

        // 8. Update Document in Firestore
        // Also check if all signatures are done to update state
        const signaturesSnap = await db.collection('signatures_config').where('documentId', '==', documentId).get();
        const allSignatures = signaturesSnap.docs.map(d => d.data());
        const allSigned = allSignatures.every(s => s.firmadoPorUid);

        await docRef.update({
          versionActual: newVersion,
          rutaPdfActual: newPdfPath,
          estado: allSigned ? 'Firmado' : 'En proceso'
        });

        console.log(`Successfully merged signature for document ${documentId}`);

      } catch (error) {
        console.error("Error processing signature:", error);
      }
    }
    return null;
  });
