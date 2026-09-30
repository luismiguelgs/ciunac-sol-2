'use client'

import { useId, type FocusEvent } from 'react'
import { useController, type Control, type FieldValues, type Path, type PathValue } from 'react-hook-form'
import { Field, FieldLabel, FieldError, FieldSet, FieldLegend } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

type Props<T extends FieldValues> = {
  control: Control<T>
  options: { value: string; label: string }[]
  label: string
  name: Path<T>
}

export function RadioGroupField<T extends FieldValues>({ control, label, name, options }: Props<T>) {
  const id = useId()
  const { field: { ref: fieldRef, ...field }, fieldState } = useController({
    control,
    name,
    defaultValue: (options[0]?.value ?? '') as PathValue<T, Path<T>>,
  })
  const focusIndex = Math.max(0, options.findIndex((option) => option.value === field.value))

  return (
    <FieldSet data-invalid={fieldState.invalid} disabled={field.disabled}>
      <FieldLegend id={`${id}-label`} variant="label">{label}</FieldLegend>
      <RadioGroup
        name={field.name}
        value={field.value ?? ''}
        onValueChange={(value: string) => field.onChange(value)}
        disabled={field.disabled}
        onBlur={(event: FocusEvent<HTMLDivElement>) => {
          if (!event.currentTarget.contains(event.relatedTarget)) field.onBlur()
        }}
        aria-labelledby={`${id}-label`}
        aria-invalid={fieldState.invalid}
        aria-describedby={fieldState.error ? `${id}-error` : undefined}
        className="flex flex-col gap-2"
      >
        {options.map((option, index) => (
          <Field key={option.value} orientation="horizontal" data-invalid={fieldState.invalid}>
            <RadioGroupItem id={`${id}-${index}`} value={option.value}
              ref={index === focusIndex ? fieldRef : undefined}
              aria-invalid={fieldState.invalid} />
            <FieldLabel htmlFor={`${id}-${index}`} className="font-normal">{option.label}</FieldLabel>
          </Field>
        ))}
      </RadioGroup>
      {fieldState.error && <FieldError id={`${id}-error`} errors={[fieldState.error]} />}
    </FieldSet>
  )
}
