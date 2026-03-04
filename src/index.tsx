import { NitroModules } from 'react-native-nitro-modules';
import type { Falcon } from './Falcon.nitro';

export const FalconModule = NitroModules.createHybridObject<Falcon>('Falcon');
