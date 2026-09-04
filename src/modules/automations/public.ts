export { scheduleAppointmentConfirmations } from './application/schedule-appointment-confirmations'
export { runDailyAutomations } from './application/run-daily-automations'
export { sendBirthdayGreetings, type BirthdayPerson, type BirthdayMessage } from './application/send-birthday-greetings'
export { createCancellationDeadlineReminders } from './application/create-cancellation-deadline-reminders'
export {
  buildAppointmentConfirmationMessage,
  resolveConfirmationRecipient,
  type AppointmentConfirmationMessage,
  type ConfirmationRecipient,
  type ResolvedConfirmationRecipient,
} from './application/build-appointment-confirmation-message'
