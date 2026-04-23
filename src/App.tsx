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
} from './types';
import { CATEGORIES } from './constants';
import { gastosService } from './services/gastos';
import { presupuestosService } from './services/presupuestos';
import { gastosPagosHistorialService } from './services/gastosPagosHistorial';
import { deudasService } from './services/deudas';
import { incomesService } from './services/ingresos';
import { Button } from '@/components/ui/button';
import { DebtList } from './components/DebtList';
import { DebtForm } from './components/DebtForm';
import { IncomeList } from './components/IncomeList';
import { IncomeForm } from './components/IncomeForm';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDebtFormOpen, setIsDebtFormOpen] = useState(false);
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);

  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [debtToEdit, setDebtToEdit] = useState<Debt | null>(null);
  const [incomeToEdit, setIncomeToEdit] = useState<Income | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
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
      try {
        console.log("APP_GASTOS_1_ANTES_FETCH")
        console.log("COMPONENTE_QUE_LLAMA_GASTOS: src/App.tsx");
        
        const results = await Promise.allSettled([
          gastosService.obtenerGastos(),
          presupuestosService.obtenerPresupuestos(),
          gastosPagosHistorialService.obtenerTodoElHistorial(),
          deudasService.obtenerDeudas(),
          incomesService.obtenerIngresos(),
        ]);

        const gastosResult = results[0];
        const presupuestosResult = results[1];
        const historialResult = results[2];
        const deudasResult = results[3];
        const ingresosResult = results[4];

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
        }

        console.log("APP_GASTOS_2_RESPUESTA_SERVICIO:", dbExpenses);
        console.log("APP_GASTOS_2_ROWS:", Array.isArray(dbExpenses) ? dbExpenses.length : null);

        console.log("APP_GASTOS_3_ANTES_SETSTATE:", dbExpenses);

        console.log("APP_GASTOS_3A_SETSTATE_INICIO")
        setExpenses((prev) => {
          console.log("APP_GASTOS_3B_PREV_STATE:", prev)
          console.log("APP_GASTOS_3C_NEW_STATE:", dbExpenses)
          return dbExpenses
        })
        console.log("APP_GASTOS_3D_SETSTATE_EJECUTADO")

        setCategories(dbCategories.length > 0 ? dbCategories : CATEGORIES);
        setGlobalHistory(dbHistory);
        setDebts(dbDebts);
        setIncomes(dbIncomes);
      } catch (e) {
        console.error("APP_GASTOS_ERROR_EN_FETCH_O_SETSTATE:", e)
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddExpense = async (newExpense: Omit<Expense, 'id'> & { id?: string }) => {
    try {
      if (newExpense.id) {
        const { id, ...data } = newExpense;
        await gastosService.actualizarGasto(id, data);
        console.log("APP_GASTOS_SETSTATE_SECUNDARIO_HANDLEADDEXPENSE_UPDATE:", id);
        setExpenses((prev) =>
          prev.map((e) => (e.id === id ? ({ ...e, ...data } as Expense) : e))
        );
      } else {
        const createdExpense = await gastosService.crearGasto(newExpense);
        console.log("APP_GASTOS_SETSTATE_SECUNDARIO_HANDLEADDEXPENSE_CREATE:", createdExpense);
        setExpenses((prev) => [createdExpense, ...prev]);
      }
    } catch (error) {
      console.error('Error al procesar gasto:', error);
    }

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
            debts={debts}
            onQuickPayExpense={handleActionPayment}
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
            onEdit={handleEditIncome}
            onDelete={handleDeleteIncome}
          />
        );
      case 'settings':
        return <Settings categories={categories} onUpdateLimit={handleUpdateLimit} />;
      default:
        console.log("APP_COMPONENTE_CON_EXPENSES: Dashboard (default)", expenses.length);
        return (
          <Dashboard
            expenses={expenses}
            categories={categories}
            incomes={incomes}
            debts={debts}
            onQuickPayExpense={handleActionPayment}
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
            active={activeTab === 'incomes'}
            onClick={() => setActiveTab('incomes')}
            icon={<TrendingUp className="w-5 h-5" />}
            label="Ingresos"
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

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-6 h-6" />
            </Button>
            <h2 className="text-lg font-bold text-slate-900 capitalize">
              {activeTab === 'dashboard'
                ? 'Panel de Control'
                : activeTab === 'history'
                ? 'Historial de movimientos'
                : activeTab === 'debts'
                ? 'Control de Deudas'
                : activeTab === 'incomes'
                ? 'Gestión de Ingresos'
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
                {activeTab === 'debts' ? 'Nueva Deuda' : activeTab === 'incomes' ? 'Nuevo Ingreso' : 'Nuevo Gasto'}
              </span>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
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
                    debts={debts}
                    history={globalHistory}
                    onQuickPayExpense={handleActionPayment}
                    onTabChange={setActiveTab}
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

      <nav className="md:hidden bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center sticky bottom-0 z-10">
        <MobileNavLink
          active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard className="w-6 h-6" />}
        />
        <MobileNavLink
          active={activeTab === 'monthly-status'}
          onClick={() => setActiveTab('monthly-status')}
          icon={<Activity className="w-6 h-6" />}
        />
        <MobileNavLink
          active={activeTab === 'incomes'}
          onClick={() => setActiveTab('incomes')}
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <MobileNavLink
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          icon={<HistoryIcon className="w-6 h-6" />}
        />
        <MobileNavLink
          active={activeTab === 'debts'}
          onClick={() => setActiveTab('debts')}
          icon={<CreditCard className="w-6 h-6" />}
        />
        <MobileNavLink
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
          icon={<SettingsIcon className="w-6 h-6" />}
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
      />
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
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-xl transition-colors ${
      active ? 'text-blue-600 bg-blue-50' : 'text-slate-400'
    }`}
  >
    {icon}
  </button>
);