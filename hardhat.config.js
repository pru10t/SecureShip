require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200 // 200 is a standard value, tells optimizer how much to optimize based on expected usage
    },
    viaIR: true // Enable the new IR pipeline
  }
};
