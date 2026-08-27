export type Expense = { amountCents: number; paidAt?: string; dueDate: string }
export type ExpenseSummary = { paidCents: number; upcomingCents: number }

function businessDate(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`
}

export function getExpenseSummary(expenses: Expense[], startDate: string, endDate: string): ExpenseSummary {
  return {
    paidCents: expenses.filter((item) => item.paidAt && businessDate(item.paidAt) >= startDate && businessDate(item.paidAt) < endDate).reduce((total, item) => total + item.amountCents, 0),
    upcomingCents: expenses.filter((item) => !item.paidAt && item.dueDate >= endDate).reduce((total, item) => total + item.amountCents, 0),
  }
}
