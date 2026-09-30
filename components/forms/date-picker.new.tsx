'use client'

import { useEffect, useId, useRef, useState, type ComponentProps } from 'react'
import { format, getMonth, getYear, isValid, setMonth, setYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DatePickerProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  description?: string
  startYear?: number
  endYear?: number
  disabled?: boolean
}

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const monthItems = months.map((label) => ({ value: label, label }))

function DatePickerDayButton(props: ComponentProps<typeof CalendarDayButton>) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (props.modifiers.focused) ref.current?.focus()
  }, [props.modifiers.focused])

  // CalendarDayButton forwards props but does not attach its own focus ref.
  const buttonProps = { ...props, ref }
  return <CalendarDayButton {...buttonProps} locale={es} />
}

export function DatePicker<T extends FieldValues>({
  control, name, label, description, disabled,
  startYear = getYear(new Date()) - 80,
  endYear = getYear(new Date()),
}: DatePickerProps<T>) {
  const id = useId()
  const { field: { ref: fieldRef, ...field }, fieldState } = useController({ control, name, disabled })
  const value: unknown = field.value
  const selectedDate = value instanceof Date && isValid(value) ? value : undefined
  const [currentMonth, setCurrentMonth] = useState<Date>(() => selectedDate ?? new Date())
  const [open, setOpen] = useState(false)
  const years = Array.from({ length: Math.max(0, endYear - startYear + 1) }, (_, index) => String(startYear + index))
  const describedBy = [description && `${id}-description`, fieldState.error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <Field data-invalid={fieldState.invalid} data-disabled={field.disabled} className="mt-2 min-h-[70px]">
      <FieldLabel id={`${id}-label`} htmlFor={id}>{label}</FieldLabel>
      <Popover
        open={open && !field.disabled}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (nextOpen) setCurrentMonth(selectedDate ?? new Date())
          else field.onBlur()
        }}
      >
        <PopoverTrigger
          id={id}
          ref={fieldRef}
          disabled={field.disabled}
          onBlur={() => { if (!open) field.onBlur() }}
          aria-labelledby={`${id}-label ${id}-value`}
          aria-invalid={fieldState.invalid}
          aria-describedby={describedBy}
          render={<Button type="button" variant="outline"
            className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')} />}
        >
          <CalendarIcon aria-hidden="true" className="mr-2 h-4 w-4" />
          <span id={`${id}-value`}>{selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Seleccionar fecha'}</span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" aria-labelledby={`${id}-label`}>
          <div className="flex justify-between gap-2 p-2">
            <Select<string>
              items={monthItems}
              value={months[getMonth(currentMonth)]}
              onValueChange={(month) => {
                if (month == null) return
                const monthIndex = months.indexOf(month)
                if (monthIndex < 0) return
                const nextDate = setMonth(selectedDate ?? currentMonth, monthIndex)
                setCurrentMonth(nextDate)
                field.onChange(nextDate)
              }}
            >
              <SelectTrigger aria-label="Mes" className="w-[110px]"><SelectValue placeholder="Mes" /></SelectTrigger>
              <SelectContent>
                {months.map((month) => <SelectItem key={month} value={month}>{month}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select<string>
              items={years.map((year) => ({ value: year, label: year }))}
              value={String(getYear(currentMonth))}
              onValueChange={(year) => {
                if (year == null || !years.includes(year)) return
                const nextDate = setYear(selectedDate ?? currentMonth, Number(year))
                setCurrentMonth(nextDate)
                field.onChange(nextDate)
              }}
            >
              <SelectTrigger aria-label="Año" className="w-[110px]"><SelectValue placeholder="Año" /></SelectTrigger>
              <SelectContent>
                {years.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Calendar
            components={{ DayButton: DatePickerDayButton }}
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) setCurrentMonth(date)
              field.onChange(date ?? null)
            }}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            autoFocus
            locale={es}
          />
        </PopoverContent>
      </Popover>
      {description && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
      {fieldState.error && <FieldError id={`${id}-error`} errors={[fieldState.error]} />}
    </Field>
  )
}
