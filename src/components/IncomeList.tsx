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
}

export const IncomeList: React.FC<IncomeListProps> = ({ incomes, expenses, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('Todos');
  const [methodFilter, setMethodFilter] = useState('Todos');

  const now = new Date();

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

  const clients = useMemo(() => {
    const list = Array.from(new Set(incomes.map(i => i.cliente)));
    return ['Todos', ...list];
  }, [incomes]);

  const methods = useMemo(() => {
    const list = Array.from(new Set(incomes.map(i => i.metodo_pago)));
    return ['Todos', ...list];
  }, [incomes]);

  // KPIs filtered by current month
  const incomesThisMonth = useMemo(() => 
    incomes.filter(i => isSameMonth(parseISO(i.fecha), now)),
  [incomes]);

  const expensesThisMonth = useMemo(() => 
    expenses.filter(e => isSameMonth(parseISO(e.fecha), now)),
  [expenses]);

  const totalIncomesThisMonth = incomesThisMonth.reduce((sum, i) => sum + i.monto, 0);
  
  const uniqueClientsThisMonth = new Set(incomesThisMonth.map(i => i.cliente)).size;

  const totalExpensesThisMonth = expensesThisMonth.reduce((sum, e) => sum + e.monto, 0);

  const availableEstimated = totalIncomesThisMonth - totalExpensesThisMonth;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Ingresado (Mes)</p>
            <p className="text-2xl font-black text-slate-900">${totalIncomesThisMonth.toLocaleString()}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clientes del Mes</p>
            <p className="text-2xl font-black text-slate-900">{uniqueClientsThisMonth}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-3xl shadow-sm border flex items-center gap-4 ${
            availableEstimated >= 0 
              ? 'bg-white border-slate-100' 
              : 'bg-red-50 border-red-100'
          }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            availableEstimated >= 0 ? 'bg-purple-50 text-purple-600' : 'bg-red-100 text-red-600'
          }`}>
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${
              availableEstimated >= 0 ? 'text-slate-500' : 'text-red-500'
            }`}>
              Disponible Estimado
            </p>
            <p className={`text-2xl font-black ${
              availableEstimated >= 0 ? 'text-slate-900' : 'text-red-700'
            }`}>
              ${availableEstimated.toLocaleString()}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por cliente o concepto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-50 border-none rounded-xl"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-transparent focus-within:border-blue-200">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="bg-transparent border-none text-sm focus:outline-none text-slate-700 min-w-[120px]"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option value="Todos">Todos los clientes</option>
              {clients.filter(c => c !== 'Todos').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-transparent focus-within:border-blue-200">
            <DollarSign className="w-4 h-4 text-slate-400" />
            <select 
              className="bg-transparent border-none text-sm focus:outline-none text-slate-700 min-w-[120px]"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="Todos">Todos los métodos</option>
              {methods.filter(m => m !== 'Todos').map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5 px-6">Fecha</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">Cliente</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">Concepto</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">Método</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5">Monto</TableHead>
              <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest py-5 text-right pr-6">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredIncomes.map((income) => (
                <motion.tr
                  key={income.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="group hover:bg-slate-50/50 transition-colors border-slate-50"
                >
                  <TableCell className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">
                        {format(parseISO(income.fecha), "dd 'de' MMMM", { locale: es })}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                        {format(parseISO(income.fecha), "yyyy", { locale: es })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-sm font-bold text-slate-700">{income.cliente}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-600 font-medium">{income.concepto}</span>
                      {income.observaciones && (
                        <span className="text-xs text-slate-400 italic font-normal truncate max-w-[200px]">
                          {income.observaciones}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                      {income.metodo_pago}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-sm font-black text-emerald-600">
                      ${income.monto.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-4 pr-6">
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
                          if (confirm('¿Estás seguro de eliminar este ingreso?')) {
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

            {filteredIncomes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">
                  No se encontraron ingresos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
