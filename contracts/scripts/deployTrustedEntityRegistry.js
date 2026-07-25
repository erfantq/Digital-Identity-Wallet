const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin = process.env.TRUST_REGISTRY_ADMIN || deployer.address;

  console.log("Deploying TrustedEntityRegistry");
  console.log("  network RPC signer:", deployer.address);
  console.log("  registry admin:", admin);

  const factory = await ethers.getContractFactory("TrustedEntityRegistry");
  const registry = await factory.deploy(admin);
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const deployTx = registry.deploymentTransaction();

  console.log("TrustedEntityRegistry deployed to:", address);
  if (deployTx) {
    console.log("  tx hash:", deployTx.hash);
  }

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const network = await ethers.provider.getNetwork();
  const artifact = {
    contract: "TrustedEntityRegistry",
    address,
    admin,
    deployer: deployer.address,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    txHash: deployTx ? deployTx.hash : null,
  };

  const outFile = path.join(
    deploymentsDir,
    `TrustedEntityRegistry-${artifact.chainId}.json`
  );
  fs.writeFileSync(outFile, JSON.stringify(artifact, null, 2));
  console.log("Wrote deployment artifact:", outFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
