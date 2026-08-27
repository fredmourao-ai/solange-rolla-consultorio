type AppointmentReportRecord = {
  id: string
  startsAt: string
  status: 'scheduled' | 'pending_confirmation' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'reschedule_requested' | 'rescheduled'
  cancellationWithinPolicy?: boolean
}

export type AppointmentsReportInput = { appointments: AppointmentReportRecord[] }
function businessDate(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`
}

export function getAppointmentsReport(input: AppointmentsReportInput, startDate: string, endDate: string) {
  const appointments = input.appointments.filter((appointment) => businessDate(appointment.startsAt) >= startDate && businessDate(appointment.startsAt) < endDate)
  const cancelled = appointments.filter((appointment) => appointment.status === 'cancelled')
  return {
    periodStart: startDate,
    periodEnd: endDate,
    total: appointments.length,
    completed: appointments.filter((appointment) => appointment.status === 'completed').length,
    cancelled: cancelled.length,
    cancelledWithinPolicy: cancelled.filter((appointment) => appointment.cancellationWithinPolicy === true).length,
    cancelledOutsidePolicy: cancelled.filter((appointment) => appointment.cancellationWithinPolicy === false).length,
    noShows: appointments.filter((appointment) => appointment.status === 'no_show').length,
    pendingConfirmation: appointments.filter((appointment) => appointment.status === 'pending_confirmation').length,
    rescheduleRequests: appointments.filter((appointment) => appointment.status === 'reschedule_requested').length,
  }
}
