const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin =
    process.env.CREDENTIAL_REGISTRY_ADMIN ||
    process.env.DID_REGISTRY_ADMIN ||
    deployer.address;

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  let typeRegistryAddress = process.env.CREDENTIAL_TYPE_REGISTRY_ADDRESS;
  if (!typeRegistryAddress) {
    const typeArtifactPath = path.join(
      __dirname,
      "..",
      "deployments",
      `CredentialTypeRegistry-${chainId}.json`
    );
    if (!fs.existsSync(typeArtifactPath)) {
      throw new Error(
        "CREDENTIAL_TYPE_REGISTRY_ADDRESS is required (or deploy CredentialTypeRegistry first)"
      );
    }
    typeRegistryAddress = JSON.parse(
      fs.readFileSync(typeArtifactPath, "utf8")
    ).address;
  }

  console.log("Deploying CredentialRegistry");
  console.log("  network RPC signer:", deployer.address);
  console.log("  registry admin:", admin);
  console.log("  type registry:", typeRegistryAddress);

  const factory = await ethers.getContractFactory("CredentialRegistry");
  const registry = await factory.deploy(admin, typeRegistryAddress);
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const deployTx = registry.deploymentTransaction();

  console.log("CredentialRegistry deployed to:", address);
  if (deployTx) {
    console.log("  tx hash:", deployTx.hash);
  }

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const artifact = {
    contract: "CredentialRegistry",
    address,
    admin,
    typeRegistry: typeRegistryAddress,
    deployer: deployer.address,
    chainId,
    deployedAt: new Date().toISOString(),
    txHash: deployTx ? deployTx.hash : null,
  };

  const outFile = path.join(
    deploymentsDir,
    `CredentialRegistry-${artifact.chainId}.json`
  );
  fs.writeFileSync(outFile, JSON.stringify(artifact, null, 2));
  console.log("Wrote deployment artifact:", outFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
