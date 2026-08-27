import { getEventFinancialSummary, type EventFinancialInput } from '../../events/public'

export type EventReportInput = { id: string; title: string; financial: EventFinancialInput; attendance?: Array<{ present: boolean }> }

export function getEventsReport(input: { events: EventReportInput[] }) {
  return input.events.map((event) => {
    const financial = getEventFinancialSummary(event.financial)
    const registrations = event.financial.registrations
    return {
      id: event.id,
      title: event.title,
      registered: registrations.filter((registration) => registration.status !== 'cancelled').length,
      present: event.attendance?.filter((attendance) => attendance.present).length ?? 0,
      absent: event.attendance?.filter((attendance) => !attendance.present).length ?? 0,
      ...financial,
    }
  })
}
