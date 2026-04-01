import { FalconModule } from "../index";
import { TextEncoder } from "node:util";

describe("FalconModule", () => {
  it("should have correct constants", () => {
    expect(FalconModule.publicKeySize).toBeGreaterThan(0);
    expect(FalconModule.privateKeySize).toBeGreaterThan(0);
    expect(FalconModule.n).toBe(1024);
  });

  it("should generate a keypair", () => {
    const { publicKey, privateKey } = FalconModule.generateKey();
    expect(publicKey).toBeDefined();
    expect(privateKey).toBeDefined();
    expect(publicKey.byteLength).toBe(FalconModule.publicKeySize);
    expect(privateKey.byteLength).toBe(FalconModule.privateKeySize);
  });

  it("should sign and verify a message", () => {
    const { publicKey, privateKey } = FalconModule.generateKey();
    const msg = new TextEncoder().encode("test message").buffer as ArrayBuffer;

    const sig = FalconModule.signCompressed(privateKey, msg);
    expect(sig).toBeDefined();
    expect(sig.byteLength).toBeGreaterThan(0);

    // Should not throw
    expect(() => FalconModule.verify(publicKey, sig, msg)).not.toThrow();
  });

  it("should fail verification with wrong message", () => {
    const { publicKey, privateKey } = FalconModule.generateKey();
    const msg = new TextEncoder().encode("test message").buffer as ArrayBuffer;
    const wrongMsg = new TextEncoder().encode("wrong message").buffer as ArrayBuffer;

    const sig = FalconModule.signCompressed(privateKey, msg);

    expect(() => FalconModule.verify(publicKey, sig, wrongMsg)).toThrow();
  });

  it("should convert to CT and verify", () => {
    const { publicKey, privateKey } = FalconModule.generateKey();
    const msg = new TextEncoder().encode("test message").buffer as ArrayBuffer;

    const sig = FalconModule.signCompressed(privateKey, msg);
    const sigCT = FalconModule.convertToCT(sig);

    expect(sigCT.byteLength).toBe(FalconModule.ctSignatureSize);
    expect(() => FalconModule.verifyCTSignature(publicKey, sigCT, msg)).not.toThrow();
  });

  it("should get salt version", () => {
    const msg = new TextEncoder().encode("test message").buffer as ArrayBuffer;
    const { privateKey } = FalconModule.generateKey();
    const sig = FalconModule.signCompressed(privateKey, msg);
    const version = FalconModule.getSaltVersion(sig);
    expect(version).toBe(FalconModule.currentSaltVersion);
  });
});
