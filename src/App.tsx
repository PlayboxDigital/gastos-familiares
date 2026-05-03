/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseForm } from './components/ExpenseForm';
import { PaymentModal } from './components/PaymentModal';
import { PaymentHistoryModal } from './components/PaymentHistoryModal';
import { PaymentHistory } from './components/PaymentHistory';
import { Settings } from './components/Settings';
import {
  Expense,
  CategoryConfig,
  PaymentStatus,
  GastoPagoHistorialInput,
  GastoPagoHistorial,
  Debt,
  DebtInput,
  Income,
  IncomeInput,
  IngresoPago,
} from './types';
import { CATEGORIES } from './constants';
import { gastosService } from './services/gastos';
import { supabase } from './lib/supabase';
import { presupuestosService } from './services/presupuestos';
import { gastosPagosHistorialService } from './services/gastosPagosHistorial';
import { deudasService } from './services/deudas';
import { incomesService } from './services/Clientes';
import { Button } from '@/components/ui/button';
import { DebtList } from './components/DebtList';
import { DebtForm } from './components/DebtForm';
import { IncomeList } from './components/IncomeList';
import { IncomeForm } from './components/IncomeForm';
import { ClientDetail } from './components/ClientDetail';
import { AutoList } from './components/AutoList';
import { CLMList } from './components/CLMList';
import { PWAInstallBanner } from './components/PWAInstallBanner';

