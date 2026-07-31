import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ExpenseEntryPage } from './components/ExpenseEntryPage.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { useAuth } from './hooks/useAuth.ts';
import './index.css';

const AuthenticatedRoot = () => {
  const { session, loading, isAdmin, canRegisterExpenses } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500" role="status" aria-live="polite">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm font-semibold">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  if (isAdmin) return <App />;
  if (canRegisterExpenses) return <ExpenseEntryPage />;

  return <LoginScreen />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthenticatedRoot />
    </AuthProvider>
  </StrictMode>,
);
