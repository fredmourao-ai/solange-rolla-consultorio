import { getAppointmentsReport } from './get-appointments-report'
import { getEventsReport } from './get-events-report'
import { getFinancialReport, type PaymentMethod } from './get-financial-report'
import { getFiscalReport, type FiscalReportDocument } from './get-fiscal-report'

type Registration = { price_cents: number; status: string; attendance_status: string }
type EventRow = { id: string; title: string; capacity: number; registrations: Registration[]; expenses: Array<{ amount_cents: number }> }
export type OperationalReportRows = {
  payments: Array<{ amount_cents: number; paid_at: string; method: string }>
  refunds: Array<{ amount_cents: number; refunded_at: string }>
  receivables: Array<{ amount_cents: number; status: string }>
  payables: Array<{ amount_cents: number; due_date: string; paid_at?: string | null }>
  appointments: Array<{ id: string; starts_at: string; status: string }>
  events: EventRow[]
  fiscalDocuments: Array<{ id: string; status: string; amount_cents: number }>
}

function paymentMethod(method: string): PaymentMethod {
  if (method === 'pix' || method === 'cash' || method === 'other') return method
  if (method === 'debit_card' || method === 'credit_card' || method === 'card') return 'card'
  if (method === 'bank_transfer' || method === 'transfer') return 'transfer'
  return 'other'
}

function appointmentStatus(status: string) {
  if (status.startsWith('cancelled_')) return 'cancelled' as const
  return status as 'scheduled' | 'pending_confirmation' | 'confirmed' | 'completed' | 'no_show' | 'reschedule_requested' | 'rescheduled'
}

export function buildOperationalReports(rows: OperationalReportRows, startDate: string, endDate: string) {
  const financial = getFinancialReport({
    payments: rows.payments.map((row) => ({
      amountCents: row.amount_cents,
      paidAt: row.paid_at,
      method: paymentMethod(row.method),
    })),
    refunds: rows.refunds.map((row) => ({
      amountCents: row.amount_cents,
      refundedAt: row.refunded_at,
      status: 'effective' as const,
    })),
    receivables: rows.receivables
      .filter((row) => row.status === 'open' || row.status === 'overdue')
      .map((row) => ({
        amountCents: row.amount_cents,
        status: row.status as 'open' | 'overdue',
      })),
    expenses: rows.payables.map((row) => ({
      amountCents: row.amount_cents,
      dueDate: row.due_date,
      paidAt: row.paid_at ?? undefined,
    })),
  }, startDate, endDate)
  const appointments = getAppointmentsReport({
    appointments: rows.appointments.map((row) => ({
      id: row.id,
      startsAt: row.starts_at,
      status: appointmentStatus(row.status),
      cancellationWithinPolicy: row.status === 'cancelled_in_time'
        ? true
        : row.status === 'cancelled_late' ? false : undefined,
    })),
  }, startDate, endDate)

  const events = getEventsReport({ events: rows.events.map((event) => ({
    id: event.id,
    title: event.title,
    financial: {
      capacity: event.capacity,
      registrations: event.registrations.map((registration) => ({
        priceCents: registration.price_cents,
        status: registration.status as 'confirmed' | 'pending_payment' | 'waitlisted' | 'cancelled',
      })),
      payments: [],
      refunds: [],
      expenses: event.expenses.map((expense) => ({ amountCents: expense.amount_cents })),
    },
    attendance: event.registrations
      .filter((registration) => registration.attendance_status !== 'unknown')
      .map((registration) => ({ present: registration.attendance_status === 'present' })),
  })) })

  const fiscal = getFiscalReport({
    documents: rows.fiscalDocuments.map((row) => ({
      id: row.id,
      status: row.status as FiscalReportDocument['status'],
      amountCents: row.amount_cents,
    })),
  })
  return { financial, appointments, events, fiscal }
}
