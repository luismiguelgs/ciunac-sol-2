'use client'

import { useId } from 'react'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Field, FieldLabel, FieldContent, FieldDescription, FieldError } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'

type Props<T extends FieldValues> = {
  control: Control<T>
  name: Path<T>
  label: string
  description?: string
}

export default function SwithField<T extends FieldValues>({ control, name, label, description }: Props<T>) {
  const id = useId()
  const { field: { ref: fieldRef, ...field }, fieldState } = useController({ control, name })

  return (
    <Field data-invalid={fieldState.invalid} data-disabled={field.disabled} className="w-full rounded-lg border p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <FieldContent>
          <FieldLabel id={`${id}-label`} htmlFor={id}>{label}</FieldLabel>
          {description && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
        </FieldContent>
        <Switch
          id={id}
          name={field.name}
          checked={Boolean(field.value)}
          onCheckedChange={(checked: boolean) => field.onChange(checked)}
          onBlur={field.onBlur}
          ref={fieldRef}
          disabled={field.disabled}
          aria-labelledby={`${id}-label`}
          aria-invalid={fieldState.invalid}
          aria-describedby={[description && `${id}-description`, fieldState.error && `${id}-error`].filter(Boolean).join(' ') || undefined}
        />
      </div>
      {fieldState.error && <FieldError id={`${id}-error`} errors={[fieldState.error]} />}
    </Field>
  )
}
