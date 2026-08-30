type ConfirmationAppointment = { id: string; startsAt: Date; startsAtKey: string; status: string }

export async function scheduleAppointmentConfirmations(input: { now: Date; appointments: ConfirmationAppointment[]; enqueue: (idempotencyKey: string) => Promise<boolean> }): Promise<number> {
  let scheduled = 0
  for (const appointment of input.appointments) {
    const hours = (appointment.startsAt.getTime() - input.now.getTime()) / 3_600_000
    if (!['scheduled', 'rescheduled'].includes(appointment.status) || hours < 23 || hours > 25) continue
    if (await input.enqueue(`appointment:${appointment.id}:confirmation:${appointment.startsAtKey}`)) scheduled += 1
  }
  return scheduled
}
