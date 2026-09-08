export function createAppModel() {
  return {
    name: '{{projectName}}',
    network: 'Stellar Testnet',
    backendHealthPath: '/health',
  };
}
