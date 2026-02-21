import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/modules/auth/store/authStore'

const API_BASE = '/api/v1'

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    const message =
      (error.response?.data as { detail?: string })?.detail ||
      error.message ||
      'Error de conexión'
    return Promise.reject(new Error(typeof message === 'string' ? message : JSON.stringify(message)))
  }
)
