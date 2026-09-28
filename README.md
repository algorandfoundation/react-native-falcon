# 🦅 @algorandfoundation/react-native-falcon

> [!IMPORTANT]
> This is a primitive library used for interacting with the underlying native falcon code.
> It is not a Falcon LSIG Account; this library only provides the primitives for signing and verifying messages.

React Native bindings for deterministic [Falcon-1024](https://falcon-sign.info/) post-quantum signatures, backed by the [C implementation](https://github.com/algorand/falcon) used by [go-algorand](https://github.com/algorand/go-algorand).

The API is identical to [`@algorandfoundation/falcon-wasm`](https://github.com/algorandfoundation/falcon-ts-wasm), so code written against one package works with the other.

## 📦 Installation

> `react-native-nitro-modules` is required as this library relies on [Nitro Modules](https://nitro.margelo.com/).

```sh
pnpm add @algorandfoundation/react-native-falcon react-native-nitro-modules
```

## 🚀 Usage

```ts
import { falcon1024 } from "@algorandfoundation/react-native-falcon";

const message = new TextEncoder().encode("hello, post-quantum world");

// 1. Generate a Falcon-1024 keypair (seeded from the native system RNG by default)
const { publicKey, privateKey } = falcon1024.generateKey();

// 2. Sign (compressed format)
const signature = falcon1024.signCompressed(privateKey, message);

// 3. Verify
const isValid = falcon1024.verifyCompressed(publicKey, signature, message);
console.log("Signature valid?", isValid); // true
```

### Deterministic key generation from a seed

If you pass a seed, key generation is deterministic:

```ts
const seed = new Uint8Array(48); // fill with secure random bytes
const { publicKey, privateKey } = falcon1024.generateKey(seed);
```

The same 48-byte seed will always produce the same keypair.

### Randomized (salted) signatures

Alongside deterministic signing, the randomized Falcon-1024 mode from the Round 3 specification (the basis of the upcoming FN-DSA / FIPS 206 standard) is available. Keys are shared between both modes.

```ts
const signature = falcon1024.signCompressed(privateKey, message, true); // fresh 40-byte nonce
falcon1024.verifyCompressed(publicKey, signature, message); // mode detected from the header byte
```

> [!CAUTION]
> Randomized signing is **experimental** and implements the **NIST Round 3 Falcon submission only**. It is **not FN-DSA (FIPS 206)**.
>
> - **Not FN-DSA:** the standardised FN-DSA is expected to differ substantially from Round 3 (e.g. message hashing and domain separation, encodings and headers), so Round 3 randomized signatures will very likely **not** verify under FN-DSA. The output and API of this mode will change in a future release once FIPS 206 is final. Do not rely on it for long-lived signatures or interoperability.
> - **Not accepted on-chain:** Algorand on-chain verification (the AVM `falcon_verify` opcode) only accepts deterministic signatures. A randomized signature that passes `verifyCompressed` will still be rejected on-chain; check for `signature[0] === FALCON_DET1024_SIG_COMPRESSED_HEADER` if you need to mirror that behaviour.

## 📖 API

```ts
import {
  falcon1024,
  FALCON_DET1024_PUBKEY_SIZE,
  FALCON_DET1024_PRIVKEY_SIZE,
  FALCON_DET1024_SIG_COMPRESSED_MAXSIZE,
  FALCON_DET1024_SIG_COMPRESSED_HEADER,
  FALCON1024_SIG_COMPRESSED_MAXSIZE,
  FALCON1024_SIG_COMPRESSED_HEADER,
  KeygenError,
  SigningError,
  VerificationError,
} from "@algorandfoundation/react-native-falcon";
import type { FalconApi } from "@algorandfoundation/react-native-falcon";
```

### `falcon1024`

An object implementing `FalconApi`:

- `generateKey(seed?: Uint8Array): { publicKey: Uint8Array; privateKey: Uint8Array }`\
  Generates a Falcon-1024 keypair. If `seed` is omitted or empty, the native system RNG is used.
  Throws `KeygenError` on failure.
- `signCompressed(privateKey: Uint8Array, message: Uint8Array, randomized = false): Uint8Array`\
  Creates a compressed signature, deterministic by default. With `randomized = true`, a randomized (salted) signature is created using the native system RNG; signing the same message twice yields different signatures. Throws `SigningError` if the key length is invalid or signing fails.
- `verifyCompressed(publicKey: Uint8Array, signature: Uint8Array, message: Uint8Array): boolean`\
  Verifies a compressed signature of either mode, detected from its header byte. Returns `true` for a valid signature. Throws `VerificationError` otherwise, including `invalid format` for unknown headers.

### Constants

- `FALCON_DET1024_PUBKEY_SIZE` – byte length of a public key (1793).
- `FALCON_DET1024_PRIVKEY_SIZE` – byte length of a private key (2305).
- `FALCON_DET1024_SIG_COMPRESSED_MAXSIZE` – maximum byte length of a deterministic compressed signature (1423).
- `FALCON1024_SIG_COMPRESSED_MAXSIZE` – maximum byte length of a randomized compressed signature (1462).
- `FALCON_DET1024_SIG_COMPRESSED_HEADER` – header byte of a deterministic compressed signature (`0xBA`).
- `FALCON1024_SIG_COMPRESSED_HEADER` – header byte of a randomized compressed signature (`0x3A`).

### Errors

`KeygenError`, `SigningError` and `VerificationError` extend `Error` and translate the underlying Falcon error codes into the same messages as `@algorandfoundation/falcon-wasm`.

## 🤝 Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## 📄 License

Apache-2.0

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