import {
  Plus,
  LayoutDashboard,
  ListOrdered,
  Settings as SettingsIcon,
  Home,
  LogOut,
  Bell,
  Search,
  Menu,
  History as HistoryIcon,
  CreditCard,
  TrendingUp,
  Activity,
  Car,
  Trash2,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { startOfMonth, parseISO } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

type ExpenseWithCredit = Expense & {
  saldo_a_favor_aplicado?: number;
  monto_final_a_pagar?: number;
};

const getMontoExigible = (expense: ExpenseWithCredit): number => {
  if (typeof expense.monto_final_a_pagar === 'number') {
    return Math.max(0, expense.monto_final_a_pagar);
  }

  return Math.max(0, expense.monto - (expense.saldo_a_favor_aplicado ?? 0));
};

const getEstadoPagoReal = (
  expense: ExpenseWithCredit,
  totalAbonadoOverride?: number
): PaymentStatus => {
  const montoExigible = getMontoExigible(expense);
  const totalAbonado = totalAbonadoOverride ?? expense.total_abonado ?? 0;

  if (montoExigible <= 0) return 'Pagado';
  if (totalAbonado >= montoExigible) return 'Pagado';
  if (totalAbonado > 0) return 'Parcial';

  return 'Pendiente';
};

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [globalHistory, setGlobalHistory] = useState<GastoPagoHistorial[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [incomePayments, setIncomePayments] = useState<IngresoPago[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDebtFormOpen, setIsDebtFormOpen] = useState(false);
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);

  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [debtToEdit, setDebtToEdit] = useState<Debt | null>(null);
  const [incomeToEdit, setIncomeToEdit] = useState<Income | null>(null);
  const [selectedIncomeForDetail, setSelectedIncomeForDetail] = useState<Income | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [incomeSearchTerm, setIncomeSearchTerm] = useState('');
  const [incomePaymentFilter, setIncomePaymentFilter] = useState<'all' | 'debtors' | 'paid'>('all');

  // Sincronizar búsqueda cuando se cambia de pestaña manual
  useEffect(() => {
    if (activeTab !== 'incomes') {
      setIncomeSearchTerm('');
      setIncomePaymentFilter('all');
    }
  }, [activeTab]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPaymentIds, setUpdatingPaymentIds] = useState<Set<string>>(new Set());
  const [hasLegacyData, setHasLegacyData] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Estados para diálogos de confirmación (Prompt 126)
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Confirmar',
    onConfirm: () => {},
  });

  const [deleteChoiceConfig, setDeleteChoiceConfig] = useState<{
    isOpen: boolean;
    expenseId: string;
    hasDuplicate: boolean;
    duplicateName: string;
    paymentsCount: number;
    onDeleteAll: () => void;
    onMerge: () => void;
  }>({
    isOpen: false,
    expenseId: '',
    hasDuplicate: false,
    duplicateName: '',
    paymentsCount: 0,
    onDeleteAll: () => {},
    onMerge: () => {},
  });

  useEffect(() => {
    const saved = localStorage.getItem('getagasto_expenses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHasLegacyData(true);
        }
      } catch (e) {
        console.error('Error checking legacy data', e);
      }
    }
  }, []);

  // --- PWA Install Banner State ---
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  // Detect if app is installed or in standalone
  const isStandalone = () => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  };

  // Detect iOS Safari
  const isIOSSafari = () => {
    const ua = window.navigator.userAgent;
    return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|opera|edgios/i.test(ua);
  };

  useEffect(() => {
    // No banner if sessionStorage says so
    if (sessionStorage.getItem('pwa-banner-hide') === '1') return;
    // No banner if already installed
    if (isStandalone()) return;

    // iOS Safari: show manual banner
    if (isIOSSafari()) {
      setIsIOS(true);
      setShowPwaBanner(true);
      return;
    }

    // Chrome/Android: listen for beforeinstallprompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPwaBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Hide banner if installed during session
  useEffect(() => {
    const handler = () => {
      setShowPwaBanner(false);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPwaBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handlePwaClose = () => {
    setShowPwaBanner(false);
    sessionStorage.setItem('pwa-banner-hide', '1');
  };

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("APP_GASTOS_1_ANTES_FETCH")
      console.log("COMPONENTE_QUE_LLAMA_GASTOS: src/App.tsx");
      
      const [
        gastos,
        presupuestos,
        historial,
        deudas,
        ingresos,
        ingresosPagos
      ] = await Promise.all([
        gastosService.obtenerGastos(),
        presupuestosService.obtenerPresupuestos(),
        gastosPagosHistorialService.obtenerTodoElHistorial(),
        deudasService.obtenerDeudas(),
        incomesService.obtenerIngresos(),
        incomesService.obtenerTodosLosPagos(),
      ]);

      setExpenses(gastos);
      setCategories(presupuestos.length > 0 ? presupuestos : CATEGORIES);
      setGlobalHistory(historial);
      setDebts(deudas);
      setIncomes(ingresos);
      setIncomePayments(ingresosPagos);
    } catch (e: any) {
      console.error("APP_GASTOS_ERROR_EN_FETCH_O_SETSTATE:", e)
      setError(`Error al cargar datos: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleMigrateData = async () => {
    const saved = localStorage.getItem('getagasto_expenses');
    if (!saved) return;

    setIsLoading(true);
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        let migratedCount = 0;
        let duplicateCount = 0;
        const newExpenses: Expense[] = [];

        const getExpenseKey = (e: any) => {
          try {
            const fecha = e.fecha || e.date || '';
            const monto = Number(e.monto || e.amount || 0).toFixed(2);
            const cat = (e.categoria || e.category || '').trim().toLowerCase();
            const sub = (e.subcategoria || e.subcategory || '').trim().toLowerCase();
            const resp = (e.responsable || e.responsible || '').trim().toLowerCase();
            const conc = (e.concepto || e.description || '').trim().toLowerCase();
            return `${fecha}|${monto}|${cat}|${sub}|${resp}|${conc}`;
          } catch (err) {
            console.error("APP_ERROR_DERIVADO_EXPENSES_getExpenseKey:", err, e);
            return String(Math.random());
          }
        };

        const existingKeys = new Set(expenses.map(getExpenseKey));
        const processedInBatch = new Set<string>();

        for (const exp of parsed) {
          const normalized = {
            fecha: exp.fecha || exp.date || new Date().toISOString().split('T')[0],
            monto: Number(exp.monto || exp.amount || 0),
            categoria: exp.categoria || exp.category || 'Gastos varios',
            subcategoria: exp.subcategoria || exp.subcategory || '',
            responsable: exp.responsable || exp.responsible || 'Brisa',
            prioridad: exp.prioridad || exp.priority || 'Importante',
            tipo: exp.tipo || exp.type || 'Variable',
            concepto: exp.concepto || exp.description || '',
            estado_pago: exp.estado_pago || 'Pendiente' as PaymentStatus,
            fecha_pago:
              (exp.estado_pago || 'Pendiente') === 'Pendiente'
                ? null
                : (exp.fecha_pago || null),
          };

          const key = getExpenseKey(normalized);

          if (existingKeys.has(key) || processedInBatch.has(key)) {
            duplicateCount++;
            continue;
          }

          try {
            const created = await gastosService.crearGasto(normalized);
            newExpenses.push(created);
            processedInBatch.add(key);
            migratedCount++;
          } catch (err) {
            console.error('Error migrando gasto individual:', err);
            throw new Error('Fallo en inserción individual');
          }
        }

        if (migratedCount > 0 || duplicateCount > 0) {
          const nextVal = [...newExpenses, ...expenses];
          setExpenses(nextVal);
          localStorage.removeItem('getagasto_expenses');
          localStorage.removeItem('getagasto_categories');
          setHasLegacyData(false);

          let message = `Migración finalizada.`;
          if (migratedCount > 0) message += `\n- ${migratedCount} gastos nuevos migrados.`;
          if (duplicateCount > 0) message += `\n- ${duplicateCount} duplicados omitidos.`;
          alert(message);
        } else {
          alert('No se encontraron gastos nuevos para migrar.');
          localStorage.removeItem('getagasto_expenses');
          setHasLegacyData(false);
        }
      }
    } catch (error) {
      console.error('Error en la migración general:', error);
      alert('La migración se detuvo por un error. Los datos locales se conservaron para reintentar.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddExpense = async (newExpense: Omit<Expense, 'id'> & { id?: string }) => {
    console.log("APP_HANDLEADDEXPENSE_INIT:", newExpense.id || 'NEW');
    try {
      if (newExpense.id) {
        const id = newExpense.id;

        // Guard: Evitar IDs virtuales de la UI en la base de datos (Prompt 082)
        if (id.startsWith('exp-')) {
          console.error("APP_ERROR_ID_VIRTUAL_DETECTADO:", id);
          throw new Error("Estás intentando editar una proyección. Debes editar el gasto original desde la lista de gastos o historial real.");
        }

        const { id: _, ...data } = newExpense;
        
        // Limpieza de campos inexistentes en DB para evitar errores de schema (Prompt 079)
        const cleanData = { ...data };
        if ('fecha_vencimiento' in cleanData) delete (cleanData as any).fecha_vencimiento;

        // Actualizamos en Supabase y obtenemos el registro real actualizado
        console.log("ITEM_EDITADO_DIA_VENCIMIENTO:", data.dia_vencimiento);
        const updatedFromDB = await gastosService.actualizarGasto(id, cleanData);
        console.log("ITEM_GUARDADO_DIA_VENCIMIENTO:", updatedFromDB.dia_vencimiento);

        setExpenses((prev) => {
          const updated = prev.map((e) => (e.id === id ? { ...e, ...updatedFromDB } : e));
          console.log("APP_HANDLEADDEXPENSE_STATE_UPDATE_SUCCESS:", id);
          return updated;
        });
      } else {
        const createdExpense = await gastosService.crearGasto(newExpense);
        setExpenses((prev) => [createdExpense, ...prev]);
      }
    } catch (error) {
      console.error('Error al procesar gasto:', error);
    }

    // CRITICAL: Cerrar modal y limpiar estado para evitar reset visual erróneo (Prompt 082)
    setIsFormOpen(false);
    setExpenseToEdit(null);
  };

  const handleAddDebt = async (newDebt: DebtInput & { id?: string }) => {
    try {
      if (newDebt.id) {
        const { id, ...data } = newDebt;
        const updated = await deudasService.actualizarDeuda(id, data);
        setDebts((prev) => prev.map((d) => (d.id === id ? updated : d)));
      } else {
        const created = await deudasService.crearDeuda(newDebt);
        setDebts((prev) => [created, ...prev]);
      }
    } catch (error) {
      console.error('Error al procesar deuda:', error);
    }
    setDebtToEdit(null);
  };

  const handleAddIncome = async (newIncome: IncomeInput & { id?: string }) => {
    try {
      if (newIncome.id) {
        const { id, ...data } = newIncome;
        const updated = await incomesService.actualizarIngreso(id, data);
        setIncomes((prev) => prev.map((i) => (i.id === id ? updated : i)));
      } else {
        const created = await incomesService.crearIngreso(newIncome);
        setIncomes((prev) => [created, ...prev]);
      }
    } catch (error) {
      console.error('Error al procesar ingreso:', error);
    }
    setIncomeToEdit(null);
  };

  const handleDeleteDebt = async (id: string) => {
    console.log("APP_DEBTS_DELETE_START_ID:", id);
    try {
      await deudasService.eliminarDeuda(id);
      console.log("APP_DEBTS_DELETE_SUCCESS_ID:", id);
      setDebts((prev) => {
        const next = prev.filter((d) => d.id !== id);
        console.log("APP_DEBTS_NEW_STATE_COUNT:", next.length);
        return next;
      });
    } catch (error) {
      console.error('Error al eliminar deuda:', error);
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      await incomesService.eliminarIngreso(id);
      setIncomes((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error('Error al eliminar ingreso:', error);
    }
  };

  const handleEditDebt = (debt: Debt) => {
    setDebtToEdit(debt);
    setIsDebtFormOpen(true);
  };

  const handleEditIncome = (income: Income) => {
    setIncomeToEdit(income);
    setIsIncomeFormOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense);
    setIsFormOpen(true);
  };

  const handleTogglePayment = async (id: string, currentStatus: PaymentStatus) => {
    if (updatingPaymentIds.has(id)) return;

    if (currentStatus === 'Pendiente') return;

    const originalExpense = expenses.find((e) => e.id === id);
    if (!originalExpense) return;

    const updateData = {
      estado_pago: 'Pendiente' as PaymentStatus,
      total_abonado: 0,
      fecha_pago: null as string | null,
    };

    setUpdatingPaymentIds((prev) => new Set(prev).add(id));

    try {
      console.log("APP_GASTOS_SETSTATE_SECUNDARIO_HANDLETOGGLEPAYMENT_1:", updateData);
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? ({ ...e, ...updateData } as Expense) : e))
      );

      await gastosService.actualizarGasto(id, updateData as any);
    } catch (error) {
      console.error('Error al cambiar estado de pago (haciendo rollback):', error);
      console.log("APP_GASTOS_SETSTATE_SECUNDARIO_HANDLETOGGLEPAYMENT_ROLLBACK:", originalExpense);
      setExpenses((prev) => prev.map((e) => (e.id === id ? originalExpense : e)));
    } finally {
      setUpdatingPaymentIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleActionPayment = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsPaymentModalOpen(true);
  };

  const handleShowHistory = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsHistoryModalOpen(true);
  };

  const handleConfirmPayment = async (pago: GastoPagoHistorialInput) => {
    const expenseId = pago.gasto_id;
    if (updatingPaymentIds.has(expenseId)) return;

    const originalExpense = expenses.find((e) => e.id === expenseId);
    if (!originalExpense) return;

    setUpdatingPaymentIds((prev) => new Set(prev).add(expenseId));

    try {
      const currentTotalAbonado = originalExpense.total_abonado || 0;
      const newTotalAbonado = currentTotalAbonado + pago.monto_pagado;

      const expenseActualizada: ExpenseWithCredit = {
        ...(originalExpense as ExpenseWithCredit),
        total_abonado: newTotalAbonado,
        fecha_pago: pago.fecha_pago,
      };

      const newStatus = getEstadoPagoReal(expenseActualizada, newTotalAbonado);

      const updateData = {
        estado_pago: newStatus,
        total_abonado: newTotalAbonado,
        fecha_pago: pago.fecha_pago,
      };

      console.log("APP_GASTOS_SETSTATE_SECUNDARIO_HANDLECONFIRMPAYMENT_1:", updateData);
      setExpenses((prev) =>
        prev.map((e) => (e.id === expenseId ? ({ ...e, ...updateData } as Expense) : e))
      );

      await gastosPagosHistorialService.crearPagoHistorial(pago);
      await gastosService.actualizarGasto(expenseId, updateData as any);

      const updatedHistory = await gastosPagosHistorialService.obtenerTodoElHistorial();
      setGlobalHistory(updatedHistory);

      setIsPaymentModalOpen(false);
    } catch (error) {
      console.error('Error al confirmar pago:', error);
      console.log("APP_GASTOS_SETSTATE_SECUNDARIO_HANDLECONFIRMPAYMENT_ROLLBACK:", originalExpense);
      setExpenses((prev) => prev.map((e) => (e.id === expenseId ? originalExpense : e)));
      throw error;
    } finally {
      setUpdatingPaymentIds((prev) => {
        const next = new Set(prev);
        next.delete(expenseId);
        return next;
      });
    }
  };

  const handleDeleteExpenseAll = async (id: string) => {
    const associatedPayments = globalHistory.filter(h => h.gasto_id === id);
    try {
      setIsLoading(true);
      // Eliminar pagos asociados
      for (const payment of associatedPayments) {
        await gastosPagosHistorialService.eliminarPagoHistorial(payment.id);
      }
      await gastosService.eliminarGasto(id);
      
      setExpenses(prev => prev.filter(e => e.id !== id));
      const updatedHistory = await gastosPagosHistorialService.obtenerTodoElHistorial();
      setGlobalHistory(updatedHistory);
      // alert('Gasto e historial eliminados correctamente.');
    } catch (error) {
      console.error('Error al eliminar con dependencias:', error);
      alert('Error al intentar eliminar registros asociados.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExpenseMerge = async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;
    const expenseDate = parseISO(expense.fecha);
    const monthKey = `${expense.categoria}|${expense.subcategoria}|${startOfMonth(expenseDate).getTime()}`;
    const duplicate = expenses.find(e => {
        if (e.id === id) return false;
        const d = parseISO(e.fecha);
        const k = `${e.categoria}|${e.subcategoria}|${startOfMonth(d).getTime()}`;
        return k === monthKey;
    });
    if (!duplicate) return;
    const associatedPayments = globalHistory.filter(h => h.gasto_id === id);

    try {
      setIsLoading(true);
      // Fusionar: traspasar pagos al duplicado
      await gastosPagosHistorialService.actualizarGastoIdEnPagos(id, duplicate.id);
      
      // Recalcular el total_abonado del gasto destino
      const totalTraspasado = associatedPayments.reduce((sum, p) => sum + p.monto_pagado, 0);
      const newTotalAbonado = (duplicate.total_abonado || 0) + totalTraspasado;
      
      await gastosService.actualizarGasto(duplicate.id, {
        total_abonado: newTotalAbonado,
        estado_pago: getEstadoPagoReal(duplicate as ExpenseWithCredit, newTotalAbonado)
      });
      
      // Eliminar el gasto ahora orfano
      await gastosService.eliminarGasto(id);
      
      // Refrescar datos
      const [newExpenses, newHistory] = await Promise.all([
        gastosService.obtenerGastos(),
        gastosPagosHistorialService.obtenerTodoElHistorial()
      ]);
      setExpenses(newExpenses);
      setGlobalHistory(newHistory);
      // alert('Fusión exitosa. Los pagos han sido traspasados.');
    } catch (error) {
      console.error('Error durante la fusión:', error);
      alert('La fusión falló. Revisa la consola para más detalles.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    // Detectar duplicados potenciales (mismo concepto en el mismo mes)
    const expenseDate = parseISO(expense.fecha);
    const monthKey = `${expense.categoria}|${expense.subcategoria}|${startOfMonth(expenseDate).getTime()}`;
    
    const duplicate = expenses.find(e => {
      if (e.id === id) return false;
      const d = parseISO(e.fecha);
      const k = `${e.categoria}|${e.subcategoria}|${startOfMonth(d).getTime()}`;
      return k === monthKey;
    });

    const associatedPayments = globalHistory.filter(h => h.gasto_id === id);
    
    if (associatedPayments.length > 0) {
      setDeleteChoiceConfig({
        isOpen: true,
        expenseId: id,
        hasDuplicate: !!duplicate,
        duplicateName: duplicate ? `${duplicate.subcategoria} (${duplicate.fecha})` : '',
        paymentsCount: associatedPayments.length,
        onDeleteAll: () => handleDeleteExpenseAll(id),
        onMerge: () => handleDeleteExpenseMerge(id),
      });
      return;
    }

    // Caso estándar sin pagos
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar gasto',
      description: '¿Estás seguro de que deseas eliminar este gasto permanentemente?',
      confirmLabel: 'Eliminar',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await gastosService.eliminarGasto(id);
          setExpenses(prev => prev.filter(e => e.id !== id));
        } catch (error) {
          console.error('Error al eliminar gasto:', error);
          alert('Este gasto no se puede eliminar. Posiblemente tenga pagos asociados que no se cargaron correctamente.');
        }
      }
    });
  };

  const handleDeleteHistoryPayment = async (pagoId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar registro de pago',
      description: '¿Estás seguro de que deseas eliminar este registro de pago? El monto abonado del gasto se verá afectado.',
      confirmLabel: 'Eliminar',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const pago = globalHistory.find(h => h.id === pagoId);
          if (!pago) return;

          const gastoId = pago.gasto_id;
          const originalExpense = expenses.find(e => e.id === gastoId);

          await gastosPagosHistorialService.eliminarPagoHistorial(pagoId);

          // Si el pago estaba asociado a un gasto, hay que restar el monto del total_abonado del gasto
          if (originalExpense) {
            const newTotalAbonado = Math.max(0, (originalExpense.total_abonado || 0) - pago.monto_pagado);
            const updateData = {
              total_abonado: newTotalAbonado,
              estado_pago: getEstadoPagoReal(originalExpense as ExpenseWithCredit, newTotalAbonado)
            };
            
            await gastosService.actualizarGasto(gastoId, updateData as any);
            setExpenses(prev => prev.map(e => e.id === gastoId ? { ...e, ...updateData } : e));
          }

          const updatedHistory = await gastosPagosHistorialService.obtenerTodoElHistorial();
          setGlobalHistory(updatedHistory);
        } catch (error) {
          console.error('Error al eliminar pago del historial:', error);
          alert('No se pudo eliminar el pago del historial.');
        }
      }
    });
  };

  const handleUpdateLimit = async (categoryName: string, limit: number) => {
    const updatedCategories = categories.map((c) =>
      c.categoria === categoryName ? { ...c, limite_mensual: limit } : c
    );
    setCategories(updatedCategories);

    const category = updatedCategories.find((c) => c.categoria === categoryName);
    if (category) {
      try {
        await presupuestosService.guardarPresupuesto(category);
      } catch (error) {
        console.error('Error al guardar presupuesto:', error);
      }
    }
  };

  const handleToggleArchive = async (id: string, archived: boolean) => {
    try {
      await gastosService.archivarGasto(id, archived);
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, archived } : e));
      alert(archived ? "Movimiento archivado" : "Movimiento restaurado");
    } catch (error) {
      console.error('Error al archivar/restaurar gasto:', error);
      alert("No se pudo cambiar el estado de archivado");
    }
  };

  const renderContent = () => {
    console.log("APP_RENDER_EXPENSES_ROWS:", Array.isArray(expenses) ? expenses.length : null);
    
    switch (activeTab) {
        case 'dashboard':
        return (
          <Dashboard
            expenses={expenses}
            categories={categories}
            incomes={incomes}
            incomePayments={incomePayments}
            debts={debts}
            history={globalHistory}
            onQuickPayExpense={handleActionPayment}
            onTabChange={setActiveTab}
            onSelectIncome={(name) => {
              setIncomeSearchTerm(name);
              setIncomePaymentFilter('all');
              setActiveTab('incomes');
            }}
            onSelectDebtors={() => {
              setIncomeSearchTerm('');
              setIncomePaymentFilter('debtors');
              setActiveTab('incomes');
            }}
          />
        );
      case 'monthly-status':
        return (
          <ExpenseList
            expenses={expenses}
            onEdit={handleEditExpense}
            onTogglePayment={handleTogglePayment}
            onShowHistory={handleShowHistory}
            onActionPayment={handleActionPayment}
            updatingPaymentIds={updatingPaymentIds}
          />
        );
      case 'history':
        return (
          <PaymentHistory 
            history={globalHistory} 
            expenses={expenses}
            onActionPayment={handleActionPayment}
            onEdit={handleEditExpense}
            onShowHistory={handleShowHistory}
            onTogglePayment={handleTogglePayment}
            onToggleArchive={handleToggleArchive}
            onDeletePayment={handleDeleteHistoryPayment}
            onDeleteExpense={handleDeleteExpense}
          />
        );
      case 'debts':
        return (
          <DebtList 
            debts={debts}
            onEdit={handleEditDebt}
            onDelete={handleDeleteDebt}
          />
        );
      case 'incomes':
        return (
          <IncomeList 
            incomes={incomes}
            expenses={expenses}
            incomePayments={incomePayments}
            onEdit={handleEditIncome}
            onDetail={(income) => setSelectedIncomeForDetail(income)}
            onDelete={handleDeleteIncome}
            searchTerm={incomeSearchTerm}
            onSearchChange={setIncomeSearchTerm}
            paymentStatusFilter={incomePaymentFilter}
            onPaymentStatusFilterChange={setIncomePaymentFilter}
          />
        );
      case 'settings':
        return <Settings categories={categories} onUpdateLimit={handleUpdateLimit} />;
      case 'autos':
        return <AutoList />;
      case 'clm':
        return <CLMList />;
      default:
        return (
          <Dashboard
            expenses={expenses}
            categories={categories}
            incomes={incomes}
            incomePayments={incomePayments}
            debts={debts}
            history={globalHistory}
            onQuickPayExpense={handleActionPayment}
            onTabChange={setActiveTab}
            onSelectIncome={(name) => {
              setIncomeSearchTerm(name);
              setIncomePaymentFilter('all');
              setActiveTab('incomes');
            }}
            onSelectDebtors={() => {
              setIncomeSearchTerm('');
              setIncomePaymentFilter('debtors');
              setActiveTab('incomes');
            }}
          />
        );
      }
  };

  return (
    <div className="h-[100dvh] bg-slate-50 flex flex-col md:flex-row relative overflow-hidden">
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 p-8 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
            <Home className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              Gastos Familiares
            </h1>
            <p className="text-[10px] font-medium text-slate-500 leading-none mt-1">
              Familia Ayestarán
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          <SidebarLink
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
          />
          <SidebarLink
            active={activeTab === 'monthly-status'}
            onClick={() => setActiveTab('monthly-status')}
            icon={<Activity className="w-5 h-5" />}
            label="Estado Mensual"
          />
          <SidebarLink
            active={activeTab === 'incomes'}
            onClick={() => setActiveTab('incomes')}
            icon={<TrendingUp className="w-5 h-5" />}
            label="Clientes"
          />
          <SidebarLink
            active={activeTab === 'autos'}
            onClick={() => setActiveTab('autos')}
            icon={<Car className="w-5 h-5" />}
            label="Autos"
          />
          <SidebarLink
            active={activeTab === 'clm'}
            onClick={() => setActiveTab('clm')}
            icon={<Users className="w-5 h-5" />}
            label="CLM"
          />
          <SidebarLink
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            icon={<HistoryIcon className="w-5 h-5" />}
            label="Historial"
          />
          <SidebarLink
            active={activeTab === 'debts'}
            onClick={() => setActiveTab('debts')}
            icon={<CreditCard className="w-5 h-5" />}
            label="Deudas"
          />
          <SidebarLink
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<SettingsIcon className="w-5 h-5" />}
            label="Configuración"
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px]">
              FA
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-semibold text-slate-900 truncate">
                Familia Ayestarán
              </p>
              <p className="text-[9px] font-medium text-slate-400 tracking-wider">
                Plan Premium
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Salir
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="md:hidden w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Home className="text-white w-5 h-5" />
            </div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 capitalize truncate">
              {activeTab === 'dashboard'
                ? 'Panel de Control'
                : activeTab === 'history'
                ? 'Historial de movimientos'
                : activeTab === 'debts'
                ? 'Control de Deudas'
                : activeTab === 'incomes'
                ? 'Clientes y Cobranzas'
                : activeTab === 'autos'
                ? 'Control de Vehículos'
                : activeTab === 'clm'
                ? 'CLM - Prospectos'
                : 'Configuración'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center bg-slate-50 rounded-full px-3 py-1.5 border border-slate-100">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-transparent border-none text-sm focus:outline-none w-32 lg:w-48"
              />
            </div>
            <Button variant="ghost" size="icon" className="rounded-full text-slate-400 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </Button>
            <Button
              onClick={() => {
                if (activeTab === 'debts') {
                  setDebtToEdit(null);
                  setIsDebtFormOpen(true);
                } else if (activeTab === 'incomes') {
                  setIncomeToEdit(null);
                  setIsIncomeFormOpen(true);
                } else {
                  setExpenseToEdit(null);
                  setIsFormOpen(true);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 shadow-md shadow-blue-100"
            >
              <Plus className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">
                {activeTab === 'debts' ? 'Nueva Deuda' : activeTab === 'incomes' ? 'Nuevo Cliente' : 'Nuevo Gasto'}
              </span>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-36 md:pb-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {hasLegacyData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center gap-3 text-amber-800">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Se detectaron datos locales antiguos</p>
                    <p className="text-xs opacity-80">
                      ¿Deseas migrar tus gastos previos a la nueva base de datos de Supabase?
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setConfirmConfig({
                        isOpen: true,
                        title: 'Descartar datos antiguos',
                        description: '¿Estás seguro de que deseas descartar los datos antiguos? Esta acción no se puede deshacer.',
                        confirmLabel: 'Descartar',
                        variant: 'destructive',
                        onConfirm: () => {
                          localStorage.removeItem('getagasto_expenses');
                          localStorage.removeItem('getagasto_categories');
                          setHasLegacyData(false);
                        }
                      });
                    }}
                    className="text-amber-700 hover:bg-amber-100 flex-1 sm:flex-none"
                  >
                    Descartar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleMigrateData}
                    className="bg-amber-600 hover:bg-amber-700 text-white flex-1 sm:flex-none"
                  >
                    Migrar ahora
                  </Button>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600"
              >
                <Bell className="w-5 h-5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold">Error de sincronización</p>
                  <p className="text-xs opacity-90">{error}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => window.location.reload()}
                  className="hover:bg-red-100 text-red-700 font-bold"
                >
                  Reintentar
                </Button>
              </motion.div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">
                  Sincronizando con Supabase...
                </p>
              </div>
            ) : (
              <div className="w-full">
                {activeTab === 'dashboard' ? (
                  <Dashboard
                    expenses={expenses}
                    categories={categories}
                    incomes={incomes}
                    incomePayments={incomePayments}
                    debts={debts}
                    history={globalHistory}
                    onQuickPayExpense={handleActionPayment}
                    onTabChange={setActiveTab}
                    onSelectIncome={(name) => {
                      setIncomeSearchTerm(name);
                      setActiveTab('incomes');
                    }}
                  />
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      {renderContent()}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <nav className="md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-2 py-1.5 flex justify-between items-stretch fixed bottom-0 left-0 right-0 z-[50] pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.08),0_-2px_8px_-4px_rgba(0,0,0,0.04)]">
        <MobileNavLink
          active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard className="w-5 h-5" />}
          label="Inicio"
        />
        <MobileNavLink
          active={activeTab === 'monthly-status'}
          onClick={() => setActiveTab('monthly-status')}
          icon={<Activity className="w-5 h-5" />}
          label="Mes"
        />
        <MobileNavLink
          active={activeTab === 'incomes'}
          onClick={() => setActiveTab('incomes')}
          icon={<TrendingUp className="w-5 h-5" />}
          label="Clientes"
        />
        <MobileNavLink
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          icon={<HistoryIcon className="w-5 h-5" />}
          label="Histor."
        />
        <MobileNavLink
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
          icon={<SettingsIcon className="w-5 h-5" />}
          label="Config"
        />
      </nav>

      <ExpenseForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setExpenseToEdit(null);
        }}
        onSubmit={handleAddExpense}
        expenseToEdit={expenseToEdit}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleConfirmPayment}
        expense={selectedExpense}
      />

      <PaymentHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        expense={selectedExpense}
      />

      <DebtForm
        isOpen={isDebtFormOpen}
        onClose={() => {
          setIsDebtFormOpen(false);
          setDebtToEdit(null);
        }}
        onSubmit={handleAddDebt}
        debtToEdit={debtToEdit}
      />

      {/* PWA Install Banner */}
      <PWAInstallBanner
        open={showPwaBanner}
        onClose={handlePwaClose}
        onInstall={handlePwaInstall}
        isIOS={isIOS}
      />

      <IncomeForm
        isOpen={isIncomeFormOpen}
        onClose={() => {
          setIsIncomeFormOpen(false);
          setIncomeToEdit(null);
        }}
        onSubmit={handleAddIncome}
        incomeToEdit={incomeToEdit}
        incomes={incomes}
      />
      <AnimatePresence>
        {selectedIncomeForDetail && (
          <ClientDetail 
            income={selectedIncomeForDetail}
            isOpen={!!selectedIncomeForDetail}
            onClose={() => setSelectedIncomeForDetail(null)}
            onEdit={(income) => {
              setSelectedIncomeForDetail(null);
              handleEditIncome(income);
            }}
            onRefresh={fetchData}
          />
        )}
      </AnimatePresence>

      {/* Diálogo de Confirmación Genérico */}
      <Dialog 
        open={confirmConfig.isOpen} 
        onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="max-w-[400px] rounded-[2rem] p-8 z-[9999]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {confirmConfig.title}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pt-2">
              {confirmConfig.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button
              variant="ghost"
              onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
              className="flex-1 rounded-2xl font-bold text-slate-500 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              variant={confirmConfig.variant || 'default'}
              onClick={async () => {
                await confirmConfig.onConfirm();
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
              }}
              className="flex-1 rounded-2xl font-black uppercase text-xs tracking-widest py-6"
            >
              {confirmConfig.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Opción de Eliminación Compleja (Gasto con historial) */}
      <Dialog 
        open={deleteChoiceConfig.isOpen} 
        onOpenChange={(open) => setDeleteChoiceConfig(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="max-w-[450px] rounded-[2.5rem] p-8 border-slate-100 z-[9999]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Eliminar Gasto con Historial
            </DialogTitle>
            <DialogDescription asChild className="text-slate-500 font-medium pt-3 space-y-3">
              <div>
                <p>
                  Este gasto tiene <span className="font-bold text-blue-600">{deleteChoiceConfig.paymentsCount} pagos</span> registrados.
                </p>
                {deleteChoiceConfig.hasDuplicate && (
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-blue-800 text-sm">
                    <p className="font-bold mb-1">¡Duplicado detectado!</p>
                    <p>Parece ser un duplicado de: <span className="font-black italic">"{deleteChoiceConfig.duplicateName}"</span></p>
                  </div>
                )}
                <p>¿Qué deseas hacer?</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {deleteChoiceConfig.hasDuplicate && (
              <Button
                variant="outline"
                className="w-full justify-start items-center p-6 rounded-2xl border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all group"
                onClick={async () => {
                   await deleteChoiceConfig.onMerge();
                   setDeleteChoiceConfig(prev => ({ ...prev, isOpen: false }));
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mr-4 group-hover:scale-110 transition-transform">
                   <TrendingUp className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-900 text-sm">Fusionar Registros</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Traspasar pagos al duplicado y borrar este</p>
                </div>
              </Button>
            )}
            
            <Button
              variant="outline"
              className="w-full justify-start items-center p-6 rounded-2xl border-red-100 hover:bg-red-50 hover:border-red-200 transition-all group"
              onClick={async () => {
                 await deleteChoiceConfig.onDeleteAll();
                 setDeleteChoiceConfig(prev => ({ ...prev, isOpen: false }));
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 mr-4 group-hover:scale-110 transition-transform">
                 <Trash2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-black text-slate-900 text-sm">Eliminar Todo</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Borrar gasto y TODO su historial de pagos</p>
              </div>
            </Button>
          </div>

          <DialogFooter className="mt-8">
            <Button
              variant="ghost"
              onClick={() => setDeleteChoiceConfig(prev => ({ ...prev, isOpen: false }))}
              className="w-full rounded-2xl font-bold text-slate-400 py-6"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SidebarLinkProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const SidebarLink = ({ active, onClick, icon, label }: SidebarLinkProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active
        ? 'bg-blue-50 text-blue-600 font-bold shadow-sm'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

const MobileNavLink = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[52px] py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-95 touch-manipulation ${
      active ? 'text-blue-600 bg-blue-50/80' : 'text-slate-400 hover:bg-slate-50/80 hover:text-slate-600'
    }`}
  >
    <div className={`transition-colors ${active ? '' : ''}`}>
      {icon}
    </div>
    <span className={`text-[11px] font-semibold tracking-wide leading-tight ${
      active ? 'text-blue-600' : 'text-slate-500'
    }`}>
      {label}
    </span>
  </button>
);