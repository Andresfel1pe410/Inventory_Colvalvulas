import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { VENTAS_API_BASE, PROCESO_API_BASE, RRHH_API_BASE } from '@/shared/config'

const createApiClient = (baseURL: string) => axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const attachAuthInterceptors = (client: ReturnType<typeof createApiClient>) => {
  client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  client.interceptors.response.use(
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
}

export const api = createApiClient(VENTAS_API_BASE)
export const procesoApi = createApiClient(PROCESO_API_BASE)
export const rrhhApi = createApiClient(RRHH_API_BASE)

attachAuthInterceptors(api)
attachAuthInterceptors(procesoApi)
attachAuthInterceptors(rrhhApi)
