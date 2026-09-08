const DEFAULT_HORIZON_URL = 'https://horizon-testnet.stellar.org';
const DEFAULT_RPC_URL = 'https://soroban-testnet.stellar.org';
const DEFAULT_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

export function getNetworkConfig(env = process.env) {
  return {
    horizonUrl: env.STELLAR_HORIZON_URL ?? DEFAULT_HORIZON_URL,
    rpcUrl: env.STELLAR_RPC_URL ?? DEFAULT_RPC_URL,
    networkPassphrase:
      env.STELLAR_NETWORK_PASSPHRASE ?? DEFAULT_NETWORK_PASSPHRASE,
  };
}
