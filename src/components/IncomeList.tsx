import React, { useState, useMemo } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Edit2, Trash2, Filter, TrendingUp, Users, Calendar, DollarSign, 
  ExternalLink, Github, Database, Globe, User, Code, Phone
} from 'lucide-react';
import { Income, Expense } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IncomeListProps {
  incomes: Income[];
  expenses: Expense[];
  onEdit: (income: Income) => void;
  onDelete: (id: string) => void;
  onImport: (clients: IncomeInput[]) => Promise<{ success: number; skipped: number; errors: string[] }>;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
}

import { ClientImporter } from './ClientImporter';

export const IncomeList: React.FC<IncomeListProps> = ({ 
  incomes, 
  expenses, 
  onEdit, 
  onDelete,
  onImport,
  searchTerm: externalSearchTerm,
  onSearchChange
}) => {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = onSearchChange || setInternalSearchTerm;

  const [clientFilter, setClientFilter] = useState('Todos');

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  const filteredIncomes = useMemo(() => {
    return incomes.filter(income => {
      const matchesSearch = 
        income.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (income.descripcion_servicio || income.concepto).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClient = clientFilter === 'Todos' || income.cliente === clientFilter;

      return matchesSearch && matchesClient;
    });
  }, [incomes, searchTerm, clientFilter]);

  // Bloques de datos
  const pendingIncomes = useMemo(() => 
    filteredIncomes.filter(i => i.estado_pago !== 'Pagado')
    .sort((a,b) => (a.dia_vencimiento || 10) - (b.dia_vencimiento || 10)),
  [filteredIncomes]);

  const collectedIncomes = useMemo(() => 
    filteredIncomes.filter(i => i.estado_pago === 'Pagado')
    .sort((a,b) => (b.fecha_cobro || '').localeCompare(a.fecha_cobro || '')),
  [filteredIncomes]);

  // KPIs
  const totalACobrarARS = useMemo(() => 
    incomes.filter(i => i.estado_pago !== 'Pagado')
    .reduce((sum, i) => sum + (i.monto_mensual_ars || i.monto_total || 0), 0),
  [incomes]);

  const cantClientes = incomes.length;
  const cantPendientes = incomes.filter(i => i.estado_pago !== 'Pagado').length;

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

  const TechIndicator: React.FC<{ url?: string; email?: string; icon: React.ReactNode; label: string }> = ({ url, email, icon, label }) => {
    if (!url && !email) return null;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`p-1.5 rounded-lg transition-all border ${url ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer' : 'opacity-30 border-transparent text-slate-300'}`}
              onClick={() => url && window.open(url, '_blank')}
            >
              {icon}
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-none p-3 rounded-xl shadow-xl">
            <p className="font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            {email && <p className="text-xs font-mono">{email}</p>}
            {url && <p className="text-[9px] text-blue-400 truncate max-w-[200px] mt-1">{url}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderTable = (data: Income[], title: string, icon: React.ReactNode, emptyMsg: string) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-2">
        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
          {icon}
        </div>
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">{title} ({data.length})</h3>
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5 px-6 shrink-0">Vence</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">Cliente / Contacto</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">App / Servicio</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">Monto Mensual</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">Accesos</TableHead>
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
                    <div className="flex items-center gap-1.5 font-black text-slate-900">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Día {income.dia_vencimiento || 10}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 font-bold text-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/50 shadow-sm">
                        {income.logo_url ? (
                          <img src={income.logo_url} alt={income.cliente} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-sm font-black text-slate-400">
                            {income.cliente.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5">
                          {income.cliente}
                        </span>
                        {(income.telefono_cliente || income.cliente_contacto) && (
                          <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            {income.telefono_cliente || income.cliente_contacto}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-sm text-slate-600 font-medium">
                    <div className="flex flex-col">
                      <span>{income.descripcion_servicio || income.concepto}</span>
                      {income.vscode_info && (
                        <span className="text-[9px] text-blue-500 font-bold flex items-center gap-1 mt-1">
                          <Code className="w-2.5 h-2.5" /> {income.vscode_info}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900">
                        {income.moneda === 'USD' ? `U$D ${income.monto_mensual}` : `$${(income.monto_mensual || income.monto_mensual_ars || income.monto_total || 0).toLocaleString()}`}
                      </span>
                      {income.moneda === 'USD' && (
                        <span className="text-[10px] text-slate-400 font-bold">
                          Eq: ${(income.monto_mensual_ars || income.monto_total || 0).toLocaleString()} ARS
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-1">
                      <TechIndicator icon={<Database className="w-3.5 h-3.5" />} url={income.supabase_url} email={income.supabase_email} label="Supabase" />
                      <TechIndicator icon={<Globe className="w-3.5 h-3.5" />} url={income.cloudinary_url} email={income.cloudinary_email} label="Cloudinary" />
                      <TechIndicator icon={<Github className="w-3.5 h-3.5" />} url={income.github_url} email={income.github_email} label="GitHub" />
                      <TechIndicator icon={<TrendingUp className="w-3.5 h-3.5" />} url={income.ai_studio_url} email={income.ai_studio_email} label="AI Studio" />
                      <TechIndicator icon={<Code className="w-3.5 h-3.5" />} url={income.vscode_url} email={income.vscode_email} label="VS Code" />
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusBadge(income.estado_pago)}`}>
                      {income.estado_pago}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-4 pr-6 shrink-0">
                    <div className="flex justify-end gap-1">
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
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total por Cobrar (ARS)</p>
            <p className="text-2xl font-black text-slate-900">${totalACobrarARS.toLocaleString()}</p>
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
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clientes</p>
            <p className="text-2xl font-black text-slate-900">{cantClientes}</p>
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
        <div className="flex flex-1 w-full gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente o servicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-50 border-none rounded-xl"
            />
          </div>
          <ClientImporter onImport={onImport} existingIncomes={incomes} />
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
        </div>
      </div>

      {/* Tables Section */}
      {renderTable(
        pendingIncomes, 
        "Cobranzas Pendientes", 
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
