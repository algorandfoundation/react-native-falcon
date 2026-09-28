// Shared Falcon-1024 implementation, aligned with `@algorandfoundation/falcon-wasm`.
//
// The public API (`FalconApi`, size constants and error classes) mirrors the
// WASM package so both libraries can be used interchangeably. Only the backend
// differs: here the operations are delegated to the native Nitro hybrid object.
import type { Falcon } from "./Falcon.nitro";

// Constants from deterministic.h and falcon.h
const FALCON_DET1024_LOGN = 10;

function falconPrivKeySize(logn: number): number {
  if (logn <= 3) {
    return (3 << logn) + 1;
  }
  return ((10 - (logn >> 1)) << (logn - 2)) + (1 << logn) + 1;
}

function falconPubKeySize(logn: number): number {
  if (logn <= 1) {
    return 4 + 1;
  }
  return (7 << (logn - 2)) + 1;
}

function falconSigCompressedMaxSize(logn: number): number {
  const value = (11 << logn) + (101 >> (10 - logn));
  return ((value + 7) >> 3) + 41;
}

export const FALCON_DET1024_PUBKEY_SIZE = falconPubKeySize(FALCON_DET1024_LOGN);
export const FALCON_DET1024_PRIVKEY_SIZE = falconPrivKeySize(FALCON_DET1024_LOGN);
export const FALCON_DET1024_SIG_COMPRESSED_MAXSIZE =
  falconSigCompressedMaxSize(FALCON_DET1024_LOGN) - 40 + 1;

class FalconError extends Error {
  constructor(context: number | string) {
    if (typeof context === "string") {
      super(context);
      return;
    }

    if (context === -1) {
      super("OS random number generator failure");
    } else if (context === -2) {
      super("buffer too small");
    } else if (context === -3) {
      super("invalid format");
    } else if (context === -4) {
      super("bad signature");
    } else if (context === -5) {
      super("bad argument");
    } else if (context === -6) {
      super("internal error");
    } else {
      super(`unknown error code ${context}`);
    }
  }
}

export class KeygenError extends FalconError {
  constructor(context: number | string) {
    super(context);
    this.name = "KeygenError";
  }
}

export class SigningError extends FalconError {
  constructor(context: number | string) {
    super(context);
    this.name = "SigningError";
  }
}

export class VerificationError extends FalconError {
  constructor(context: number | string) {
    super(context);
    this.name = "VerificationError";
  }
}

export interface FalconApi {
  generateKey(seed?: Uint8Array): {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  };
  signCompressed(privateKey: Uint8Array, message: Uint8Array): Uint8Array;
  verifyCompressed(publicKey: Uint8Array, signature: Uint8Array, message: Uint8Array): boolean;
}

/** Copies the bytes of a (possibly offset) Uint8Array view into a standalone ArrayBuffer. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

/** Copies a native ArrayBuffer into a JS-owned Uint8Array. */
function toUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer).slice();
}

/**
 * Runs a native call and maps native failures onto the given error class. The native layer
 * reports Falcon return codes as "... error code <n>", which are translated to the same
 * messages as the WASM package.
 */
function withNativeErrors<T>(
  ErrorClass: new (context: number | string) => FalconError,
  fn: () => T,
): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof FalconError) {
      throw e;
    }
    const message = e instanceof Error ? e.message : String(e);
    const code = /error code (-?\d+)/.exec(message);
    throw new ErrorClass(code?.[1] !== undefined ? Number(code[1]) : message);
  }
}

/**
 * Builds the public API bound to the native hybrid object.
 */
export function makeApi(native: Falcon): FalconApi {
  /**
   * Generates a Falcon public/private key pair from the given seed.
   * @param seed - Optional seed bytes. If not provided, the native system RNG is used.
   * @returns An object containing the publicKey and privateKey as Uint8Arrays.
   */
  function generateKey(seed?: Uint8Array): {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  } {
    return withNativeErrors(KeygenError, () => {
      const keyPair =
        seed && seed.length > 0 ? native.generateKey(toArrayBuffer(seed)) : native.generateKey();

      return {
        publicKey: toUint8Array(keyPair.publicKey),
        privateKey: toUint8Array(keyPair.privateKey),
      };
    });
  }

  /**
   * Signs a message with the given private key using compressed format.
   * @param privateKey - The private key (FALCON_DET1024_PRIVKEY_SIZE bytes).
   * @param message - The message to sign.
   * @returns The compressed signature as a Uint8Array.
   */
  function signCompressed(privateKey: Uint8Array, message: Uint8Array): Uint8Array {
    if (privateKey.length !== FALCON_DET1024_PRIVKEY_SIZE) {
      throw new SigningError(
        `Invalid private key length: ${privateKey.length}. Expected ${FALCON_DET1024_PRIVKEY_SIZE}.`,
      );
    }

    return withNativeErrors(SigningError, () =>
      toUint8Array(native.signCompressed(toArrayBuffer(privateKey), toArrayBuffer(message))),
    );
  }

  /**
   * Verifies a compressed signature against a message and public key.
   * @param publicKey - The public key (FALCON_DET1024_PUBKEY_SIZE bytes).
   * @param signature - The compressed signature.
   * @param message - The original message.
   * @returns true if the signature is valid.
   * @throws VerificationError if verification fails.
   */
  function verifyCompressed(
    publicKey: Uint8Array,
    signature: Uint8Array,
    message: Uint8Array,
  ): boolean {
    if (publicKey.length !== FALCON_DET1024_PUBKEY_SIZE) {
      throw new VerificationError(
        `Invalid public key length: ${publicKey.length}. Expected ${FALCON_DET1024_PUBKEY_SIZE}.`,
      );
    }

    if (signature.length === 0) {
      throw new VerificationError("Empty signature");
    }

    if (signature.length > FALCON_DET1024_SIG_COMPRESSED_MAXSIZE) {
      throw new VerificationError(
        `Invalid signature length: ${signature.length}. Maximum is ${FALCON_DET1024_SIG_COMPRESSED_MAXSIZE}.`,
      );
    }

    return withNativeErrors(VerificationError, () => {
      native.verify(toArrayBuffer(publicKey), toArrayBuffer(signature), toArrayBuffer(message));
      return true;
    });
  }

  return { generateKey, signCompressed, verifyCompressed };
}
