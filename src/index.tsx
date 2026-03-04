import { NitroModules } from 'react-native-nitro-modules';
import type { Falcon } from './Falcon.nitro';

const FalconHybridObject =
  NitroModules.createHybridObject<Falcon>('Falcon');

export function multiply(a: number, b: number): number {
  return FalconHybridObject.multiply(a, b);
}
