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

## 📖 API

```ts
import {
  falcon1024,
  FALCON_DET1024_PUBKEY_SIZE,
  FALCON_DET1024_PRIVKEY_SIZE,
  FALCON_DET1024_SIG_COMPRESSED_MAXSIZE,
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
- `signCompressed(privateKey: Uint8Array, message: Uint8Array): Uint8Array`\
  Creates a compressed signature. Throws `SigningError` if the key length is invalid or signing fails.
- `verifyCompressed(publicKey: Uint8Array, signature: Uint8Array, message: Uint8Array): boolean`\
  Returns `true` for a valid signature. Throws `VerificationError` otherwise.

### Constants

- `FALCON_DET1024_PUBKEY_SIZE` – byte length of a public key (1793).
- `FALCON_DET1024_PRIVKEY_SIZE` – byte length of a private key (2305).
- `FALCON_DET1024_SIG_COMPRESSED_MAXSIZE` – maximum byte length of a compressed signature (1423).

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
