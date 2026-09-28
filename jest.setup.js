/* global jest, TextDecoder */
jest.mock("react-native-nitro-modules", () => {
  // Sizes from deterministic.h for Falcon-1024
  const PUBKEY_SIZE = 1793;
  const PRIVKEY_SIZE = 2305;
  const SIG_COMPRESSED_MAXSIZE = 1423;
  const SIG_CT_SIZE = 1538;

  return {
    NitroModules: {
      createHybridObject: jest.fn((name) => {
        if (name === "Falcon") {
          return {
            publicKeySize: PUBKEY_SIZE,
            privateKeySize: PRIVKEY_SIZE,
            currentSaltVersion: 1,
            ctSignatureSize: SIG_CT_SIZE,
            signatureMaxSize: SIG_COMPRESSED_MAXSIZE,
            n: 1024,
            generateKey: jest.fn(() => ({
              publicKey: new ArrayBuffer(PUBKEY_SIZE),
              privateKey: new ArrayBuffer(PRIVKEY_SIZE),
            })),
            signCompressed: jest.fn(() => new ArrayBuffer(666)),
            convertToCT: jest.fn(() => new ArrayBuffer(SIG_CT_SIZE)),
            verify: jest.fn((publicKey, signature, msg) => {
              const msgStr = new TextDecoder().decode(msg);
              if (msgStr === "wrong message") {
                throw new Error("Falcon verify failed with error code -4");
              }
            }),
            verifyCTSignature: jest.fn(),
            getSaltVersion: jest.fn(() => 1),
            getPublicKeyCoefficients: jest.fn(() => Array.from({ length: 1024 }).fill(0)),
            getS2Coefficients: jest.fn(() => Array.from({ length: 1024 }).fill(0)),
            getS1Coefficients: jest.fn(() => Array.from({ length: 1024 }).fill(0)),
            hashToPointCoefficients: jest.fn(() => Array.from({ length: 1024 }).fill(0)),
          };
        }
        return null;
      }),
    },
  };
});
