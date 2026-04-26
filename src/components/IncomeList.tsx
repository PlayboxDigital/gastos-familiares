import React, { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Edit2, Trash2, TrendingUp, Users, Calendar, DollarSign,
  Github, Database, Globe, Code, Phone,
} from 'lucide-react';
import { Income, Expense, IngresoPago } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { cleanPhoneNumber, generateWhatsAppLink } from '../utils/phoneUtils';

interface IncomeListProps {
  incomes: Income[];
  expenses: Expense[];
  incomePayments?: IngresoPago[];
  onEdit: (income: Income) => void;
  onDetail: (income: Income) => void;
  onDelete: (id: string) => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  paymentStatusFilter?: 'all' | 'debtors' | 'paid';
  onPaymentStatusFilterChange?: (val: 'all' | 'debtors' | 'paid') => void;
}

const isClientInactive = (income: Income) => {
  return String(income.estado || '').toLowerCase() === 'inactivo';
};

const getClientPaymentStatus = (income: Income, payments: IngresoPago[]) => {
  const currentPeriod = format(new Date(), 'yyyy-MM');
  const payment = (payments || []).find(p => 
    p.ingreso_id === income.id && 
    p.periodo === currentPeriod
  );

  if (payment?.estado === 'Pagado') return 'Pagado';
  if (payment?.estado === 'Parcial') return 'Parcial';
  
  const today = new Date().getDate();
  if (today >= 15) return 'Vencido';
  
  return 'Pendiente';
};

const isClientPaid = (income: Income, payments: IngresoPago[]) => {
  return getClientPaymentStatus(income, payments) === 'Pagado';
};

const getMonthlyAmount = (income: Income) => {
  return income.monto_mensual || income.monto_mensual_ars || income.monto_total || 0;
};

const getAmountLabel = (income: Income) => {
  if (income.moneda === 'USD') {
    return `U$D ${income.monto_mensual || 0}`;
  }

  return `$${getMonthlyAmount(income).toLocaleString()}`;
};

