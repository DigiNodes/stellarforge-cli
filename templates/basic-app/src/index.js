import { getNetworkConfig } from './network.js';

const network = getNetworkConfig();

globalThis.console.log(`{{projectName}} is configured for Stellar Testnet.`);
globalThis.console.log(`Horizon: ${network.horizonUrl}`);
globalThis.console.log(`RPC: ${network.rpcUrl}`);
