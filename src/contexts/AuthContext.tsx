import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type FamilyRole =
  | 'admin'
  | 'carga_gastos'
  | 'carga_gastos_prospectos';

interface FamilyMembership {
  familiaId: string;
  familiaNombre: string;
  rol: FamilyRole;
}

interface MembershipRow {
  familia_id?: unknown;
  rol?: unknown;
  activo?: unknown;
  familias?: { nombre?: unknown } | Array<{ nombre?: unknown }> | null;
}

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  familiaId: string | null;
  familiaNombre: string | null;
  rol: FamilyRole | null;
  isAdmin: boolean;
  canRegisterExpenses: boolean;
  canAccessClm: boolean;
  loading: boolean;
  accessError: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const NO_ACTIVE_MEMBERSHIP_MESSAGE =
  'Tu cuenta no tiene acceso habilitado a ninguna familia.';

const friendlySignInError = (error: { code?: string; message?: string }) => {
  const message = error.message?.toLocaleLowerCase() || '';
  if (
    error.code === 'invalid_credentials' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return 'El correo o la contraseña no son correctos.';
  }
  if (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('fetch')
  ) {
    return 'No se pudo conectar con el servidor. Intentá nuevamente.';
  }
  return 'No se pudo iniciar sesión. Intentá nuevamente.';
};

const parseMembership = (row: MembershipRow | null): FamilyMembership | null => {
  if (!row || row.activo !== true) return null;

  const familiaId = typeof row.familia_id === 'string' ? row.familia_id : '';
  const rol =
    row.rol === 'admin' ||
    row.rol === 'carga_gastos' ||
    row.rol === 'carga_gastos_prospectos'
      ? row.rol
      : null;
  const relatedFamily = Array.isArray(row.familias) ? row.familias[0] : row.familias;
  const familiaNombre =
    relatedFamily && typeof relatedFamily.nombre === 'string'
      ? relatedFamily.nombre.trim()
      : '';

  if (!familiaId || !familiaNombre || !rol) return null;
  return { familiaId, familiaNombre, rol };
};

const fetchActiveMembership = async (userId: string): Promise<FamilyMembership | null> => {
  const { data, error } = await supabase
    .from('familia_miembros')
    .select('familia_id, rol, activo, familias ( nombre )')
    .eq('user_id', userId)
    .eq('activo', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo verificar el acceso de tu cuenta. Intentá nuevamente.');
  }

  return parseMembership(data as MembershipRow | null);
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<FamilyMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');
  const validationSequence = useRef(0);

  const clearAuthenticatedState = useCallback(() => {
    setSession(null);
    setMembership(null);
  }, []);

  const validateSession = useCallback(async (
    nextSession: Session | null,
    options?: { membershipErrorMessage?: string }
  ) => {
    const sequence = ++validationSequence.current;

    if (!nextSession) {
      clearAuthenticatedState();
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const activeMembership = await fetchActiveMembership(nextSession.user.id);
      if (sequence !== validationSequence.current) return;

      if (!activeMembership) {
        clearAuthenticatedState();
        await supabase.auth.signOut();
        setAccessError(NO_ACTIVE_MEMBERSHIP_MESSAGE);
        return;
      }

      setSession(nextSession);
      setMembership(activeMembership);
      setAccessError('');
    } catch (cause) {
      if (sequence !== validationSequence.current) return;
      clearAuthenticatedState();
      await supabase.auth.signOut();
      setAccessError(
        options?.membershipErrorMessage ||
          (cause instanceof Error
            ? cause.message
            : 'No se pudo verificar el acceso de tu cuenta. Intentá nuevamente.')
      );
    } finally {
      if (sequence === validationSequence.current) setLoading(false);
    }
  }, [clearAuthenticatedState]);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const {
        data: { session: restoredSession },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;
      if (error) {
        clearAuthenticatedState();
        setAccessError('Tu sesión venció. Iniciá sesión nuevamente.');
        setLoading(false);
        return;
      }
      await validateSession(restoredSession);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted || event === 'INITIAL_SESSION') return;
      void validateSession(nextSession);
    });

    void restoreSession();
    return () => {
      mounted = false;
      validationSequence.current += 1;
      subscription.unsubscribe();
    };
  }, [clearAuthenticatedState, validateSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setAccessError('');
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session) {
      setLoading(false);
      throw new Error(
        error
          ? friendlySignInError(error)
          : 'El correo o la contraseña no son correctos.'
      );
    }

    await validateSession(data.session);
  }, [validateSession]);

  const signOut = useCallback(async () => {
    validationSequence.current += 1;
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error('No se pudo cerrar la sesión. Intentá nuevamente.');
    }
    clearAuthenticatedState();
    setAccessError('');
    setLoading(false);
  }, [clearAuthenticatedState]);

  const refreshSession = useCallback(async () => {
    const {
      data: { session: refreshedSession },
      error,
    } = await supabase.auth.refreshSession();
    if (error || !refreshedSession) {
      clearAuthenticatedState();
      throw new Error('Tu sesión venció. Iniciá sesión nuevamente.');
    }
    await validateSession(refreshedSession);
    return refreshedSession;
  }, [clearAuthenticatedState, validateSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      familiaId: membership?.familiaId ?? null,
      familiaNombre: membership?.familiaNombre ?? null,
      rol: membership?.rol ?? null,
      isAdmin: membership?.rol === 'admin',
      canRegisterExpenses:
        membership?.rol === 'admin' ||
        membership?.rol === 'carga_gastos' ||
        membership?.rol === 'carga_gastos_prospectos',
      canAccessClm:
        membership?.rol === 'admin' ||
        membership?.rol === 'carga_gastos_prospectos',
      loading,
      accessError,
      signIn,
      signOut,
      refreshSession,
    }),
    [accessError, loading, membership, refreshSession, session, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
