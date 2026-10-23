const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialTypeRegistry", function () {
  let registry;
  let owner;
  let other;

  const typeId = "UniversityEnrollmentCredential";
  let typeIdHash;
  let schemaHash;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    typeIdHash = ethers.keccak256(ethers.toUtf8Bytes(typeId));
    schemaHash = ethers.keccak256(ethers.toUtf8Bytes('[{"key":"firstName"}]'));

    const factory = await ethers.getContractFactory("CredentialTypeRegistry");
    registry = await factory.deploy(owner.address);
    await registry.waitForDeployment();
  });

  it("registers a credential type immutably", async function () {
    await expect(
      registry.connect(owner).registerCredentialType(typeIdHash, true, schemaHash)
    )
      .to.emit(registry, "CredentialTypeRegistered")
      .withArgs(typeIdHash, true, schemaHash, owner.address);

    const record = await registry.getType(typeIdHash);
    expect(record.exists).to.equal(true);
    expect(record.revocable).to.equal(true);
    expect(record.schemaHash).to.equal(schemaHash);
    expect(record.registeredAt).to.be.greaterThan(0n);
    expect(await registry.isRevocable(typeIdHash)).to.equal(true);
    expect(await registry.typeExists(typeIdHash)).to.equal(true);
  });

  it("rejects duplicate type registration", async function () {
    await registry
      .connect(owner)
      .registerCredentialType(typeIdHash, true, schemaHash);

    await expect(
      registry.connect(owner).registerCredentialType(typeIdHash, false, schemaHash)
    )
      .to.be.revertedWithCustomError(registry, "TypeAlreadyRegistered")
      .withArgs(typeIdHash);
  });

  it("rejects unauthorized callers", async function () {
    await expect(
      registry.connect(other).registerCredentialType(typeIdHash, true, schemaHash)
    ).to.be.revertedWithCustomError(registry, "NotOwner");
  });
});
