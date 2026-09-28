import { NitroModules } from "react-native-nitro-modules";
import type { Falcon } from "./Falcon.nitro";
import { makeApi } from "./falcon-core";

/**
 * Falcon-1024 signature API. Grouping the operations under a named object leaves
 * room for a sibling `falcon512` export once Falcon-512 support is added.
 */
export const falcon1024 = makeApi(NitroModules.createHybridObject<Falcon>("Falcon"));

export {
  FALCON_DET1024_PUBKEY_SIZE,
  FALCON_DET1024_PRIVKEY_SIZE,
  FALCON_DET1024_SIG_COMPRESSED_MAXSIZE,
  KeygenError,
  SigningError,
  VerificationError,
} from "./falcon-core";
export type { FalconApi } from "./falcon-core";
