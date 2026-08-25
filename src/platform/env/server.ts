import './server-only'
import { parseServerEnv } from './schema'

export function serverEnv() {
  return parseServerEnv(process.env)
}
