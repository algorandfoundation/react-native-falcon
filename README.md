# react-native-falcon

Falcon is based on NTRU lattices, used with a hash-and-sign structure

## Installation


```sh
npm install react-native-falcon react-native-nitro-modules

> `react-native-nitro-modules` is required as this library relies on [Nitro Modules](https://nitro.margelo.com/).
```


## Usage


```ts
import { FalconModule } from 'react-native-falcon';

// 1. Generate a key pair
const { publicKey, privateKey } = FalconModule.generateKey();

// 2. Sign a message
const message = new TextEncoder().encode('Hello, Falcon!').buffer as ArrayBuffer;
const signature = FalconModule.signCompressed(privateKey, message);

// 3. Verify a signature
try {
  FalconModule.verify(publicKey, signature, message);
  console.log('Signature is valid!');
} catch (error) {
  console.error('Signature verification failed:', error.message);
}

// Access constants
console.log(`Public Key Size: ${FalconModule.publicKeySize}`);
console.log(`Private Key Size: ${FalconModule.privateKeySize}`);
```


## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
