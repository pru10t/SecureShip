const hre = require("hardhat");

async function main() {
  // 1. Deploy ActorRegistry
  const ActorRegistry = await hre.ethers.getContractFactory("ActorRegistry");
  const actorRegistry = await ActorRegistry.deploy();
  await actorRegistry.waitForDeployment();
  console.log("✅ ActorRegistry deployed to:", actorRegistry.target);

  // 2. Deploy ShipmentManager with ActorRegistry's address
  const ShipmentManager = await hre.ethers.getContractFactory("ShipmentManager");
  const shipmentManager = await ShipmentManager.deploy(actorRegistry.target);
  await shipmentManager.waitForDeployment();
  console.log("✅ ShipmentManager deployed to:", shipmentManager.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
