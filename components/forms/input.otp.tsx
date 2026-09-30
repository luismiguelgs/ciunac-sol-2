'use client'

import { useId } from 'react'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

type Props<T extends FieldValues> = {
  name: Path<T>
  control: Control<T>
  label: string
  description?: string
  disabled?: boolean
}

export default function MyInputOpt<T extends FieldValues>({ control, label, description, name, disabled }: Props<T>) {
  const id = useId()
  const { field: { ref: fieldRef, ...field }, fieldState } = useController({ control, name, disabled })

  return (
    <Field data-invalid={fieldState.invalid} data-disabled={field.disabled} className="w-full">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputOTP
        {...field}
        ref={fieldRef}
        id={id}
        maxLength={6}
        value={field.value ?? ''}
        aria-invalid={fieldState.invalid}
        aria-describedby={[description && `${id}-description`, fieldState.error && `${id}-error`].filter(Boolean).join(' ') || undefined}
      >
        <InputOTPGroup>
          {Array.from({ length: 6 }, (_, index) => (
            <InputOTPSlot key={index} index={index} aria-invalid={fieldState.invalid} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {description && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
      {fieldState.error && <FieldError id={`${id}-error`} errors={[fieldState.error]} />}
    </Field>
  )
}
