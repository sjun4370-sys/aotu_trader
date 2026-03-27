import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './status-select.module.css'

interface StatusOption {
  value: 'enabled' | 'disabled'
  label: string
  color: string
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'enabled', label: '启用', color: '#22c55e' },
  { value: 'disabled', label: '停用', color: '#94a3b8' },
]

interface StatusSelectProps {
  value: 'enabled' | 'disabled'
  onChange: (value: 'enabled' | 'disabled') => void
}

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = STATUS_OPTIONS.find((opt) => opt.value === value) ?? STATUS_OPTIONS[0]

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={styles.trigger}
      >
        <span className={styles.dot} style={{ backgroundColor: selectedOption.color }} />
        <span className={styles.label}>{selectedOption.label}</span>
        <ChevronDown className={cn(styles.chevron, isOpen && styles.chevronOpen)} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {STATUS_OPTIONS.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(styles.option, isSelected && styles.optionSelected)}
              >
                <span className={styles.dot} style={{ backgroundColor: option.color }} />
                <span className={styles.optionLabel}>{option.label}</span>
                {isSelected && <Check className={styles.check} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
