export function getBackendConfig(env = globalThis.process.env) {
  return {
    network: env.STELLAR_NETWORK ?? 'TESTNET',
    horizonUrl:
      env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
    rpcUrl: env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org',
    port: Number.parseInt(env.BACKEND_PORT ?? '3000', 10),
  };
}

export function createHealthPayload(env = {}) {
  const config = getBackendConfig(env);

  return {
    status: 'ok',
    app: '{{projectName}}',
    network: config.network,
  };
}
