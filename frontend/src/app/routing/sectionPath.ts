import { createContext, useContext, createElement } from 'react'
import type { ReactNode } from 'react'

export type AppSection = 'legacy' | 'ventas' | 'proceso' | 'rrhh'

const SectionPathContext = createContext('')

function normalizeBasePath(basePath: string): string {
  if (!basePath) return ''
  const trimmed = basePath.trim().replace(/\/$/, '')
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function buildSectionPath(basePath: string, path: string): string {
  const normalizedBase = normalizeBasePath(basePath)
  if (!path || path === '/') {
    return normalizedBase || '/'
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

export function getSectionFromPath(pathname: string): AppSection {
  if (pathname.startsWith('/proceso')) return 'proceso'
  if (pathname.startsWith('/ventas')) return 'ventas'
  if (pathname.startsWith('/rrhh')) return 'rrhh'
  return 'legacy'
}

interface SectionPathProviderProps {
  basePath?: string
  children: ReactNode
}

export function SectionPathProvider({ basePath = '', children }: SectionPathProviderProps) {
  return createElement(SectionPathContext.Provider, { value: basePath }, children)
}

export function useSectionPath() {
  const basePath = useContext(SectionPathContext)

  return (path: string) => buildSectionPath(basePath, path)
}