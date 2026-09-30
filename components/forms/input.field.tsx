'use client'

import { useCallback, useId, type InputHTMLAttributes, type RefObject } from 'react'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Mail, Phone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'
import { cn } from '@/lib/utils'

interface Props<T extends FieldValues> extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name: Path<T>
  type?: 'text' | 'email' | 'password' | 'number' | 'tel'
  control: Control<T>
  inputRef?: RefObject<HTMLInputElement | null>
  label?: string
  description?: string
}

export default function InputField<T extends FieldValues>({
  control, name, type = 'text', disabled, inputRef, label, description,
  placeholder, id, className, onChange, onBlur, ...inputProps
}: Props<T>) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const { field: { ref: fieldRef, ...field }, fieldState } = useController({ control, name, disabled })
  const mergedRef = useCallback((node: HTMLInputElement | null) => {
    fieldRef(node)
    if (inputRef) inputRef.current = node
  }, [fieldRef, inputRef])
  const Icon = type === 'email' ? Mail : type === 'tel' ? Phone : null
  const displayLabel = label ?? (type === 'email' ? 'Correo Electrónico' : type === 'tel' ? 'Teléfono' : undefined)
  const displayPlaceholder = placeholder ?? (type === 'email' ? 'Ingrese su correo electrónico...' : type === 'tel' ? 'Ingrese su teléfono celular...' : undefined)
  const describedBy = [inputProps['aria-describedby'], description && `${inputId}-description`, fieldState.error && `${inputId}-error`].filter(Boolean).join(' ') || undefined

  return (
    <Field data-invalid={fieldState.invalid} data-disabled={field.disabled} className="min-h-[70px]">
      {displayLabel && <FieldLabel htmlFor={inputId}>{displayLabel}</FieldLabel>}
      <div className="relative">
        {Icon && <Icon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
        <Input
          {...inputProps}
          {...field}
          id={inputId}
          value={field.value ?? ''}
          type={type}
          placeholder={displayPlaceholder}
          ref={mergedRef}
          className={cn(Icon && 'pl-10', className)}
          aria-invalid={fieldState.invalid || inputProps['aria-invalid']}
          aria-describedby={describedBy}
          onChange={(event) => { field.onChange(event); onChange?.(event) }}
          onBlur={(event) => { field.onBlur(); onBlur?.(event) }}
        />
      </div>
      {description && <FieldDescription id={`${inputId}-description`}>{description}</FieldDescription>}
      {fieldState.error && <FieldError id={`${inputId}-error`} errors={[fieldState.error]} />}
    </Field>
  )
}