export const IncomeList: React.FC<IncomeListProps> = ({
  incomes,
  expenses,
  incomePayments = [],
  onEdit,
  onDetail,
  onDelete,
  searchTerm: externalSearchTerm,
  onSearchChange,
  paymentStatusFilter: externalPaymentStatusFilter,
  onPaymentStatusFilterChange,
}) => {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [internalPaymentStatusFilter, setInternalPaymentStatusFilter] = useState<'all' | 'debtors' | 'paid'>('all');
  const [clientFilter, setClientFilter] = useState('Todos');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = onSearchChange || setInternalSearchTerm;
  
  const paymentStatusFilter = externalPaymentStatusFilter !== undefined ? externalPaymentStatusFilter : internalPaymentStatusFilter;
  const setPaymentStatusFilter = onPaymentStatusFilterChange || setInternalPaymentStatusFilter;

  const filteredIncomes = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    return incomes.filter((income) => {
      const cliente = income.cliente || '';
      const servicio = income.descripcion_servicio || income.concepto || '';

      const matchesSearch =
        cliente.toLowerCase().includes(normalizedSearch) ||
        servicio.toLowerCase().includes(normalizedSearch);

      const matchesClient = clientFilter === 'Todos' || cliente === clientFilter;

      return matchesSearch && matchesClient;
    });
  }, [incomes, searchTerm, clientFilter]);

  const sortByClientStatus = (a: Income, b: Income) => {
    const aInactive = isClientInactive(a);
    const bInactive = isClientInactive(b);

    if (aInactive !== bInactive) return aInactive ? 1 : -1;

    const aPaid = isClientPaid(a, incomePayments);
    const bPaid = isClientPaid(b, incomePayments);

    if (aPaid !== bPaid) return aPaid ? 1 : -1;

    return (a.cliente || '').localeCompare(b.cliente || '');
  };

  const pendingIncomes = useMemo(() => {
    return filteredIncomes
      .filter((income) => !isClientPaid(income, incomePayments) && !isClientInactive(income))
      .sort((a, b) => (a.cliente || '').localeCompare(b.cliente || ''));
  }, [filteredIncomes, incomePayments]);

  const collectedIncomes = useMemo(() => {
    return filteredIncomes
      .filter((income) => isClientPaid(income, incomePayments) && !isClientInactive(income))
      .sort((a, b) => (b.fecha_cobro || '').localeCompare(a.fecha_cobro || ''));
  }, [filteredIncomes, incomePayments]);

  const inactiveIncomes = useMemo(() => {
    return filteredIncomes
      .filter((income) => isClientInactive(income))
      .sort((a, b) => (a.cliente || '').localeCompare(b.cliente || ''));
  }, [filteredIncomes]);

  const totalACobrarARS = useMemo(() => {
    return incomes
      .filter((income) => !isClientPaid(income, incomePayments) && !isClientInactive(income))
      .reduce((sum, income) => sum + (income.monto_mensual_ars || income.monto_total || 0), 0);
  }, [incomes, incomePayments]);

  const cantClientes = useMemo(() => {
    return incomes.filter((income) => !isClientInactive(income)).length;
  }, [incomes]);

  const cantPendientes = useMemo(() => {
    return incomes.filter((income) => !isClientPaid(income, incomePayments) && !isClientInactive(income)).length;
  }, [incomes, incomePayments]);

  const totalCobradoMes = useMemo(() => {
    const currentPeriod = format(new Date(), 'yyyy-MM');
    return (incomePayments || [])
      .filter(p => p.periodo === currentPeriod)
      .reduce((sum, p) => sum + (p.monto_pagado || 0), 0);
  }, [incomePayments]);

  const getStatusBadge = (income: Income) => {
    if (isClientInactive(income)) return 'bg-slate-100 text-slate-500';
    const status = getClientPaymentStatus(income, incomePayments);

    if (status === 'Pagado') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Parcial') return 'bg-amber-100 text-amber-700';
    if (status === 'Vencido') return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-blue-700';
  };

  const getStatusLabel = (income: Income) => {
    if (isClientInactive(income)) return 'Inactivo';
    return getClientPaymentStatus(income, incomePayments);
  };

  const handleWhatsApp = (income: Income) => {
    if (!income.telefono_cliente) {
      alert('Este cliente no tiene un teléfono registrado.');
      return;
    }

    const monto = getAmountLabel(income);
    const mensaje = `Hola ${income.cliente}, ¿cómo estás? Te recuerdo que el pago mensual del servicio está próximo a vencer. El importe es de ${monto}.`;
    const encoded = encodeURIComponent(mensaje);
    const phone = income.telefono_cliente.replace(/\D/g, '');

    if (!phone) {
      alert('El teléfono del cliente no es válido.');
      return;
    }

    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const clients = useMemo(() => {
    const list = Array.from(new Set(incomes.map((income) => income.cliente).filter(Boolean)));
    return ['Todos', ...list];
  }, [incomes]);

  const TechIndicator: React.FC<{
    url?: string;
    email?: string;
    icon: React.ReactNode;
    label: string;
  }> = ({ url, email, icon, label }) => {
    if (!url && !email) return null;

    return (
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={`p-1.5 rounded-lg transition-all border ${
            url
              ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer'
              : 'opacity-30 border-transparent text-slate-300'
          }`}
          onClick={(event) => {
            event.stopPropagation();
            if (url) window.open(url, '_blank');
          }}
        >
          {icon}
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-none p-3 rounded-xl shadow-xl">
          <p className="font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-1">{label}</p>
          {email && <p className="text-xs font-mono">{email}</p>}
          {url && <p className="text-[9px] text-blue-400 truncate max-w-[200px] mt-1">{url}</p>}
        </TooltipContent>
      </Tooltip>
    );
  };

  const getServiceLabel = (income: Income) => {
    const servicio = (income.descripcion_servicio || income.concepto || '').toLowerCase();
    const appLink = (income.link_app || income.project_url || '').toLowerCase();

    if (servicio.includes('appsheet') || appLink.includes('appsheet.com')) return 'AppSheet';
    if (servicio.includes('ia') || servicio.includes('ai')) return 'App IA';
    if (servicio.includes('asesor')) return 'Asesoría';

    return 'Servicio';
  };

  const getDbLabel = (income: Income) => {
    const dbType = String(income.db_type || '').toLowerCase();
    const dbLink = (income.link_db || income.supabase_url || '').toLowerCase();
    const appLink = (income.link_app || income.project_url || '').toLowerCase();

    if (dbType === 'google_sheets' || dbLink.includes('docs.google.com')) return 'Google Sheets';
    if (dbType === 'supabase' || dbLink.includes('supabase.com')) return 'Supabase';
    if (dbType === 'appsheet' || appLink.includes('appsheet.com')) return 'AppSheet';

    return 'Sin sistema';
  };

  const renderCardList = (data: Income[], title: string, icon: React.ReactNode, emptyMsg: string) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-2">
        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
          {icon}
        </div>
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">
          {title} ({data.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {data.length > 0 ? (
          data.map((income) => (
            <motion.div
              key={income.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 active:scale-[0.98] transition-all relative ${
                isClientInactive(income) ? 'opacity-45 grayscale' : ''
              }`}
              onClick={() => onDetail(income)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 overflow-hidden flex-1">
                  <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 shadow-inner">
                    {income.logo_url ? (
                      <img
                        src={income.logo_url}
                        alt={income.cliente}
                        className="w-full h-full object-contain p-2"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-sm font-black text-slate-300">
                        {(income.cliente || '').substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col truncate">
                    <span className="text-2xl font-black text-slate-900 truncate leading-tight">
                      {income.cliente}
                    </span>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wide truncate">
                      {income.descripcion_servicio || income.concepto}
                    </span>
                  </div>
                </div>

                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusBadge(income)}`}>
                  {getStatusLabel(income)}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Monto mensual
                  </span>
                  <span className="text-md font-black text-slate-900">
                    {getAmountLabel(income)}
                  </span>
                </div>

                <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-10 w-10 rounded-2xl ${isClientInactive(income) ? 'bg-slate-100 text-slate-400 hover:bg-slate-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                    onClick={() => handleWhatsApp(income)}
                  >
                    <Phone className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                    {getServiceLabel(income)}
                  </span>
                </div>

                <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-10 w-10 rounded-2xl ${isClientInactive(income) ? 'text-slate-300 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-100'}`}
                    onClick={() => onEdit(income)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-2xl text-slate-300 hover:text-red-600 hover:bg-red-50"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIdToDelete(income.id);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-12 bg-white rounded-[2rem] border border-dashed border-slate-200 text-center text-slate-400 text-sm">
            {emptyMsg}
          </div>
        )}
      </div>
    </div>
  );

  const renderTable = (data: Income[], title: string, icon: React.ReactNode, emptyMsg: string) => (
    <div className="hidden md:block space-y-4">
      <div className="flex items-center gap-2 px-2">
        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
          {icon}
        </div>
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">
          {title} ({data.length})
        </h3>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <Table className="w-full table-fixed">
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-4 px-5 w-[28%]">
                Cliente
              </TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-4 w-[22%]">
                Servicio / Tipo
              </TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-4 w-[160px]">
                Monto
              </TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-4 w-[190px]">
                Accesos
              </TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-4 w-[130px]">
                Estado
              </TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-4 text-right pr-5 w-[150px]">
                Gestión
              </TableHead>
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
                  className={`group hover:bg-slate-50/50 transition-colors border-slate-50 cursor-pointer ${
                    isClientInactive(income) ? 'opacity-40 grayscale' : ''
                  }`}
                  onClick={() => onDetail(income)}
                >
                  <TableCell className="py-4 px-5">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 shadow-sm">
                        {income.logo_url ? (
                          <img
                            src={income.logo_url}
                            alt={income.cliente}
                            className="w-full h-full object-contain p-2"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[10px] font-black text-slate-300">
                            {(income.cliente || '').substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col truncate">
                        <span className="truncate block font-black text-slate-900 text-xl" title={income.cliente}>
                          {income.cliente}
                        </span>
                        {isClientInactive(income) && (
                          <span className="text-[8px] font-black text-slate-400 uppercase">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-4 font-medium truncate overflow-hidden">
                    <div className="flex flex-col truncate">
                      <span
                        className="truncate block text-slate-700 font-bold"
                        title={income.descripcion_servicio || income.concepto}
                      >
                        {income.descripcion_servicio || income.concepto}
                      </span>

                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">
                          {getServiceLabel(income)}
                        </span>

                        {income.vscode_info ? (
                          <span className="text-[9px] text-blue-500 font-black flex items-center gap-1.5 uppercase tracking-tighter">
                            <Code className="w-3 h-3 shrink-0" /> VSCode
                          </span>
                        ) : income.ai_studio_url ? (
                          <span className="text-[9px] text-orange-500 font-black flex items-center gap-1.5 uppercase tracking-tighter">
                            <TrendingUp className="w-3 h-3 shrink-0" /> AI Studio
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-lg">
                        {getAmountLabel(income)}
                      </span>

                      {income.moneda === 'USD' && (
                        <span className="text-[10px] text-slate-400 font-bold">
                          Eq: ${(income.monto_mensual_ars || income.monto_total || 0).toLocaleString()} ARS
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <div className="flex items-center gap-1.5">
                      <TechIndicator
                        icon={<Database className="w-4 h-4" />}
                        url={income.link_db || income.supabase_url}
                        email={income.email_db || income.supabase_email}
                        label={getDbLabel(income)}
                      />

                      {income.telefono_cliente && (
                        <TechIndicator
                          icon={<Phone className="w-4 h-4" />}
                          url={`https://wa.me/${income.telefono_cliente.replace(/\D/g, '')}`}
                          label="WhatsApp"
                        />
                      )}

                      <TechIndicator
                        icon={<Github className="w-4 h-4" />}
                        url={income.github_url}
                        email={income.github_email}
                        label="GitHub"
                      />

                      <TechIndicator
                        icon={<Globe className="w-4 h-4" />}
                        url={income.link_app || income.project_url}
                        label="Producción"
                      />
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusBadge(income)}`}>
                      {getStatusLabel(income)}
                    </span>
                  </TableCell>

                  <TableCell className="text-right py-4 pr-5 shrink-0">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-xl ${isClientInactive(income) ? 'bg-slate-100 text-slate-400 hover:bg-slate-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleWhatsApp(income);
                        }}
                      >
                        <Phone className="w-5 h-5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-xl ${isClientInactive(income) ? 'text-slate-300 hover:bg-slate-100' : 'text-slate-300 hover:text-blue-600 hover:bg-blue-50'}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(income);
                        }}
                      >
                        <Edit2 className="w-5 h-5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIdToDelete(income.id);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>

            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic text-sm">
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
    <TooltipProvider>
      <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <DollarSign className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Por Cobrar
            </p>
            <p className="text-lg md:text-2xl font-black text-slate-900 leading-none mt-1">
              ${totalACobrarARS.toLocaleString()}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Cobrado
            </p>
            <p className="text-lg md:text-2xl font-black text-slate-900 leading-none mt-1">
              ${totalCobradoMes.toLocaleString()}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
            <Users className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Clientes
            </p>
            <p className="text-lg md:text-2xl font-black text-slate-900 leading-none mt-1">
              {cantClientes}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
            <Calendar className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Pendientes
            </p>
            <p className="text-lg md:text-2xl font-black text-slate-900 leading-none mt-1">
              {cantPendientes}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex flex-1 w-full gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente o servicio..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10 bg-slate-50 border-none rounded-xl"
            />
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            className="bg-slate-50 border-none text-sm px-3 py-2 rounded-xl focus:outline-none text-slate-700 min-w-[140px]"
            value={paymentStatusFilter}
            onChange={(event) => setPaymentStatusFilter(event.target.value as any)}
          >
            <option value="all">Estado: Todos</option>
            <option value="debtors">Estado: Deudores</option>
            <option value="paid">Estado: Al día</option>
          </select>

          <select
            className="bg-slate-50 border-none text-sm px-3 py-2 rounded-xl focus:outline-none text-slate-700 min-w-[140px]"
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
          >
            <option value="Todos">Todos los clientes</option>
            {clients.filter((client) => client !== 'Todos').map((client) => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="md:hidden space-y-8">
        {(paymentStatusFilter === 'all' || paymentStatusFilter === 'debtors') && renderCardList(
          pendingIncomes,
          'Cobranzas pendientes',
          <Calendar className="w-4 h-4" />,
          'No hay cobros pendientes',
        )}

        {(paymentStatusFilter === 'all' || paymentStatusFilter === 'paid') && renderCardList(
          collectedIncomes,
          'Historial de cobros',
          <TrendingUp className="w-4 h-4" />,
          'No se registran cobros finalizados',
        )}

        {paymentStatusFilter === 'all' && inactiveIncomes.length > 0 && renderCardList(
          inactiveIncomes,
          'Clientes inactivos',
          <Users className="w-4 h-4 opacity-50" />,
          'No hay clientes inactivos',
        )}
      </div>

      <div className="hidden md:block space-y-8">
        {(paymentStatusFilter === 'all' || paymentStatusFilter === 'debtors') && renderTable(
          pendingIncomes,
          'Cobranzas pendientes',
          <Calendar className="w-4 h-4" />,
          'No hay cobros pendientes registrados',
        )}

        {(paymentStatusFilter === 'all' || paymentStatusFilter === 'paid') && renderTable(
          collectedIncomes,
          'Historial de cobros',
          <TrendingUp className="w-4 h-4" />,
          'No se registran cobros finalizados aún',
        )}

        {paymentStatusFilter === 'all' && inactiveIncomes.length > 0 && renderTable(
          inactiveIncomes,
          'Clientes inactivos',
          <Users className="w-4 h-4 opacity-50" />,
          'No hay clientes inactivos',
        )}
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm rounded-[2rem] z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Eliminar Cliente</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium text-slate-600">¿Estás seguro de que querés eliminar este registro? Esta acción es permanente.</p>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              className="rounded-xl font-bold border-slate-200"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-red-100"
              onClick={() => {
                if (idToDelete) {
                  onDelete(idToDelete);
                }
                setShowDeleteConfirm(false);
                setIdToDelete(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
};
