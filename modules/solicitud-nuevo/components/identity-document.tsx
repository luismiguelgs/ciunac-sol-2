'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileText, IdCard, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getFileViolation } from '@/modules/shared/domain/file-validation'
import { requestJson } from '@/modules/shared/infrastructure/http/browser-http'
import { identityDocumentSchema, identityFilePolicy, type IdentityDocument } from '../academic'
import type { NewStudentDocument } from '../model'

type Props = { document: NewStudentDocument; saved: IdentityDocument | null; onBack: () => void; onComplete: (data: IdentityDocument) => void }

export default function IdentityDocumentStep({ document, saved, onBack, onComplete }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const selectFile = (value: File | null) => {
    if (busy) return
    setPreview(null); setFile(null); setError('')
    if (!value) return
    const violation = getFileViolation({ name: value.name, size: value.size, mimeType: value.type }, identityFilePolicy)
    if (violation) {
      setError(violation === 'TOO_LARGE' ? 'El archivo supera los 8 MB. Elige uno más pequeño.'
        : violation === 'EMPTY' ? 'El archivo está vacío. Elige otro documento.'
          : 'Este formato no es válido. Elige un archivo PDF, JPG o PNG.')
      return
    }
    setFile(value)
    if (value.type.startsWith('image/')) setPreview(URL.createObjectURL(value))
  }

  const upload = async () => {
    if (busy) return
    if (!file && saved) { onComplete(saved); return }
    if (!file) return
    setBusy(true); setError('')
    try {
      const body = new FormData()
      body.set('file', file); body.set('documentType', document.type); body.set('documentNumber', document.number)
      const uploaded = identityDocumentSchema.parse(await requestJson('/api/solicitud-nuevo/documento', 'POST', body, 75000))
      if (uploaded.documentNumber !== document.number || uploaded.documentType !== document.type) throw new Error('El archivo no corresponde al documento indicado.')
      setPreview(null)
      onComplete(uploaded)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo subir el documento. Intenta de nuevo.') }
    finally { setBusy(false) }
  }

  const selectedName = file?.name ?? saved?.name
  return <section className="space-y-6" aria-labelledby={`${id}-title`}>
    <header className="flex items-start gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><IdCard aria-hidden="true" className="size-6" /></div>
      <div className="min-w-0 space-y-1">
        <h2 id={`${id}-title`} className="text-xl font-semibold sm:text-2xl">Documento de identidad</h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">Sube una cara de tu {document.type} en un solo archivo, con los datos claros y completos.</p>
        <p className="text-sm font-medium">{document.type}: {document.number}</p>
      </div>
    </header>

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card className="min-w-0 rounded-2xl">
        <CardContent className="space-y-4">
          <input ref={inputRef} id={`${id}-file`} type="file" className="sr-only" tabIndex={-1}
            aria-label="Archivo del documento" aria-describedby={`${id}-requirements${error ? ` ${id}-error` : ''}`}
            aria-invalid={Boolean(error)} accept=".pdf,.jpg,.jpeg,.png" disabled={busy}
            onChange={event => { selectFile(event.target.files?.[0] ?? null); event.target.value = '' }} />
          <div role="group" aria-label="Zona de carga del documento" className={`rounded-xl border-2 p-4 text-center transition-colors sm:p-6 ${dragging ? 'border-primary bg-primary/10' : selectedName ? 'border-border bg-muted/20' : 'border-dashed border-primary/30 bg-primary/5'}`}
            onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true) }}
            onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }}
            onDrop={event => {
              event.preventDefault(); setDragging(false)
              if (busy) return
              if (event.dataTransfer.files.length !== 1) { setError('Elige un solo archivo con una cara de tu documento.'); return }
              selectFile(event.dataTransfer.files[0])
            }}>
            {selectedName ? <div className="space-y-3">
              <CheckCircle2 aria-hidden="true" className="mx-auto size-9 text-primary" />
              <p className="text-base font-semibold">{file ? 'Archivo seleccionado' : 'Documento cargado'}</p>
              <p className="break-all text-sm font-medium">{selectedName}</p>
              {file && <p className="text-sm text-slate-600 dark:text-slate-300">{file.type === 'application/pdf' ? 'PDF' : 'Imagen'} · {file.size < 1024 * 1024 ? `${Math.max(1, Math.ceil(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}</p>}
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()} className="min-h-11 gap-2 px-3 text-sm"><RefreshCw aria-hidden="true" className="size-4" />Cambiar archivo</Button>
                {file && <Button type="button" variant="ghost" disabled={busy} onClick={() => selectFile(null)} className="min-h-11 gap-2 px-3 text-sm"><Trash2 aria-hidden="true" className="size-4" />Quitar archivo</Button>}
              </div>
            </div> : <div className="space-y-3">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-background text-primary shadow-sm"><Upload aria-hidden="true" className="size-7" /></div>
              <h3 className="text-lg font-semibold">Selecciona tu documento</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Puedes elegirlo desde tu dispositivo o arrastrarlo aquí.</p>
              <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()} className="min-h-12 w-full gap-2 bg-background px-4 text-sm sm:w-auto"><Upload aria-hidden="true" className="size-4" />Seleccionar archivo</Button>
              <p className="text-xs text-slate-600 dark:text-slate-300">PDF, JPG o PNG · Máximo 8 MB · Un solo archivo</p>
            </div>}
          </div>
          {preview && <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <h3 className="text-sm font-medium">Vista previa</h3>
            <Image unoptimized src={preview} width={640} height={400} alt="Vista previa del documento seleccionado" className="max-h-72 w-full rounded-lg object-contain" />
          </div>}
          {file?.type === 'application/pdf' && <p className="flex items-start gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300"><FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0" />Revisa que la cara de tu documento se vea completa y legible en el PDF antes de continuar.</p>}
          <p role="status" aria-atomic="true" className={busy ? 'text-center text-sm text-primary' : 'sr-only'}>
            {busy ? 'Estamos subiendo tu documento. Espera un momento.' : file ? 'Archivo listo para subir. Se enviará al continuar.' : saved ? `Documento cargado: ${saved.name}` : ''}
          </p>
          {error && <p id={`${id}-error`} role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
          {!busy && <p className="text-center text-xs text-slate-600 dark:text-slate-300">{file ? 'El archivo se enviará cuando selecciones «Subir documento y continuar».' : saved ? 'Puedes continuar con el documento ya cargado o cambiarlo.' : 'Primero selecciona un archivo para poder continuar.'}</p>}
        </CardContent>
      </Card>

      <aside className="min-w-0 space-y-4">
        <Card className="rounded-2xl">
          <CardContent className="space-y-4">
            <h3 id={`${id}-requirements`} className="text-base font-semibold">Antes de subirlo</h3>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-center" aria-hidden="true">
              <IdCard className="mx-auto size-7 text-primary" />
              <p className="text-xs text-slate-600 dark:text-slate-300">Una cara de tu documento</p>
            </div>
            <ul className="space-y-3 text-sm leading-relaxed">
              {['Solo necesitas una cara de tu documento.', 'Revisa que el texto y la foto se vean claros, sin reflejos ni partes cortadas.', 'Usa un PDF, JPG o PNG de hasta 8 MB.'].map(text => <li key={text} className="flex gap-2"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><span>{text}</span></li>)}
            </ul>
          </CardContent>
        </Card>
      </aside>
    </div>

    <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
      <Button type="button" variant="outline" disabled={busy} onClick={onBack} className="min-h-12 w-full gap-2 rounded-xl px-6 text-base font-semibold sm:w-auto sm:min-w-36"><ArrowLeft aria-hidden="true" className="size-4" />Anterior</Button>
      <Button type="button" disabled={busy || (!file && !saved)} aria-busy={busy} onClick={() => void upload()} className="min-h-12 w-full gap-2 whitespace-normal rounded-xl px-6 py-2 text-base font-semibold sm:w-auto sm:min-w-36">
        {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <ArrowRight aria-hidden="true" className="size-4" />}
        {busy ? 'Subiendo documento…' : saved && !file ? 'Continuar con documento cargado' : 'Subir documento y continuar'}
      </Button>
    </div>
  </section>
}
