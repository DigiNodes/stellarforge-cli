import { getNetworkConfig } from './network.js';

const network = getNetworkConfig();

console.log(`{{projectName}} is configured for Stellar Testnet.`);
console.log(`Horizon: ${network.horizonUrl}`);
console.log(`RPC: ${network.rpcUrl}`);
