import { api } from './client'

type HealthData = {
  status: string
  env: string
}

export function getHealth() {
  return api.get<HealthData>('/health')
}
