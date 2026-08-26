export const APP_ROLES = ['psychologist_owner', 'secretary', 'accounting'] as const

export type AppRole = (typeof APP_ROLES)[number]

export const isAppRole = (value: string): value is AppRole => APP_ROLES.includes(value as AppRole)
