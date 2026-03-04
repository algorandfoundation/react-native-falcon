import type { HybridObject } from 'react-native-nitro-modules';

export interface KeyPair {
  publicKey: ArrayBuffer;
  privateKey: ArrayBuffer;
}

export interface Falcon extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  // Constants
  readonly publicKeySize: number;
  readonly privateKeySize: number;
  readonly currentSaltVersion: number;
  readonly ctSignatureSize: number;
  readonly signatureMaxSize: number;
  readonly n: number;

  // Methods
  generateKey(seed?: ArrayBuffer): KeyPair;
  signCompressed(privateKey: ArrayBuffer, msg: ArrayBuffer): ArrayBuffer;
  convertToCT(signature: ArrayBuffer): ArrayBuffer;
  verify(
    publicKey: ArrayBuffer,
    signature: ArrayBuffer,
    msg: ArrayBuffer
  ): void;
  verifyCTSignature(
    publicKey: ArrayBuffer,
    signature: ArrayBuffer,
    msg: ArrayBuffer
  ): void;
  getSaltVersion(signature: ArrayBuffer): number;
  getPublicKeyCoefficients(publicKey: ArrayBuffer): number[];
  getS2Coefficients(signature: ArrayBuffer): number[];
  getS1Coefficients(h: number[], c: number[], s2: number[]): number[];
  hashToPointCoefficients(msg: ArrayBuffer, saltVersion: number): number[];
}
