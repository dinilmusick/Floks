import {readRemoteHandle,type RemoteGraphDefinition} from './remoteGraphContract.js';
import {remotePortFingerprint} from './remoteGraphConnections.js';

/**
 * Stable, non-authoritative comparison of a fresh Luth/Kloks-scoped operation
 * catalogue. A lease renewal changes only the expiration timestamp; it does
 * not revoke an in-flight invocation. Expiration itself removes the operation
 * from filterRemoteDefinitions, changing this fingerprint.
 *
 * The target still checks the session, lease and grants on every call.
 */
export function remoteAuthorizationFingerprint(
  definitions: readonly RemoteGraphDefinition[],
): string {
  const identity = definitions.map(definition => {
    const metadata = definition.metadata ?? {};
    const relevantMetadata = Object.keys(metadata)
      .filter(key => key !== 'leaseExpiresAt' && key !== 'expiresAt')
      .sort()
      .map(key => [key, metadata[key]]);
    return {
      type: definition.type,
      category: definition.category,
      handle: readRemoteHandle(metadata),
      ports: remotePortFingerprint(definition),
      metadata: relevantMetadata,
    };
  });
  identity.sort((a,b)=>a.type.localeCompare(b.type));
  return JSON.stringify(identity);
}
