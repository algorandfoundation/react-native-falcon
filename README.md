# 🦅 react-native-falcon

> [!IMPORTANT]
> This is a primitive library used for interacting with the underlying native falcon code.
> It is not a Falcon LSIG Account; this library only provides the primitives for signing and verifying messages.

Falcon is based on NTRU lattices, used with a hash-and-sign structure.

## 📦 Installation

> `react-native-nitro-modules` is required as this library relies on [Nitro Modules](https://nitro.margelo.com/).

```sh
pnpm add react-native-falcon react-native-nitro-modules
```

## 🚀 Usage

```ts
import { Falcon1024Module } from "react-native-falcon";

// 1. Generate a key pair
const { publicKey, privateKey } = Falcon1024Module.generateKey();

// 2. Sign a message
const message = new TextEncoder().encode("Hello, Falcon!").buffer as ArrayBuffer;
const signature = Falcon1024Module.signCompressed(privateKey, message);

// 3. Verify a signature
try {
  Falcon1024Module.verify(publicKey, signature, message);
  console.log("Signature is valid!");
} catch (error) {
  console.error("Signature verification failed:", error.message);
}

// Access constants
console.log(`Public Key Size: ${Falcon1024Module.publicKeySize}`);
console.log(`Private Key Size: ${Falcon1024Module.privateKeySize}`);
```

## 🤝 Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## 📄 License

Apache-2.0

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
