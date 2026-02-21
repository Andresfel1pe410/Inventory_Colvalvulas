import { useState } from 'react'

interface CopyableCellProps {
  value: string
  maxWidth?: string
  truncate?: boolean
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function CopyableCell({ value, maxWidth = '200px', truncate = true }: CopyableCellProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback para navegadores antiguos
      const textArea = document.createElement('textarea')
      textArea.value = value
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const hasValue = Boolean(value?.trim())

  return (
    <div
      className={`group flex items-center gap-1.5 ${truncate ? 'min-w-0' : ''}`}
      style={truncate ? { maxWidth } : undefined}
    >
      <span
        className={`block flex-1 ${truncate ? 'truncate' : ''}`}
        title={value}
      >
        {value || '—'}
      </span>
      {hasValue && (
        <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 items-center justify-center rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
          title="Copiar"
        >
          {copied ? (
            <span className="flex items-center gap-1 text-green-600">
              <CheckIcon />
              <span className="text-xs">Copiado</span>
            </span>
          ) : (
            <CopyIcon />
          )}
        </button>
      )}
    </div>
  )
}
