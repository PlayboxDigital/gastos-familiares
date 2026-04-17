import { CategoryConfig, Priority, Expense } from './types';

export const CATEGORIES: CategoryConfig[] = [
  { categoria: 'Servicios', limite_mensual: 2000000, color: '#3b82f6' },
  { categoria: 'Suscripciones', limite_mensual: 50000, color: '#8b5cf6' },
  { categoria: 'Hogar', limite_mensual: 500000, color: '#10b981' },
  { categoria: 'Mascotas', limite_mensual: 50000, color: '#f59e0b' },
  { categoria: 'Transporte', limite_mensual: 100000, color: '#06b6d4' },
  { categoria: 'Seguros', limite_mensual: 300000, color: '#ef4444' },
  { categoria: 'Cuidado personal', limite_mensual: 200000, color: '#ec4899' },
  { categoria: 'Gastos varios', limite_mensual: 600000, color: '#64748b' },
];

export const PRIORITIES: Priority[] = ['Esencial', 'Importante', 'Prescindible'];

export const RESPONSIBLES = ['Brisa', 'Emiliano', 'Maca', 'Thomas'];

export const PAYMENT_METHODS = [
  'Transferencia Bancaria',
  'Mercado Pago',
  'Efectivo',
  'Tarjeta de Débito',
  'Tarjeta de Crédito',
  'Billetera Virtual',
  'Otro'
];

export const DB_PAYMENT_METHOD_MAP: Record<string, string> = {
  'Transferencia Bancaria': 'Transferencia',
  'Mercado Pago': 'Mercado Pago',
  'Efectivo': 'Efectivo',
  'Tarjeta de Débito': 'Tarjeta',
  'Tarjeta de Crédito': 'Tarjeta',
  'Billetera Virtual': 'Mercado Pago',
  'Otro': 'Otro'
};

export const INITIAL_EXPENSES: Expense[] = [
  { id: '11111111-1111-1111-1111-111111111101', fecha: '2026-04-01', monto: 300000, categoria: 'Servicios', subcategoria: 'Luz', responsable: 'Brisa', prioridad: 'Esencial', tipo: 'Variable', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111102', fecha: '2026-04-01', monto: 225000, categoria: 'Servicios', subcategoria: 'Gas', responsable: 'Brisa', prioridad: 'Esencial', tipo: 'Variable', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111103', fecha: '2026-04-01', monto: 25000, categoria: 'Servicios', subcategoria: 'Agua', responsable: 'Brisa', prioridad: 'Esencial', tipo: 'Fijo', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111104', fecha: '2026-04-01', monto: 30000, categoria: 'Servicios', subcategoria: 'Internet', responsable: 'Brisa', prioridad: 'Esencial', tipo: 'Fijo', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111105', fecha: '2026-04-01', monto: 32000, categoria: 'Servicios', subcategoria: 'Telefonía celular', responsable: 'Brisa', prioridad: 'Esencial', tipo: 'Fijo', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111106', fecha: '2026-04-01', monto: 1100000, categoria: 'Servicios', subcategoria: 'Alquiler', responsable: 'Emiliano', prioridad: 'Esencial', tipo: 'Fijo', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111107', fecha: '2026-04-02', monto: 14000, categoria: 'Hogar', subcategoria: 'Limpieza del hogar', responsable: 'Maca', prioridad: 'Prescindible', tipo: 'Fijo', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111108', fecha: '2026-04-02', monto: 200000, categoria: 'Hogar', subcategoria: 'Supermercado', responsable: 'Emiliano', prioridad: 'Importante', tipo: 'Variable', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111109', fecha: '2026-04-03', monto: 100000, categoria: 'Hogar', subcategoria: 'Carnicería / verdulería', responsable: 'Emiliano', prioridad: 'Importante', tipo: 'Variable', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111110', fecha: '2026-04-04', monto: 11000, categoria: 'Mascotas', subcategoria: 'Comida perros', responsable: 'Maca', prioridad: 'Importante', tipo: 'Fijo', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111111', fecha: '2026-04-04', monto: 11600, categoria: 'Mascotas', subcategoria: 'Comida gatos', responsable: 'Maca', prioridad: 'Importante', tipo: 'Fijo', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111112', fecha: '2026-04-05', monto: 50000, categoria: 'Transporte', subcategoria: 'Sube', responsable: 'Maca', prioridad: 'Prescindible', tipo: 'Fijo', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111113', fecha: '2026-04-06', monto: 87000, categoria: 'Seguros', subcategoria: 'Seguro Peugeot', responsable: 'Brisa', prioridad: 'Esencial', tipo: 'Fijo', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111114', fecha: '2026-04-06', monto: 97000, categoria: 'Seguros', subcategoria: 'Seguro Toyota', responsable: 'Brisa', prioridad: 'Esencial', tipo: 'Fijo', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111115', fecha: '2026-04-07', monto: 40000, categoria: 'Cuidado personal', subcategoria: 'Barbería', responsable: 'Emiliano', prioridad: 'Prescindible', tipo: 'Variable', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111116', fecha: '2026-04-07', monto: 50000, categoria: 'Cuidado personal', subcategoria: 'Peluquería', responsable: 'Maca', prioridad: 'Prescindible', tipo: 'Variable', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111117', fecha: '2026-04-08', monto: 135000, categoria: 'Gastos varios', subcategoria: 'Janos cena Thomas', responsable: 'Emiliano', prioridad: 'Esencial', tipo: 'Fijo', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111118', fecha: '2026-04-09', monto: 290000, categoria: 'Gastos varios', subcategoria: 'Baxter Mateo', responsable: 'Emiliano', prioridad: 'Esencial', tipo: 'Variable', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111119', fecha: '2026-04-10', monto: 50000, categoria: 'Gastos varios', subcategoria: 'Cuota de embarque', responsable: 'Thomas', prioridad: 'Prescindible', tipo: 'Fijo', estado_pago: 'Pendiente' },
  { id: '11111111-1111-1111-1111-111111111120', fecha: '2026-04-11', monto: 35000, categoria: 'Gastos varios', subcategoria: 'Seguro de ropa', responsable: 'Thomas', prioridad: 'Prescindible', tipo: 'Variable', estado_pago: 'Pendiente' },
];
