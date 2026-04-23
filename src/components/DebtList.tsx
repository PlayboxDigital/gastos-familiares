import React, { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, Edit2, Trash2, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { Debt, DebtStatus } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface DebtListProps {
  debts: Debt[];
  onEdit: (debt: Debt) => void;
  onDelete: (id: string) => void;
}

export const DebtList: React.FC<DebtListProps> = ({
  debts = [],
  onEdit,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      const acreedor = d.acreedor || '';
      const concepto = d.concepto || '';
      return acreedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
             concepto.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [debts, searchTerm]);

  const totalDeuda = debts.reduce((sum, d) => sum + d.saldo_pendiente, 0);

  const getStatusColor = (status: DebtStatus) => {
    switch (status) {
      case 'pagada':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'parcial':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'pendiente':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  };

  const getStatusIcon = (status: DebtStatus) => {
    switch (status) {
      case 'pagada':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'parcial':
        return <AlertCircle className="w-3 h-3" />;
      case 'pendiente':
        return <Clock className="w-3 h-3" />;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = parseISO(dateStr);
      return format(date, 'dd MMM yyyy', { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por acreedor o concepto..."
            className="pl-9 bg-white border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Pendiente:</span>
          <span className="text-lg font-black text-rose-600">
            ${totalDeuda.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4 pl-4">Acreedor / Concepto</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4">Fecha</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4">Estado</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right py-4">Monto Total</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right py-4">Pagado</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right py-4">Saldo</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right py-4 pr-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {filteredDebts.map((d) => (
                <motion.tr
                  key={d.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <TableCell className="py-4 pl-4">
                    <div className="font-bold text-slate-900 text-[14px] leading-tight">
                      {d.acreedor}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 capitalize">
                      {d.concepto}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-[11px] text-slate-500 font-medium py-4">
                    {formatDate(d.fecha)}
                  </TableCell>

                  <TableCell className="py-4">
                    <Badge className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit border ${getStatusColor(d.estado)}`}>
                      {getStatusIcon(d.estado)}
                      {d.estado}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right font-bold text-slate-900 text-sm py-4">
                    ${d.monto_total.toLocaleString()}
                  </TableCell>

                  <TableCell className="text-right font-semibold text-emerald-600 text-sm py-4">
                    ${d.monto_pagado.toLocaleString()}
                  </TableCell>

                  <TableCell className="text-right font-black text-rose-600 text-sm py-4">
                    ${d.saldo_pendiente.toLocaleString()}
                  </TableCell>

                  <TableCell className="text-right py-4 pr-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg"
                        onClick={() => onEdit(d)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("DEUDA ITEM:", d);
                          
                          const idToDelete = d.id;
                          if (!idToDelete || idToDelete.length < 30) {
                            console.error("ID inválido:", idToDelete);
                            return;
                          }

                          if (confirm('¿Estás seguro de eliminar esta deuda?')) {
                            onDelete(idToDelete);
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

            {filteredDebts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-400 text-sm">
                  No se encontraron deudas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
