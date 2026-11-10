'use client'

import { useId } from 'react'
import { useController, type Control } from 'react-hook-form'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getIconByCode } from '@/components/icons/flags'
import type { NewStudentProgramOption } from '../model'
import type { IBasicInfoSchema } from './basic-info.schema'

type Props = {
  control: Control<IBasicInfoSchema>
  programs: NewStudentProgramOption[]
}

export default function ProgramSelect({ control, programs }: Props) {
  const id = useId()
  const { field, fieldState } = useController({ control, name: 'code_program' })
  const items = programs.map((program) => ({ value: program.code, label: program.name }))

  return (
    <Field data-invalid={fieldState.invalid} data-disabled={field.disabled} className="min-h-[70px]">
      <FieldLabel htmlFor={id}>Programa</FieldLabel>
      <Select<string>
        name={field.name}
        items={items}
        value={field.value === '' || field.value == null ? null : field.value}
        onValueChange={(value: string | null) => field.onChange(value ?? '')}
        disabled={field.disabled}
      >
        <SelectTrigger
          id={id}
          ref={field.ref}
          onBlur={field.onBlur}
          aria-invalid={fieldState.invalid}
          aria-describedby={[`${id}-description`, fieldState.error && `${id}-error`].filter(Boolean).join(' ')}
          className="w-full"
        >
          <SelectValue placeholder="Selecciona un programa" />
        </SelectTrigger>
        <SelectContent className="w-full min-w-[300px]">
          {programs.map((program) => (
            <SelectItem key={program.code} value={program.code} className="py-2">
              <div className="flex w-full items-center gap-3 pl-0.5">
                <div className="flex h-7 w-7 flex-shrink-0 origin-center scale-150 items-center justify-center">
                  {getIconByCode(program.code)}
                </div>
                <span className="flex-1">{program.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription id={`${id}-description`}>Selecciona el idioma o programa.</FieldDescription>
      {fieldState.error && <FieldError id={`${id}-error`} errors={[fieldState.error]} />}
    </Field>
  )
}
