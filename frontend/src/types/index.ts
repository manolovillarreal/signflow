export interface User {
  uid: string;
  nombre: string;
  email: string;
  foto?: string;
  fechaCreacion: number;
}

export interface Group {
  id: string;
  nombre: string;
  descripcion: string;
  creadorUid: string;
  administradores: string[];
  miembros: string[];
  fechaCreacion: number;
}

export interface Document {
  id: string;
  nombre: string;
  grupoId: string;
  creadorUid: string;
  fecha: number;
  estado: 'Pendiente' | 'En proceso' | 'Firmado';
  versionActual: number;
  rutaPdfActual: string;
  rutaPdfOriginal: string;
}

export interface SignatureConfig {
  id: string;
  documentId: string;
  asignadoAUid: string | null; // null if open signature
  pagina: number;
  posX: number;
  posY: number;
  width: number;
  height: number;
  firmadoPorUid?: string;
  fechaFirma?: number;
  urlImagenFirma?: string;
}

export interface AuditLog {
  id: string;
  usuarioUid: string;
  accion: 'login' | 'creacion_grupo' | 'edicion_grupo' | 'carga_doc' | 'descarga_doc' | 'firma' | 'eliminacion_doc';
  documentoId?: string;
  grupoId?: string;
  fecha: number;
}
