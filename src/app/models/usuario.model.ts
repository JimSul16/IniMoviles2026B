export interface Usuario {
  uid: string;
  email: string;
  displayName: string;
  rol: 'inspector' | 'supervisor' | 'administrador';
  departamento?: string;
  fotoUrl?: string;
  token?: string;
  proveedor?: string;
}

export interface CredencialesLogin {
  email: string;
  password: string;
}

export interface DatosRegistroUsuario {
  email: string;
  password: string;
  displayName: string;
  departamento?: string;
}
