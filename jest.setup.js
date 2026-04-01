/* global jest, TextDecoder */
jest.mock("react-native-nitro-modules", () => {
  return {
    NitroModules: {
      createHybridObject: jest.fn((name) => {
        if (name === "Falcon") {
          return {
            publicKeySize: 897,
            privateKeySize: 1281,
            currentSaltVersion: 1,
            ctSignatureSize: 1024,
            signatureMaxSize: 1280,
            n: 1024,
            generateKey: jest.fn(() => ({
              publicKey: new ArrayBuffer(897),
              privateKey: new ArrayBuffer(1281),
            })),
            signCompressed: jest.fn(() => new ArrayBuffer(666)),
            convertToCT: jest.fn(() => new ArrayBuffer(1024)),
            verify: jest.fn((publicKey, signature, msg) => {
              const msgStr = new TextDecoder().decode(msg);
              if (msgStr === "wrong message") throw new Error("Verification failed");
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
