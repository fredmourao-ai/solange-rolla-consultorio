import { EventEmitter } from 'node:events'
import type { ClientRequest, IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { describe, expect, it, vi } from 'vitest'
import { createNodeMtlsNfseTransport, type NodeMtlsNfseTransportOptions } from './node-mtls-nfse-transport'

vi.mock('node:https', () => ({ request: vi.fn() }))

const transportOptions = {
  cert: 'synthetic certificate',
  key: 'synthetic private key',
}

describe('Node mTLS National NFS-e transport', () => {
  it('rejects non-HTTPS endpoints before opening a socket', async () => {
    const transport = createNodeMtlsNfseTransport(transportOptions)
    await expect(transport({
      operation: 'status',
      method: 'GET',
      url: 'http://sefin.nfse.gov.br/SefinNacional/nfse/' + '1'.repeat(50),
    })).rejects.toThrow('NFSE_TRANSPORT_URL_INVALID')
  })

  it('rejects hosts outside the official nfse.gov.br boundary before opening a socket', async () => {
    const transport = createNodeMtlsNfseTransport(transportOptions)
    await expect(transport({
      operation: 'status',
      method: 'GET',
      url: 'https://example.test/nfse/' + '1'.repeat(50),
    })).rejects.toThrow('NFSE_TRANSPORT_HOST_NOT_ALLOWED')
  })

  it('validates the timeout policy at construction time', () => {
    expect(() => createNodeMtlsNfseTransport({
      ...transportOptions,
      timeoutMs: 500,
    })).toThrow('NFSE_TRANSPORT_TIMEOUT_INVALID')
  })

  it('accepts an in-memory PKCS12 bundle with a separate passphrase', async () => {
    const transport = createNodeMtlsNfseTransport({
      pfx: Buffer.from('synthetic encrypted PKCS12 test bundle'),
      passphrase: 'synthetic-test-passphrase',
    })
    await expect(transport({
      operation: 'status',
      method: 'GET',
      url: 'https://example.test/nfse/' + '1'.repeat(50),
    })).rejects.toThrow('NFSE_TRANSPORT_HOST_NOT_ALLOWED')
  })

  it('forwards the PKCS12 bundle and passphrase to the TLS request without PEM', async () => {
    const pfx = Buffer.from('synthetic encrypted PKCS12 test bundle')
    const passphrase = 'synthetic-test-passphrase'
    const mockRequest = vi.mocked(httpsRequest)
    mockRequest.mockImplementationOnce(((
      requestOptions: unknown,
      onResponse: (response: IncomingMessage) => void,
    ) => {
      const tlsOptions = requestOptions as Record<string, unknown>
      expect(tlsOptions.pfx).toBe(pfx)
      expect(tlsOptions.passphrase).toBe(passphrase)
      expect(tlsOptions.cert).toBeUndefined()
      expect(tlsOptions.key).toBeUndefined()
      expect(tlsOptions.rejectUnauthorized).toBe(true)
      expect(tlsOptions.hostname).toBe('sefin.producaorestrita.nfse.gov.br')

      return {
        setTimeout: vi.fn(),
        on: vi.fn(),
        end: () => {
          const response = new EventEmitter() as IncomingMessage
          response.statusCode = 200
          onResponse(response)
          response.emit('end')
        },
      } as unknown as ClientRequest
    }) as typeof httpsRequest)

    const transport = createNodeMtlsNfseTransport({ pfx, passphrase })
    await expect(transport({
      operation: 'status',
      method: 'GET',
      url: 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/docs/index',
    })).resolves.toEqual({ status: 200, body: null })
    expect(mockRequest).toHaveBeenCalledTimes(1)
    mockRequest.mockClear()
  })

  it('fails closed if neither PEM nor PKCS12 identity is supplied', () => {
    expect(() => createNodeMtlsNfseTransport(
      {} as NodeMtlsNfseTransportOptions,
    )).toThrow('NFSE_TRANSPORT_CERTIFICATE_CONFIGURATION_INVALID')
  })

  it('fails closed if a PKCS12 bundle is empty', () => {
    expect(() => createNodeMtlsNfseTransport({ pfx: Buffer.alloc(0) }))
      .toThrow('NFSE_TRANSPORT_CERTIFICATE_CONFIGURATION_INVALID')
  })

  it('fails closed if PKCS12 and PEM identities are combined', () => {
    expect(() => createNodeMtlsNfseTransport({
      ...transportOptions,
      pfx: Buffer.from('synthetic pfx'),
    } as NodeMtlsNfseTransportOptions))
      .toThrow('NFSE_TRANSPORT_CERTIFICATE_CONFIGURATION_INVALID')
  })

  it('fails closed if only one PEM element is supplied', () => {
    expect(() => createNodeMtlsNfseTransport({
      cert: transportOptions.cert,
    } as NodeMtlsNfseTransportOptions))
      .toThrow('NFSE_TRANSPORT_CERTIFICATE_CONFIGURATION_INVALID')
  })
})
