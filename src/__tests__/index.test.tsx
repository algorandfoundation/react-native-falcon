import { NitroModules } from "react-native-nitro-modules";
import { TextEncoder } from "node:util";
import {
  falcon1024,
  FALCON_DET1024_PRIVKEY_SIZE,
  FALCON_DET1024_PUBKEY_SIZE,
  FALCON_DET1024_SIG_COMPRESSED_MAXSIZE,
  FALCON_DET1024_SIG_COMPRESSED_HEADER,
  FALCON1024_SIG_COMPRESSED_MAXSIZE,
  FALCON1024_SIG_COMPRESSED_HEADER,
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

  it("should match the randomized Falcon-1024 sizes and headers from falcon.h", () => {
    expect(FALCON1024_SIG_COMPRESSED_MAXSIZE).toBe(1462);
    expect(FALCON1024_SIG_COMPRESSED_HEADER).toBe(0x3a);
    expect(FALCON_DET1024_SIG_COMPRESSED_HEADER).toBe(0xba);
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

describe("falcon1024 randomized", () => {
  const { publicKey, privateKey } = falcon1024.generateKey();

  it("should sign deterministically by default", () => {
    native.signCompressed.mockClear();
    native.signCompressedRandomized.mockClear();
    falcon1024.signCompressed(privateKey, msg);
    falcon1024.signCompressed(privateKey, msg, false);
    expect(native.signCompressed).toHaveBeenCalledTimes(2);
    expect(native.signCompressedRandomized).not.toHaveBeenCalled();
  });

  it("should sign and verify a randomized message", () => {
    native.signCompressedRandomized.mockClear();
    const sig = falcon1024.signCompressed(privateKey, msg, true);
    expect(sig).toBeInstanceOf(Uint8Array);
    expect(sig[0]).toBe(FALCON1024_SIG_COMPRESSED_HEADER);
    expect(native.signCompressedRandomized).toHaveBeenCalledTimes(1);
    expect(falcon1024.verifyCompressed(publicKey, sig, msg)).toBe(true);
  });

  it("should reject a private key with an invalid length", () => {
    expect(() => falcon1024.signCompressed(new Uint8Array(10), msg, true)).toThrow(SigningError);
  });

  it("should wrap native signing failures in SigningError", () => {
    native.signCompressedRandomized.mockImplementationOnce(() => {
      throw new Error("Falcon sign failed with error code -1");
    });
    expect(() => falcon1024.signCompressed(privateKey, msg, true)).toThrow(
      new SigningError("OS random number generator failure"),
    );
  });

  it("should throw VerificationError with a wrong message", () => {
    const sig = falcon1024.signCompressed(privateKey, msg, true);
    const wrongMsg = new TextEncoder().encode("wrong message");
    expect(() => falcon1024.verifyCompressed(publicKey, sig, wrongMsg)).toThrow(
      new VerificationError("bad signature"),
    );
  });

  it("should accept randomized signatures larger than the deterministic maximum", () => {
    native.verifyRandomized.mockClear();
    const sig = new Uint8Array(FALCON1024_SIG_COMPRESSED_MAXSIZE);
    sig[0] = FALCON1024_SIG_COMPRESSED_HEADER;
    expect(falcon1024.verifyCompressed(publicKey, sig, msg)).toBe(true);
    expect(native.verifyRandomized).toHaveBeenCalledTimes(1);
  });

  it("should reject oversized signatures for each mode", () => {
    const randomized = new Uint8Array(FALCON1024_SIG_COMPRESSED_MAXSIZE + 1);
    randomized[0] = FALCON1024_SIG_COMPRESSED_HEADER;
    expect(() => falcon1024.verifyCompressed(publicKey, randomized, msg)).toThrow(
      VerificationError,
    );
    const deterministic = new Uint8Array(FALCON_DET1024_SIG_COMPRESSED_MAXSIZE + 1);
    deterministic[0] = FALCON_DET1024_SIG_COMPRESSED_HEADER;
    expect(() => falcon1024.verifyCompressed(publicKey, deterministic, msg)).toThrow(
      VerificationError,
    );
  });
});

describe("falcon1024 verifyCompressed header dispatch", () => {
  const { publicKey, privateKey } = falcon1024.generateKey();

  it("should dispatch deterministic signatures to the deterministic verifier", () => {
    native.verify.mockClear();
    native.verifyRandomized.mockClear();
    const sig = falcon1024.signCompressed(privateKey, msg);
    expect(sig[0]).toBe(FALCON_DET1024_SIG_COMPRESSED_HEADER);
    expect(falcon1024.verifyCompressed(publicKey, sig, msg)).toBe(true);
    expect(native.verify).toHaveBeenCalledTimes(1);
    expect(native.verifyRandomized).not.toHaveBeenCalled();
  });

  it("should dispatch randomized signatures to the randomized verifier", () => {
    native.verify.mockClear();
    native.verifyRandomized.mockClear();
    const sig = falcon1024.signCompressed(privateKey, msg, true);
    expect(falcon1024.verifyCompressed(publicKey, sig, msg)).toBe(true);
    expect(native.verifyRandomized).toHaveBeenCalledTimes(1);
    expect(native.verify).not.toHaveBeenCalled();
  });

  it("should reject unknown headers without calling native code", () => {
    native.verify.mockClear();
    native.verifyRandomized.mockClear();
    const sig = new Uint8Array(100);
    sig[0] = 0x5a;
    expect(() => falcon1024.verifyCompressed(publicKey, sig, msg)).toThrow(
      new VerificationError("invalid format"),
    );
    expect(native.verify).not.toHaveBeenCalled();
    expect(native.verifyRandomized).not.toHaveBeenCalled();
  });
});
