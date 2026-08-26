type ReminderAppointment = { id: string; cancellationDeadlineAt: Date; reminderEnabled: boolean }
export async function createCancellationDeadlineReminders(input: { now: Date; appointments: ReminderAppointment[]; enqueue: (key: string) => Promise<boolean> }): Promise<number> {
  let count = 0
  for (const appointment of input.appointments) {
    const hours = (appointment.cancellationDeadlineAt.getTime() - input.now.getTime()) / 3_600_000
    if (!appointment.reminderEnabled || hours < 0 || hours > 24) continue
    if (await input.enqueue(`appointment:${appointment.id}:cancellation-deadline:${appointment.cancellationDeadlineAt.toISOString()}`)) count += 1
  }
  return count
}
