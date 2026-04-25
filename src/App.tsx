/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { startOfMonth, parseISO } from 'date-fns';

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

  // Sincronizar búsqueda cuando se cambia de pestaña manual
  useEffect(() => {
    if (activeTab !== 'incomes') {
      setIncomeSearchTerm('');
    }
  }, [activeTab]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPaymentIds, setUpdatingPaymentIds] = useState<Set<string>>(new Set());
  const [hasLegacyData, setHasLegacyData] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

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

  useEffect(() => {
    console.log("APP_GASTOS_4_ESTADO_GASTOS:", expenses);
    console.log("APP_GASTOS_4_ROWS:", Array.isArray(expenses) ? expenses.length : null);
  }, [expenses]);

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
            estado_pago: exp.estado_pago || 'Pendiente',
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
          console.log("APP_GASTOS_SETSTATE_SECUNDARIO_HANDLEMIGRATEDATA:", nextVal);
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
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log("APP_GASTOS_1_ANTES_FETCH")
        console.log("COMPONENTE_QUE_LLAMA_GASTOS: src/App.tsx");
        
        const results = await Promise.allSettled([
          gastosService.obtenerGastos(),
          presupuestosService.obtenerPresupuestos(),
          gastosPagosHistorialService.obtenerTodoElHistorial(),
          deudasService.obtenerDeudas(),
          incomesService.obtenerIngresos(),
          incomesService.obtenerTodosLosPagos(),
        ]);

        const gastosResult = results[0];
        const presupuestosResult = results[1];
        const historialResult = results[2];
        const deudasResult = results[3];
        const ingresosResult = results[4];
        const ingresosPagosResult = results[5];

        console.log("APP_FETCH_GASTOS_STATUS:", gastosResult.status);
        console.log("APP_FETCH_PRESUPUESTOS_STATUS:", presupuestosResult.status);
        console.log("APP_FETCH_HISTORIAL_STATUS:", historialResult.status);
        console.log("APP_FETCH_DEUDAS_STATUS:", deudasResult.status);
        console.log("APP_FETCH_INGRESOS_STATUS:", ingresosResult.status);

        // Procesar Gastos (Crítico)
        let dbExpenses: Expense[] = [];
        if (gastosResult.status === 'fulfilled') {
          dbExpenses = gastosResult.value;
        } else {
          console.error("APP_FETCH_GASTOS_ERROR:", gastosResult.reason);
        }

        // Procesar Presupuestos (Fallback a CATEGORIES si falla)
        let dbCategories: CategoryConfig[] = [];
        if (presupuestosResult.status === 'fulfilled') {
          dbCategories = presupuestosResult.value;
        } else {
          console.error("APP_FETCH_PRESUPUESTOS_ERROR:", presupuestosResult.reason);
        }

        // Procesar Historial (Fallback a [] si falla)
        let dbHistory: GastoPagoHistorial[] = [];
        if (historialResult.status === 'fulfilled') {
          dbHistory = historialResult.value;
        } else {
          console.error("APP_FETCH_HISTORIAL_ERROR:", historialResult.reason);
        }

        // Procesar Deudas (Fallback a [] si falla)
        let dbDebts: Debt[] = [];
        if (deudasResult.status === 'fulfilled') {
          dbDebts = deudasResult.value;
        } else {
          console.error("APP_FETCH_DEUDAS_ERROR:", deudasResult.reason);
        }

        // Procesar Ingresos (Fallback a [] si falla)
        let dbIncomes: Income[] = [];
        if (ingresosResult.status === 'fulfilled') {
          dbIncomes = ingresosResult.value;
        } else {
          console.error("APP_FETCH_INGRESOS_ERROR:", ingresosResult.reason);
          setError(`No se pudieron cargar los ingresos/clientes: ${ingresosResult.reason instanceof Error ? ingresosResult.reason.message : 'Error desconocido'}`);
        }

        let dbIncomePayments: IngresoPago[] = [];
        if (ingresosPagosResult.status === 'fulfilled') {
          dbIncomePayments = ingresosPagosResult.value;
        } else {
          console.error("APP_FETCH_INGRESOS_PAGOS_ERROR:", ingresosPagosResult.reason);
        }

    console.log("APP_GASTOS_2_RESPUESTA_SERVICIO:", dbExpenses);
    if (dbExpenses.length > 0) {
      console.log("APP_GASTOS_SCHEMA_KEYS:", Object.keys(dbExpenses[0]));
    }
    console.log("APP_GASTOS_2_ROWS:", Array.isArray(dbExpenses) ? dbExpenses.length : null);

        console.log("APP_GASTOS_3_ANTES_SETSTATE:", dbExpenses);

        console.log("APP_GASTOS_3A_SETSTATE_INICIO")
        setExpenses((prev) => {
        console.log("APP_GASTOS_3B_PREV_STATE_COUNT:", prev.length);
        console.log("APP_GASTOS_3C_NEW_STATE_COUNT:", dbExpenses.length);
        
        // Log de Relecura Detallado (Prompt 081)
        dbExpenses.forEach(exp => {
          if (exp.id) {
            console.log(`RELOAD_GASTO_ID: ${exp.id}, RELOAD_DIA_VENCIMIENTO_LEIDO: ${exp.dia_vencimiento}`);
          }
        });

        return dbExpenses;
        })
        console.log("APP_GASTOS_3D_SETSTATE_EJECUTADO")

        setCategories(dbCategories.length > 0 ? dbCategories : CATEGORIES);
        setGlobalHistory(dbHistory);
        setDebts(dbDebts);
        setIncomes(dbIncomes);
        setIncomePayments(dbIncomePayments);
      } catch (e) {
        console.error("APP_GASTOS_ERROR_EN_FETCH_O_SETSTATE:", e)
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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
      let choice = "";
      if (duplicate) {
        choice = window.prompt(
          `Este gasto tiene ${associatedPayments.length} pagos registrados y parece ser un DUPLICADO de "${duplicate.subcategoria}" (${duplicate.fecha}).\n\n` +
          `¿Qué deseas hacer?\n` +
          `1. Eliminar TODO (gasto y sus pagos)\n` +
          `2. FUSIONAR (traspasar sus pagos al otro gasto y borrar este)\n` +
          `Escribe 1 o 2 para confirmar, o cancela.`
        ) || "";
      } else {
        const confirmDeleteAll = window.confirm(
          `Este gasto tiene ${associatedPayments.length} pagos asociados.\n` +
          `No se puede eliminar un gasto con historial sin borrar también sus pagos.\n\n` +
          `¿Deseas eliminar el gasto y TODO su historial de pagos?`
        );
        if (confirmDeleteAll) choice = "1";
      }

      if (choice === "1") {
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
          alert('Gasto e historial eliminados correctamente.');
        } catch (error) {
          console.error('Error al eliminar con dependencias:', error);
          alert('Error al intentar eliminar registros asociados.');
        } finally {
          setIsLoading(false);
        }
      } else if (choice === "2" && duplicate) {
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
          alert('Fusión exitosa. Los pagos han sido traspasados.');
        } catch (error) {
          console.error('Error durante la fusión:', error);
          alert('La fusión falló. Revisa la consola para más detalles.');
        } finally {
          setIsLoading(false);
        }
      }
      return;
    }

    // Caso estándar sin pagos
    if (!window.confirm('¿Estás seguro de que deseas eliminar este gasto permanentemente?')) return;
    
    try {
      await gastosService.eliminarGasto(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      alert('Este gasto no se puede eliminar. Posiblemente tenga pagos asociados que no se cargaron correctamente.');
    }
  };

  const handleDeleteHistoryPayment = async (pagoId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro de pago? El monto abonado del gasto se verá afectado.')) return;

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
          />
        );
      case 'settings':
        return <Settings categories={categories} onUpdateLimit={handleUpdateLimit} />;
      case 'autos':
        return <AutoList />;
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
              setActiveTab('incomes');
            }}
          />
        );
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 p-8">
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

      <main className="flex-1 flex flex-col min-h-[100dvh] overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-30">
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

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
                      if (
                        confirm(
                          '¿Estás seguro de que deseas descartar los datos antiguos? Esta acción no se puede deshacer.'
                        )
                      ) {
                        localStorage.removeItem('getagasto_expenses');
                        localStorage.removeItem('getagasto_categories');
                        setHasLegacyData(false);
                      }
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

      <nav className="md:hidden bg-white border-t border-slate-200 px-2 py-2 flex justify-between items-center sticky bottom-0 z-30">
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
          />
        )}
      </AnimatePresence>
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
    className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${
      active ? 'text-blue-600' : 'text-slate-400'
    }`}
  >
    <div className={`p-1.5 rounded-lg ${active ? 'bg-blue-50' : ''}`}>
      {icon}
    </div>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);