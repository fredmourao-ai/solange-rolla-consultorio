export async function runDailyAutomations(input: { businessDate: string; run: (key: string) => Promise<void> }): Promise<void> {
  await input.run(`automations:daily:${input.businessDate}`)
}
