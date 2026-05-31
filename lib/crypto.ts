/**
 * Client-side E2E crypto utilities.
 * Ported 1:1 from the original AION design so it stays compatible with
 * messages already stored in Firebase: PBKDF2 (250k, SHA-256) -> AES-256-GCM.
 * The backend NEVER sees plaintext — all encrypt/decrypt happens here.
 */

function utf8ToArrayBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer)
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function generateRandomBytes(length: number): ArrayBuffer {
  const buffer = new Uint8Array(length)
  crypto.getRandomValues(buffer)
  return buffer.buffer
}

export async function deriveKeyPBKDF2(
  password: string,
  salt: ArrayBuffer,
  iterations = 250000,
): Promise<CryptoKey> {
  const passwordBuffer = utf8ToArrayBuffer(password)
  const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptedPayload {
  ciphertext: string
  iv: string
}

export async function aesGcmEncrypt(key: CryptoKey, data: unknown): Promise<EncryptedPayload> {
  const plaintext = typeof data === 'string' ? data : JSON.stringify(data)
  const plaintextBuffer = utf8ToArrayBuffer(plaintext)
  const iv = generateRandomBytes(12)
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    plaintextBuffer,
  )
  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv),
  }
}

export async function aesGcmDecrypt<T = string>(
  key: CryptoKey,
  ciphertext: string,
  iv: string,
  parseJSON = false,
): Promise<T> {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext)
  const ivBuffer = base64ToArrayBuffer(iv)
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer, tagLength: 128 },
    key,
    ciphertextBuffer,
  )
  const plaintext = arrayBufferToUtf8(plaintextBuffer)
  if (parseJSON) {
    try {
      return JSON.parse(plaintext) as T
    } catch {
      return plaintext as unknown as T
    }
  }
  return plaintext as unknown as T
}
