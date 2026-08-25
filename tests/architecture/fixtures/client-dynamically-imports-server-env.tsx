'use client'

export async function loadServerEnv() {
  return import('@/platform/env/server')
}
