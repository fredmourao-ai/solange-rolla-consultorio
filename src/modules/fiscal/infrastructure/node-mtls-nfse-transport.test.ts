import { describe, expect, it } from 'vitest'
import { createNodeMtlsNfseTransport, type NodeMtlsNfseTransportOptions } from './node-mtls-nfse-transport'

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
