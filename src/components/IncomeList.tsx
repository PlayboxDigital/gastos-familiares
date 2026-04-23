import React, { useState, useMemo } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Edit2, Trash2, Filter, TrendingUp, Users, Calendar, DollarSign 
} from 'lucide-react';
import { Income, Expense } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface IncomeListProps {
  incomes: Income[];
  expenses: Expense[];
  onEdit: (income: Income) => void;
  onDelete: (id: string) => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
}

export const IncomeList: React.FC<IncomeListProps> = ({ 
  incomes, 
  expenses, 
  onEdit, 
  onDelete,
  searchTerm: externalSearchTerm,
  onSearchChange
}) => {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = onSearchChange || setInternalSearchTerm;

  const [clientFilter, setClientFilter] = useState('Todos');
  const [methodFilter, setMethodFilter] = useState('Todos');

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  const filteredIncomes = useMemo(() => {
    return incomes.filter(income => {
      const matchesSearch = 
        income.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        income.concepto.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClient = clientFilter === 'Todos' || income.cliente === clientFilter;
      const matchesMethod = methodFilter === 'Todos' || income.metodo_pago === methodFilter;

      return matchesSearch && matchesClient && matchesMethod;
    });
  }, [incomes, searchTerm, clientFilter, methodFilter]);

  // Bloques de datos
  const pendingIncomes = useMemo(() => 
    filteredIncomes.filter(i => i.estado_pago !== 'Pagado')
    .sort((a,b) => (a.fecha_vencimiento || '').localeCompare(b.fecha_vencimiento || '')),
  [filteredIncomes]);

  const collectedIncomes = useMemo(() => 
    filteredIncomes.filter(i => i.estado_pago === 'Pagado')
    .sort((a,b) => (b.fecha_cobro || '').localeCompare(a.fecha_cobro || '') || (b.fecha_vencimiento || '').localeCompare(a.fecha_vencimiento || '')),
  [filteredIncomes]);

  // KPIs
  const totalACobrar = useMemo(() => 
    incomes.filter(i => i.estado_pago !== 'Pagado')
    .reduce((sum, i) => sum + (i.monto_total - i.monto_cobrado), 0),
  [incomes]);

  const totalCobradoHistorico = useMemo(() => 
    incomes.reduce((sum, i) => sum + i.monto_cobrado, 0),
  [incomes]);

  const cantPendientes = incomes.filter(i => i.estado_pago !== 'Pagado').length;

  const getAlertStyle = (fechaVenc: string) => {
    if (!fechaVenc) return 'text-slate-400';
    if (fechaVenc < todayStr) return 'text-red-600 font-bold';
    if (fechaVenc === todayStr) return 'text-amber-600 font-bold';
    
    const vencDate = parseISO(fechaVenc);
    const diffDays = Math.ceil((vencDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return 'text-blue-600 font-medium';
    return 'text-slate-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pagado': return 'bg-emerald-100 text-emerald-700';
      case 'Parcial': return 'bg-amber-100 text-amber-700';
      default: return 'bg-red-100 text-red-700';
    }
  };

  const clients = useMemo(() => {
    const list = Array.from(new Set(incomes.map(i => i.cliente)));
    return ['Todos', ...list];
  }, [incomes]);

  const methods = useMemo(() => {
    const list = Array.from(new Set(incomes.map(i => i.metodo_pago)));
    return ['Todos', ...list];
  }, [incomes]);

  const renderTable = (data: Income[], title: string, icon: React.ReactNode, emptyMsg: string) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-2">
        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
          {icon}
        </div>
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">{title} ({data.length})</h3>
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5 px-6">Vencimiento</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">Cliente / Contacto</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">Concepto</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">Monto Total</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">Cobrado</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">Estado</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5 text-right pr-6">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {data.map((income) => (
                <motion.tr
                   key={income.id}
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="group hover:bg-slate-50/50 transition-colors border-slate-50"
                >
                  <TableCell className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className={`text-sm ${getAlertStyle(income.fecha_vencimiento || '')}`}>
                        {income.fecha_vencimiento ? format(parseISO(income.fecha_vencimiento), "dd 'de' MMM", { locale: es }) : 'S/V'}
                      </span>
                      {income.fecha_cobro && (
                        <span className="text-[9px] text-emerald-500 font-bold uppercase">
                          Cobrado: {format(parseISO(income.fecha_cobro), 'dd/MM')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 font-bold text-slate-700">
                    <div className="flex flex-col">
                      <span>{income.cliente}</span>
                      {income.cliente_contacto && (
                        <span className="text-[10px] text-slate-400 font-normal">{income.cliente_contacto}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-sm text-slate-600 font-medium">
                    {income.concepto}
                  </TableCell>
                  <TableCell className="py-4 font-black text-slate-900">
                    ${income.monto_total.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-4 font-bold text-emerald-600">
                    ${income.monto_cobrado.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusBadge(income.estado_pago)}`}>
                      {income.estado_pago}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-4 pr-6">
                    <div className="flex justify-end gap-1">
                      {income.cliente_enlace && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-300 hover:text-purple-600 hover:bg-purple-50 transition-all rounded-lg"
                          onClick={() => window.open(income.cliente_enlace, '_blank')}
                        >
                          <Users className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg"
                        onClick={() => onEdit(income)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('¿Estás seguro de eliminar este registro?')) {
                            onDelete(income.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-400 italic text-sm">
                  {emptyMsg}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total a Cobrar</p>
            <p className="text-2xl font-black text-slate-900">${totalACobrar.toLocaleString()}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cobrado (Hist.)</p>
            <p className="text-2xl font-black text-slate-900">${totalCobradoHistorico.toLocaleString()}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pendientes de Cobro</p>
            <p className="text-2xl font-black text-slate-900">{cantPendientes} clientes</p>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar cliente o concepto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-50 border-none rounded-xl"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            className="bg-slate-50 border-none text-sm px-3 py-2 rounded-xl focus:outline-none text-slate-700 min-w-[140px]"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="Todos">Todos los clientes</option>
            {clients.filter(c => c !== 'Todos').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select 
            className="bg-slate-50 border-none text-sm px-3 py-2 rounded-xl focus:outline-none text-slate-700 min-w-[140px]"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="Todos">Métodos Pago</option>
            {methods.filter(m => m !== 'Todos').map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tables Section */}
      {renderTable(
        pendingIncomes, 
        "Clientes por Cobrar", 
        <Calendar className="w-4 h-4" />, 
        "No hay cobros pendientes registrados"
      )}
      
      {renderTable(
        collectedIncomes, 
        "Historial de Cobros", 
        <TrendingUp className="w-4 h-4" />, 
        "No se registran cobros finalizados aún"
      )}
    </div>
  );
};
