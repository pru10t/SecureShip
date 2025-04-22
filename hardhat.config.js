require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200 // 200 is a standard value, tells optimizer how much to optimize based on expected usage
    },
    viaIR: true // Enable the new IR pipeline
  }
};
