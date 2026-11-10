'use client'

import React from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMask } from '@react-input/mask'
import { StepperControl } from '@/components/stepper'
import InputField from '@/components/forms/input.field'
import { RadioGroupField } from '@/components/forms/radio-group.field'
import { DatePicker } from '@/components/forms/date-picker.new'
import type { NewStudentBasicData, NewStudentProgramOption } from '../model'
import { basicInfoSchema, basicNameMaxLength, type IBasicInfoSchema } from './basic-info.schema'
import { toBasicInfoFormValues } from './new-student-form.mapper'
import ProgramSelect from './program-select'

type Props = {
  programs: NewStudentProgramOption[]
  defaultData: NewStudentBasicData | null
  activeStep: number
  steps: string[]
  setActiveStep: React.Dispatch<React.SetStateAction<number>>
  handleNext: (values: IBasicInfoSchema) => void
}

export default function BasicData({ programs, defaultData, activeStep, steps, setActiveStep, handleNext }: Props) {
  const form = useForm<IBasicInfoSchema>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: toBasicInfoFormValues(defaultData),
  })
  const phoneRef = useMask({ mask: '_________', replacement: { _: /\d/ } })
  const documentType = useWatch({ control: form.control, name: 'document_type' })
  const documentMaxLength = documentType === 'DNI' ? 8 : 9
  const documentRef = useMask({ mask: '_'.repeat(documentMaxLength), replacement: { _: documentType === 'DNI' ? /\d/ : /[A-Za-z0-9]/ } })
  const nameMask = { mask: '_'.repeat(basicNameMaxLength), replacement: { _: /[a-zA-Z\u0027 \u00C0-\u00FF]/ } }
  const firstLastnameRef = useMask(nameMask)
  const secondLastnameRef = useMask(nameMask)
  const firstNameRef = useMask(nameMask)
  const secondNameRef = useMask(nameMask)

  return (
    <form noValidate onSubmit={form.handleSubmit(handleNext)} className="p-4" autoComplete="off">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <InputField label="Primer Apellido" name="firstLastname" inputRef={firstLastnameRef} maxLength={basicNameMaxLength} placeholder="Ingresar primer apellido..." control={form.control} />
        <InputField label="Segundo Apellido" name="secondLastname" inputRef={secondLastnameRef} maxLength={basicNameMaxLength} placeholder="Ingresar segundo apellido..." control={form.control} />
        <InputField label="Primer Nombre" name="firstName" inputRef={firstNameRef} maxLength={basicNameMaxLength} placeholder="Ingresar primer nombre..." control={form.control} />
        <InputField label="Segundo Nombre" name="secondName" inputRef={secondNameRef} maxLength={basicNameMaxLength} placeholder="Ingresar segundo nombre..." control={form.control} />
        <DatePicker control={form.control} name="birth_date" label="Fecha de Nacimiento" description="Seleccione su fecha de nacimiento" />
        <InputField name="phone" inputRef={phoneRef} maxLength={9} type="tel" control={form.control} description="" />
        <ProgramSelect control={form.control} programs={programs} />
        <RadioGroupField
          label="Tipo de Documento"
          name="document_type"
          options={[
            { value: 'DNI', label: 'Documento de Identidad' },
            { value: 'CE', label: 'Carnet de Extranjería' },
          ]}
          control={form.control}
        />
        <InputField
          label="Número de Documento"
          name="document"
          inputRef={documentRef}
          maxLength={documentMaxLength}
          placeholder="Ingresar número de documento..."
          control={form.control}
          className="uppercase"
        />
        <RadioGroupField
          label="Género"
          name="gender"
          options={[
            { value: 'F', label: 'Femenino' },
            { value: 'M', label: 'Masculino' },
          ]}
          control={form.control}
        />
      </div>
      <StepperControl size="lg" activeStep={activeStep} steps={steps} setActiveStep={setActiveStep} type="submit" />
    </form>
  )
}
