export type Priority = 'Esencial' | 'Importante' | 'Prescindible';
export type PaymentStatus = 'Pagado' | 'Pendiente' | 'Parcial';

export type ConsumoBasePriority = 'alta' | 'media' | 'baja';
export type ConsumoBasePriorityLabel = 'Alta' | 'Media' | 'Baja';

export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  unidad_base: string;
  marca?: string;
  codigo_barras?: string;
  activo?: boolean;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}

export type ProductoInput = Omit<Producto, 'id' | 'created_at' | 'updated_at'>;

export interface ConsumoBase {
  id: string;
  producto_id: string;
  cantidad_base: number;
  duracion_meses: number;
  prioridad: ConsumoBasePriority;
  // Lugar recomendado para la compra, almacenado en consumo_base
  lugar_recomendado?: string;
  created_at?: string;
}

export type ConsumoBaseInput = Omit<ConsumoBase, 'id' | 'producto_id' | 'created_at'>;

export interface ConsumoBaseItem {
  producto_id: string;
  consumo_base_id: string;
  producto: string;
  categoria: string;
  unidad: string;
  lugarCompra: string;
  cantidadBase: number;
  duracionMeses: number;
  prioridad: ConsumoBasePriorityLabel;
}

export type ConsumoBaseFormValues = Omit<ConsumoBaseItem, 'producto_id' | 'consumo_base_id'>;

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
  monto_final_a_pagar?: number;
  saldo_a_favor_aplicado?: number;
  saldo_a_favor_generado?: number;
  descuento?: number;
  credito?: number;
  monto_neto?: number;
  cantidad_cuotas?: number;
  cuota_actual?: number;
  fecha_inicio_cuotas?: string;
  monto_cuota?: number;
  origen?: 'Vehículo';
  movimiento_origen_id?: string;
  vehiculo_id?: string;
  vehiculo_nombre?: string;
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
  logo_url?: string;
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
  precio_original?: number;
  bonificado?: boolean;
  deuda_actual?: number;
  ref_dolar?: number;

  // Compatibilidad / Otros
  cliente_contacto?: string;
  nombre_contacto?: string;
  cliente_enlace?: string;
  project_url?: string;
  link_app?: string;
  link_editor?: string;
  email_editor?: string;
  link_db?: string;
  email_db?: string;
  db_type?: string;
  server_image?: string;
  url_server_image?: string;
  correo_image?: string;
  estado?: 'activo' | 'inactivo' | 'finalizado';
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

export interface AutoTarea {
  id: string;
  auto_id: string;
  rubro: string;
  detalle: string;
  costo_estimado?: number;
  estado: 'pendiente' | 'en_progreso' | 'completada';
  urgencia?: 'baja' | 'media' | 'alta';
  prioridad?: number;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}

export type AutoInput = Omit<Auto, 'id' | 'created_at'>;
export type AutoMovimientoInput = Omit<AutoMovimiento, 'id' | 'created_at'>;
export type AutoTareaInput = Omit<AutoTarea, 'id' | 'created_at' | 'updated_at'>;

export interface IngresoPago {
  id: string;
  ingreso_id: string;
  cliente: string;
  periodo: string; // YYYY-MM
  monto: number;
  monto_pagado: number;
  fecha_pago: string;
  estado: PaymentStatus;
  observacion?: string;
  created_at?: string;
  updated_at?: string;
}

export type IngresoPagoInput = Omit<IngresoPago, 'id' | 'created_at' | 'updated_at'>;

// CLM - Contact Lead Management / Prospecting Module
export type CLMProspectoEstado = 'pendiente' | 'contactado';

export interface CLMProspecto {
  id: string;
  nombre_empresa: string;
  rubro?: string;
  telefono?: string;
  mensaje?: string;
  estado: CLMProspectoEstado;
  contactado_por?: string;
  fecha_contacto?: string;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}

export type CLMProspectoInput = Omit<CLMProspecto, 'id' | 'created_at' | 'updated_at'>;

export type CLMProspectoUpdate = Partial<CLMProspectoInput>;
