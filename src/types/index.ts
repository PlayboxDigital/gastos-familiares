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
  tipo?: string;
  concepto?: string;
  estado_pago: PaymentStatus;
  fecha_pago?: string | null;
  servicio_clave?: string;
  created_at?: string;
  dia_vencimiento?: number;
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
