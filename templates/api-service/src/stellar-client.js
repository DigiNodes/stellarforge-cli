export function createStellarBoundary(config) {
  return Object.freeze({
    network: config.network,
    horizonUrl: config.horizonUrl,
    rpcUrl: config.rpcUrl,
  });
}

export function getStellarNetworkDescriptor(boundary) {
  return {
    network: boundary.network,
    horizonUrl: boundary.horizonUrl,
    rpcUrl: boundary.rpcUrl,
  };
}

// Add Stellar SDK or RPC calls behind this boundary when the application
// has a concrete use case. Do not place signing keys or seed phrases here.
