import * as React from 'react'
import { Check, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt.code}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary"
              >
                {opt.code}
                <X
                  className="size-3 cursor-pointer hover:text-destructive"
                  onClick={(e) => removeOption(opt.code, e)}
                />
              </span>
            ))
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center gap-2 border-b px-2 pb-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索币种..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">未找到币种</p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.code)
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => toggleOption(opt.code)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus:bg-accent focus:text-accent-foreground focus:outline-none'
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-4 items-center justify-center rounded-sm border',
                        isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                      )}
                    >
                      {isSelected && <Check className="size-3" />}
                    </span>
                    <span className="flex-1 text-left">
                      <span className="font-medium">{opt.code}</span>
                      <span className="ml-2 text-muted-foreground">{opt.name}</span>
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
