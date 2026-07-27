import { supabase } from '../lib/supabase';
import {
  TicketCompra,
  TicketCompraInput,
  TicketConfirmacionResultado,
  TicketProducto,
  TicketProductoInput,
} from '../types';

const throwSupabaseError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

const incompleteConfirmationError = () =>
  new Error(
    'El ticket quedó guardado, pero no pudo contabilizarse como gasto. Revisá los datos e intentá nuevamente.'
  );

const parseConfirmationResult = (
  data: unknown,
  expectedTicketId: string
): TicketConfirmacionResultado => {
  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw || typeof raw !== 'object') throw incompleteConfirmationError();

  const row = raw as Record<string, unknown>;
  const ticketId = typeof row.ticket_id === 'string' ? row.ticket_id : '';
  const gastoId = typeof row.gasto_id === 'string' ? row.gasto_id : '';
  const pagoId = typeof row.pago_id === 'string' ? row.pago_id : '';
  const total = Number(row.total);
  const diferencia = Number(row.diferencia);

  if (
    ticketId !== expectedTicketId ||
    !gastoId ||
    !pagoId ||
    !Number.isFinite(total) ||
    !Number.isFinite(diferencia)
  ) {
    throw incompleteConfirmationError();
  }

  return {
    ticket_id: ticketId,
    gasto_id: gastoId,
    pago_id: pagoId,
    total,
    diferencia,
  };
};

export const ticketsService = {
  async obtenerTicketsConfirmados(): Promise<TicketCompra[]> {
    const { data, error } = await supabase
      .from('tickets_compras')
      .select('*')
      .eq('estado_revision', 'confirmado')
      .order('fecha_compra', { ascending: false });

    throwSupabaseError(error);
    return (data as TicketCompra[]) || [];
  },

  async obtenerTicket(ticketId: string): Promise<TicketCompra> {
    const { data, error } = await supabase
      .from('tickets_compras')
      .select('*')
      .eq('id', ticketId)
      .single();

    throwSupabaseError(error);
    if (!data) throw new Error('No se encontró el ticket guardado.');
    return data as TicketCompra;
  },

  async crearTicket(ticket: TicketCompraInput): Promise<TicketCompra> {
    const { data, error } = await supabase
      .from('tickets_compras')
      .insert(ticket)
      .select()
      .single();

    throwSupabaseError(error);
    return data as TicketCompra;
  },

  async actualizarTicket(
    ticketId: string,
    ticket: Partial<TicketCompraInput>
  ): Promise<TicketCompra> {
    const { data, error } = await supabase
      .from('tickets_compras')
      .update(ticket)
      .eq('id', ticketId)
      .select()
      .single();

    throwSupabaseError(error);
    return data as TicketCompra;
  },

  async reemplazarProductos(
    ticketId: string,
    productos: Omit<TicketProductoInput, 'ticket_id'>[]
  ): Promise<TicketProducto[]> {
    const { error: deleteError } = await supabase
      .from('ticket_productos')
      .delete()
      .eq('ticket_id', ticketId);

    throwSupabaseError(deleteError);

    if (productos.length === 0) return [];

    const payload: TicketProductoInput[] = productos.map((producto, index) => ({
      ...producto,
      ticket_id: ticketId,
      orden: index + 1,
    }));

    const { data, error } = await supabase
      .from('ticket_productos')
      .insert(payload)
      .select();

    throwSupabaseError(error);
    return (data as TicketProducto[]) || [];
  },

  async verificarProductosTicket(ticketId: string, expectedCount: number): Promise<void> {
    const { data, error } = await supabase
      .from('ticket_productos')
      .select('id,ticket_id')
      .eq('ticket_id', ticketId);

    throwSupabaseError(error);
    const productos = (data as Pick<TicketProducto, 'id' | 'ticket_id'>[]) || [];
    const allBelongToTicket = productos.every((producto) => producto.ticket_id === ticketId);

    if (productos.length !== expectedCount || !allBelongToTicket) {
      throw new Error(
        `No se guardaron correctamente todos los productos del ticket. Se esperaban ${expectedCount} y se encontraron ${productos.length}.`
      );
    }
  },

  async confirmarTicket(ticketId: string): Promise<TicketConfirmacionResultado> {
    const { data, error } = await supabase.rpc('confirmar_ticket_compra', {
      p_ticket_id: ticketId,
    });

    throwSupabaseError(error);
    return parseConfirmationResult(data, ticketId);
  },

  async verificarTicketConfirmado(
    ticketId: string,
    result?: TicketConfirmacionResultado
  ): Promise<TicketCompra> {
    const ticket = await this.obtenerTicket(ticketId);
    const isConfirmed = ticket.estado_revision?.trim().toLowerCase() === 'confirmado';

    if (
      !isConfirmed ||
      !ticket.gasto_id ||
      !ticket.pago_id ||
      (result && (
        ticket.gasto_id !== result.gasto_id ||
        ticket.pago_id !== result.pago_id
      ))
    ) {
      throw incompleteConfirmationError();
    }

    return ticket;
  },
};
