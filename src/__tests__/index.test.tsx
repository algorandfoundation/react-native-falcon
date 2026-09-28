import { NitroModules } from "react-native-nitro-modules";
import { TextEncoder } from "node:util";
import {
  falcon1024,
  FALCON_DET1024_PRIVKEY_SIZE,
  FALCON_DET1024_PUBKEY_SIZE,
  FALCON_DET1024_SIG_COMPRESSED_MAXSIZE,
  KeygenError,
  SigningError,
  VerificationError,
} from "../index";

const native = (NitroModules.createHybridObject as jest.Mock).mock.results[0]?.value;
const msg = new TextEncoder().encode("test message");

describe("constants", () => {
  it("should match the Falcon-1024 sizes from deterministic.h", () => {
    expect(FALCON_DET1024_PUBKEY_SIZE).toBe(1793);
    expect(FALCON_DET1024_PRIVKEY_SIZE).toBe(2305);
    expect(FALCON_DET1024_SIG_COMPRESSED_MAXSIZE).toBe(1423);
  });
});

describe("falcon1024", () => {
  it("should generate a keypair as Uint8Arrays", () => {
    const { publicKey, privateKey } = falcon1024.generateKey();
    expect(publicKey).toBeInstanceOf(Uint8Array);
    expect(privateKey).toBeInstanceOf(Uint8Array);
    expect(publicKey.length).toBe(FALCON_DET1024_PUBKEY_SIZE);
    expect(privateKey.length).toBe(FALCON_DET1024_PRIVKEY_SIZE);
  });

  it("should use the native RNG when no seed is provided", () => {
    native.generateKey.mockClear();
    falcon1024.generateKey();
    falcon1024.generateKey(new Uint8Array(0));
    expect(native.generateKey).toHaveBeenNthCalledWith(1);
    expect(native.generateKey).toHaveBeenNthCalledWith(2);
  });

  it("should pass only the seed view bytes to the native module", () => {
    native.generateKey.mockClear();
    const backing = new Uint8Array([0, 1, 2, 3, 4, 5]);
    falcon1024.generateKey(backing.subarray(2, 5));
    const seed = native.generateKey.mock.calls[0][0] as ArrayBuffer;
    expect(Array.from(new Uint8Array(seed))).toEqual([2, 3, 4]);
  });

  it("should wrap native keygen failures in KeygenError", () => {
    native.generateKey.mockImplementationOnce(() => {
      throw new Error("Falcon keygen failed with error code -1");
    });
    expect(() => falcon1024.generateKey()).toThrow(
      new KeygenError("OS random number generator failure"),
    );
  });

  it("should sign and verify a message", () => {
    const { publicKey, privateKey } = falcon1024.generateKey();
    const sig = falcon1024.signCompressed(privateKey, msg);
    expect(sig).toBeInstanceOf(Uint8Array);
    expect(sig.length).toBeGreaterThan(0);
    expect(falcon1024.verifyCompressed(publicKey, sig, msg)).toBe(true);
  });

  it("should throw VerificationError with a wrong message", () => {
    const { publicKey, privateKey } = falcon1024.generateKey();
    const sig = falcon1024.signCompressed(privateKey, msg);
    const wrongMsg = new TextEncoder().encode("wrong message");

    let error: unknown;
    try {
      falcon1024.verifyCompressed(publicKey, sig, wrongMsg);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(VerificationError);
    expect((error as Error).name).toBe("VerificationError");
    expect((error as Error).message).toBe("bad signature");
  });

  it("should reject a private key with an invalid length", () => {
    expect(() => falcon1024.signCompressed(new Uint8Array(10), msg)).toThrow(SigningError);
  });

  it("should reject a public key with an invalid length", () => {
    expect(() => falcon1024.verifyCompressed(new Uint8Array(10), new Uint8Array(10), msg)).toThrow(
      VerificationError,
    );
  });

  it("should reject empty and oversized signatures", () => {
    const publicKey = new Uint8Array(FALCON_DET1024_PUBKEY_SIZE);
    expect(() => falcon1024.verifyCompressed(publicKey, new Uint8Array(0), msg)).toThrow(
      new VerificationError("Empty signature"),
    );
    expect(() =>
      falcon1024.verifyCompressed(
        publicKey,
        new Uint8Array(FALCON_DET1024_SIG_COMPRESSED_MAXSIZE + 1),
        msg,
      ),
    ).toThrow(VerificationError);
  });
});
