import { Falcon1024Module } from "../index";
import { TextEncoder } from "node:util";

describe("Falcon1024Module", () => {
  it("should have correct constants", () => {
    expect(Falcon1024Module.publicKeySize).toBeGreaterThan(0);
    expect(Falcon1024Module.privateKeySize).toBeGreaterThan(0);
    expect(Falcon1024Module.n).toBe(1024);
  });

  it("should generate a keypair", () => {
    const { publicKey, privateKey } = Falcon1024Module.generateKey();
    expect(publicKey).toBeDefined();
    expect(privateKey).toBeDefined();
    expect(publicKey.byteLength).toBe(Falcon1024Module.publicKeySize);
    expect(privateKey.byteLength).toBe(Falcon1024Module.privateKeySize);
  });

  it("should sign and verify a message", () => {
    const { publicKey, privateKey } = Falcon1024Module.generateKey();
    const msg = new TextEncoder().encode("test message").buffer as ArrayBuffer;

    const sig = Falcon1024Module.signCompressed(privateKey, msg);
    expect(sig).toBeDefined();
    expect(sig.byteLength).toBeGreaterThan(0);

    // Should not throw
    expect(() => Falcon1024Module.verify(publicKey, sig, msg)).not.toThrow();
  });

  it("should fail verification with wrong message", () => {
    const { publicKey, privateKey } = Falcon1024Module.generateKey();
    const msg = new TextEncoder().encode("test message").buffer as ArrayBuffer;
    const wrongMsg = new TextEncoder().encode("wrong message").buffer as ArrayBuffer;

    const sig = Falcon1024Module.signCompressed(privateKey, msg);

    expect(() => Falcon1024Module.verify(publicKey, sig, wrongMsg)).toThrow();
  });

  it("should convert to CT and verify", () => {
    const { publicKey, privateKey } = Falcon1024Module.generateKey();
    const msg = new TextEncoder().encode("test message").buffer as ArrayBuffer;

    const sig = Falcon1024Module.signCompressed(privateKey, msg);
    const sigCT = Falcon1024Module.convertToCT(sig);

    expect(sigCT.byteLength).toBe(Falcon1024Module.ctSignatureSize);
    expect(() => Falcon1024Module.verifyCTSignature(publicKey, sigCT, msg)).not.toThrow();
  });

  it("should get salt version", () => {
    const msg = new TextEncoder().encode("test message").buffer as ArrayBuffer;
    const { privateKey } = Falcon1024Module.generateKey();
    const sig = Falcon1024Module.signCompressed(privateKey, msg);
    const version = Falcon1024Module.getSaltVersion(sig);
    expect(version).toBe(Falcon1024Module.currentSaltVersion);
  });
});
