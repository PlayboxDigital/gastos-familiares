import React, { useEffect, useState } from 'react';
import { Home, LogOut, Plus, Receipt, ScanLine, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExpenseForm } from './ExpenseForm';
import { TicketScanner } from './TicketScanner';
import { CLMList } from './CLMList';
import { gastosService } from '../services/gastos';
import { useAuth } from '../hooks/useAuth';
import type { Expense } from '../types';

type EntryMode = 'manual' | 'ticket' | 'clm';

export const ExpenseEntryPage: React.FC = () => {
  const { familiaNombre, user, canAccessClm, signOut } = useAuth();
  const [mode, setMode] = useState<EntryMode>('manual');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'clm' && !canAccessClm) {
      setMode('manual');
    }
  }, [canAccessClm, mode]);

  const handleCreateExpense = async (
    expense: Omit<Expense, 'id'> & {
      id?: string;
      tipo_gasto?: 'fijo' | 'variable';
      pagado?: boolean;
    }
  ) => {
    setError('');
    setMessage('');
    try {
      const { id: _id, tipo_gasto: _tipoGasto, pagado: _pagado, ...payload } = expense;
      await gastosService.crearGasto(payload);
      setMessage('El gasto se registró correctamente.');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo registrar el gasto. Intentá nuevamente.'
      );
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setError('');
    try {
      await signOut();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo cerrar la sesión. Intentá nuevamente.'
      );
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-200">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">Registrar gasto</p>
              <p className="truncate text-xs text-slate-500">
                {familiaNombre} · {user?.email}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="shrink-0 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isSigningOut ? 'Cerrando...' : 'Cerrar sesión'}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700" role="status">
            {message}
          </div>
        )}

        <nav
          className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
          aria-label="Funciones disponibles"
        >
          <Button
            type="button"
            variant={mode === 'manual' ? 'default' : 'ghost'}
            className="rounded-xl"
            onClick={() => setMode('manual')}
          >
            <Receipt className="mr-2 h-4 w-4" />
            Registrar gasto
          </Button>
          <Button
            type="button"
            variant={mode === 'ticket' ? 'default' : 'ghost'}
            className="rounded-xl"
            onClick={() => setMode('ticket')}
          >
            <ScanLine className="mr-2 h-4 w-4" />
            Cargar ticket
          </Button>
          {canAccessClm && (
            <Button
              type="button"
              variant={mode === 'clm' ? 'default' : 'ghost'}
              className="rounded-xl"
              onClick={() => setMode('clm')}
            >
              <Users className="mr-2 h-4 w-4" />
              CLM
            </Button>
          )}
        </nav>

        {mode === 'clm' ? (
          canAccessClm ? (
            <section className="space-y-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                  Gestión comercial
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  CLM - Prospectos
                </h1>
              </div>
              <CLMList />
            </section>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700" role="alert">
              No tenés permiso para acceder a CLM - Prospectos.
            </div>
          )
        ) : mode === 'ticket' ? (
          <TicketScanner
            onBackToDashboard={() => setMode('manual')}
            onConfirmed={async () => {
              setMessage('El ticket quedó contabilizado correctamente.');
            }}
          />
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                Carga autorizada
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Registrar gasto
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Elegí cómo querés ingresar el movimiento. Esta cuenta no tiene acceso a totales,
                estadísticas ni listados familiares.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-black text-slate-950">Carga manual</h2>
                  <p className="mt-2 flex-1 text-sm text-slate-500">
                    Completá el concepto, monto, categoría y responsable del gasto.
                  </p>
                  <Button
                    type="button"
                    className="mt-6 h-11 rounded-xl bg-blue-600 font-bold hover:bg-blue-700"
                    onClick={() => {
                      setMessage('');
                      setError('');
                      setIsFormOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo gasto
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <ScanLine className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-black text-slate-950">Cargar ticket</h2>
                  <p className="mt-2 flex-1 text-sm text-slate-500">
                    Usá la cámara o elegí una imagen y revisá los datos antes de confirmar.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6 h-11 rounded-xl border-violet-200 font-bold text-violet-700 hover:bg-violet-50"
                    onClick={() => {
                      setMessage('');
                      setError('');
                      setMode('ticket');
                    }}
                  >
                    <ScanLine className="mr-2 h-4 w-4" />
                    Escanear ticket
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <ExpenseForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateExpense}
        expenseToEdit={null}
        defaultTipoGasto="variable"
      />
    </div>
  );
};
