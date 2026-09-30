'use client'

import { useId } from 'react'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props<T extends FieldValues, OptionType = unknown> = {
  control: Control<T>
  name: Path<T>
  label: string
  description?: string
  placeholder?: string
  disabled?: boolean
  options?: OptionType[]
  getOptionValue?: (item: OptionType) => string
  getOptionLabel?: (item: OptionType) => string
}

export function MySelect<T extends FieldValues, OptionType = unknown>({
  name, label, control, options = [], placeholder, disabled, description, getOptionValue, getOptionLabel,
}: Props<T, OptionType>) {
  const id = useId()
  const { field: { ref: fieldRef, ...field }, fieldState } = useController({ control, name, disabled })
  const items = options.map((item, index) => {
    const record = item as Record<string, unknown>
    return {
      value: getOptionValue ? getOptionValue(item) : String(record?.value ?? record?.id ?? index),
      label: getOptionLabel ? getOptionLabel(item) : String(record?.label ?? record?.nombre ?? item),
    }
  })

  return (
    <Field data-invalid={fieldState.invalid} data-disabled={field.disabled} className="min-h-[70px]">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select<string>
        name={field.name}
        items={items}
        value={field.value === '' || field.value == null ? null : String(field.value)}
        onValueChange={(value: unknown) => field.onChange(value ?? '')}
        disabled={field.disabled}
      >
        <SelectTrigger id={id} ref={fieldRef} onBlur={field.onBlur}
          aria-invalid={fieldState.invalid}
          aria-describedby={[description && `${id}-description`, fieldState.error && `${id}-error`].filter(Boolean).join(' ') || undefined}
          className="w-full overflow-hidden">
          <SelectValue placeholder={placeholder} className="text-ellipsis" />
        </SelectTrigger>
        <SelectContent className="w-full min-w-[300px]">
          {items.map((item) => <SelectItem key={item.value} value={item.value} className="py-2">{item.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {description && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
      {fieldState.error && <FieldError id={`${id}-error`} errors={[fieldState.error]} />}
    </Field>
  )
}
