export type Priority = 'Esencial' | 'Importante' | 'Prescindible';
export type PaymentStatus = 'Pagado' | 'Pendiente' | 'Parcial';

export interface Expense {
  id: string;
  fecha: string;
  monto: number;
  total_abonado?: number; // Calculado por la base (trigger)
  categoria: string;
  subcategoria: string;
  responsable: string;
  prioridad: Priority;
  tipo_gasto?: 'fijo' | 'variable'; // Prompt 087
  tipo?: string; 
  concepto?: string;
  estado_pago: PaymentStatus;
  fecha_pago?: string | null;
  servicio_clave?: string;
  created_at?: string;
  dia_vencimiento?: number;
  archived?: boolean;
}

export interface GastoPagoHistorial {
  id: string;
  gasto_id: string;
  servicio_clave: string;
  periodo_anio: number;
  periodo_mes: number;
  fecha_pago: string;
  fecha_registro: string;
  monto_pagado: number;
  moneda: string;
  forma_pago: string;
  entidad_pago?: string;
  referencia_pago?: string;
  titular_medio_pago?: string;
  cuotas?: number;
  observaciones?: string;
  // Cloudinary metadata
  comprobante_nombre_original?: string;
  comprobante_cloudinary_public_id?: string;
  comprobante_cloudinary_url?: string;
  comprobante_cloudinary_secure_url?: string;
  comprobante_cloudinary_resource_type?: string;
  comprobante_cloudinary_format?: string;
  comprobante_cloudinary_bytes?: number;
  comprobante_cloudinary_width?: number;
  comprobante_cloudinary_height?: number;
  comprobante_transformado_url?: string;
  comprobante_hash?: string;
  // Snapshot data
  gasto_concepto_snapshot?: string;
  categoria_snapshot?: string;
  subcategoria_snapshot?: string;
  responsable_snapshot?: string;
  prioridad_snapshot?: string;
  tipo_snapshot?: string;
  created_at?: string;
}

export type GastoPagoHistorialInput = Omit<GastoPagoHistorial, 'id' | 'created_at' | 'fecha_registro'>;

export type ExpenseInput = Omit<Expense, 'id' | 'created_at'>;

export interface CategoryConfig {
  id?: string;
  categoria: string;
  limite_mensual?: number;
  color: string;
  created_at?: string;
}

export type CategoryInput = Omit<CategoryConfig, 'id' | 'created_at'>;

export interface AppState {
  expenses: Expense[];
  categories: CategoryConfig[];
  responsibles: string[];
}

export type DebtStatus = 'pendiente' | 'parcial' | 'pagada';

export interface Debt {
  id: string;
  acreedor: string;
  concepto: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  fecha: string;
  estado: DebtStatus;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}

export type DebtInput = Omit<Debt, 'id' | 'created_at' | 'updated_at' | 'saldo_pendiente'>;

export interface Income {
  id: string;
  cliente: string;
  telefono_cliente?: string;
  descripcion_servicio?: string;
  
  // Accesos
  supabase_url?: string;
  supabase_email?: string;
  cloudinary_url?: string;
  cloudinary_email?: string;
  github_url?: string;
  github_email?: string;
  ai_studio_url?: string;
  ai_studio_email?: string;
  vscode_url?: string;
  vscode_email?: string;
  vscode_info?: string;

  // Finanzas
  monto_mensual?: number;
  moneda?: 'ARS' | 'USD';
  monto_mensual_ars?: number;
  dia_vencimiento?: number;

  // Compatibilidad / Otros
  cliente_contacto?: string;
  cliente_enlace?: string;
  concepto: string;
  monto_total: number;
  monto_cobrado: number;
  fecha_vencimiento: string;
  fecha_cobro?: string;
  estado_pago: PaymentStatus;
  metodo_pago: string;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
  fecha?: string;
  monto?: number;
}

export type IncomeInput = Omit<Income, 'id' | 'created_at' | 'updated_at'>;

export interface Auto {
  id: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  patente?: string;
  observaciones?: string;
  created_at?: string;
}

export interface AutoMovimiento {
  id: string;
  auto_id: string;
  fecha: string;
  concepto: string;
  categoria: string;
  monto: number;
  observaciones?: string;
  created_at?: string;
}

export type AutoInput = Omit<Auto, 'id' | 'created_at'>;
export type AutoMovimientoInput = Omit<AutoMovimiento, 'id' | 'created_at'>;
