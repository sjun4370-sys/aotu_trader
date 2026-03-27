import * as React from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './multi-select.module.css'

export interface CurrencyOption {
  code: string
  name: string
}

interface MultiSelectProps {
  options: CurrencyOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({ options, value, onChange, placeholder = '选择...', className }: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selectedOptions = options.filter((opt) => value.includes(opt.code))
  const filteredOptions = options.filter(
    (opt) =>
      opt.code.toLowerCase().includes(search.toLowerCase()) ||
      opt.name.toLowerCase().includes(search.toLowerCase())
  )

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const toggleOption = (code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((v) => v !== code))
    } else {
      onChange([...value, code])
    }
  }

  const removeOption = (code: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((v) => v !== code))
  }

  return (
    <div ref={containerRef} className={cn(styles.container, className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={styles.trigger}
      >
        <div className={styles.tags}>
          {selectedOptions.length === 0 ? (
            <span className={styles.placeholder}>{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <span key={opt.code} className={styles.tag}>
                {opt.code}
                <X
                  className={styles.tagRemove}
                  onClick={(e) => removeOption(opt.code, e)}
                />
              </span>
            ))
          )}
        </div>
        <ChevronDown className={cn(styles.chevron, isOpen && styles.chevronOpen)} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索币种..."
              className={styles.searchInput}
            />
          </div>
          <div className={styles.list}>
            {filteredOptions.length === 0 ? (
              <p className={styles.empty}>未找到币种</p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.code)
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => toggleOption(opt.code)}
                    className={styles.option}
                  >
                    <span className={cn(styles.checkbox, isSelected && styles.checkboxSelected)}>
                      {isSelected && <Check className={styles.checkIcon} />}
                    </span>
                    <span className={styles.optionText}>
                      <span className={styles.optionCode}>{opt.code}</span>
                      <span className={styles.optionName}>{opt.name}</span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
