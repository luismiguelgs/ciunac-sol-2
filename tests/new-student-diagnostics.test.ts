import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { ciunacRequest } from '@/modules/security/server/ciunac-client'
import { handleSecurityRoute } from '@/modules/security/server/responses'

vi.mock('@/modules/security/server/environment', () => ({
  getCiunacConfig: () => ({ apiUrl: 'https://backend.test', apiKey: 'private-test-key' }),
}))

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

async function rejected(response: Response, path = 'q10/estudiantes') {
  const fetcher = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetcher)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const result = await handleSecurityRoute('test.failed', async () => {
    await ciunacRequest(path, { method: 'POST', body: { Email: 'private@example.test' } })
    return NextResponse.json({ ok: true })
  })
  return { result, warn, error, fetcher }
}

describe('CA-SEG-010 / CA-AN-022: safe upstream rejection diagnostics', () => {
  it.each([400, 409, 422])('logs safe fields and the public correlation for HTTP %s without retrying', async (status) => {
    const { result, warn, fetcher } = await rejected(Response.json({
      code: 'Q10_ID_CONFLICT',
      message: ['Segundo_nombre must be a string', 'property tipoEstudiante should not exist',
        'Email private@example.test is not allowed', 'private@example.test is invalid'],
      email: 'private@example.test', authorization: 'private-test-key',
    }, { status }))
    expect(result.status).toBe(status)
    const body = await result.json()
    expect(body).toEqual({ ok: false, error: { code: 'UPSTREAM_ERROR', message: 'No se pudo completar la operacion solicitada.' }, correlationId: expect.any(String) })
    expect(warn).toHaveBeenCalledExactlyOnceWith(JSON.stringify({
      event: 'security.new-student.upstream.rejected', correlationId: body.correlationId,
      status, code: 'UPSTREAM_ERROR', upstreamCode: 'Q10_ID_CONFLICT',
      validationFields: ['Email', 'Segundo_nombre', 'tipoEstudiante'], detail: 'json',
    }))
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/private@example|private-test-key|must be a string/)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('reduces nested errors to known properties; never emits unknown codes or properties', async () => {
    const { warn } = await rejected(Response.json({ error: {
      code: 'private@example.test', errors: [{ property: 'facultadId', value: 'private-value',
        children: [{ property: 'private-field' }, { property: 'escuelaId' }] }],
    } }, { status: 400 }))
    expect(JSON.parse(warn.mock.calls[0][0])).toMatchObject({ upstreamCode: 'UNRECOGNIZED', validationFields: ['escuelaId', 'facultadId'] })
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private')
  })

  it.each(['<html>private-value</html>', ''])('preserves HTTP errors when the body is not JSON: %j', async (body) => {
    const { result, warn } = await rejected(new Response(body, { status: 400 }))
    expect(result.status).toBe(400)
    expect(JSON.parse(warn.mock.calls[0][0])).toMatchObject({ upstreamCode: null, validationFields: [], detail: 'unavailable' })
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-value')
  })

  it('cancels large bodies and preserves the error without logging the body', async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('private-value'.repeat(2000))) }, cancel,
    })
    const { result, warn } = await rejected(new Response(stream, { status: 422 }))
    expect(result.status).toBe(422)
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(JSON.parse(warn.mock.calls[0][0])).toMatchObject({ detail: 'too_large', validationFields: [] })
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-value')
  })

  it('does not turn body read failure into a different HTTP error', async () => {
    const stream = new ReadableStream({ start(controller) { controller.error(new Error('private-read-error')) } })
    const { result, warn } = await rejected(new Response(stream, { status: 400 }))
    expect(result.status).toBe(400)
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-read-error')
  })

  it('keeps unrelated 4xx and existing 5xx logging unchanged', async () => {
    const unrelated = await rejected(Response.json({ message: 'Email private-value' }, { status: 400 }), 'mailer')
    expect(unrelated.warn).not.toHaveBeenCalled()
    const upstream = await rejected(Response.json({ message: 'Email private-value' }, { status: 502 }))
    expect(upstream.result.status).toBe(503)
    expect(upstream.warn).not.toHaveBeenCalled()
    expect(upstream.error).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(upstream.error.mock.calls)).not.toContain('private-value')
  })
})
