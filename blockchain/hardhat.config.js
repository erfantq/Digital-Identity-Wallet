require("@nomicfoundation/hardhat-toolbox");

/**
 * Demo private key from Besu Developer Quickstart (rpcnode).
 * Never use this key outside a local development network.
 */
const BESU_DEPLOYER_KEY =
  process.env.BESU_DEPLOYER_KEY ||
  "0x60bbe10a196a4e71451c0f6e9ec9beab454c2a5ac0542aa5b8b733ff5719fec3";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    besu: {
      url: process.env.BESU_RPC_URL || "http://127.0.0.1:8545",
      chainId: Number(process.env.BESU_CHAIN_ID || 1337),
      accounts: [BESU_DEPLOYER_KEY],
    },
  },
  mocha: {
    timeout: 120000,
  },
};
