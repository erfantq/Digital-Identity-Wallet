const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialRegistry", function () {
  let registry;
  let typeRegistry;
  let owner;
  let issuer;
  let other;

  const credentialId = "urn:uuid:550e8400-e29b-41d4-a716-446655440000";
  const holderDid = "did:ethr:6:0x1C7e13956dE0be618365E9229796c697638E4821";
  const revocableTypeId = "UniversityEnrollmentCredential";
  const nonRevocableTypeId = "UniversityCertificateCredential";

  let credentialIdHash;
  let credentialHash;
  let holderDidHash;
  let revocableTypeIdHash;
  let nonRevocableTypeIdHash;
  let schemaHash;

  beforeEach(async function () {
    [owner, issuer, other] = await ethers.getSigners();

    credentialIdHash = ethers.keccak256(ethers.toUtf8Bytes(credentialId));
    credentialHash = ethers.keccak256(
      ethers.toUtf8Bytes('{"id":"urn:uuid:550e8400-e29b-41d4-a716-446655440000"}')
    );
    holderDidHash = ethers.keccak256(ethers.toUtf8Bytes(holderDid));
    revocableTypeIdHash = ethers.keccak256(ethers.toUtf8Bytes(revocableTypeId));
    nonRevocableTypeIdHash = ethers.keccak256(
      ethers.toUtf8Bytes(nonRevocableTypeId)
    );
    schemaHash = ethers.keccak256(ethers.toUtf8Bytes("[]"));

    const typeFactory = await ethers.getContractFactory("CredentialTypeRegistry");
    typeRegistry = await typeFactory.deploy(owner.address);
    await typeRegistry.waitForDeployment();

    await typeRegistry
      .connect(owner)
      .registerCredentialType(revocableTypeIdHash, true, schemaHash);
    await typeRegistry
      .connect(owner)
      .registerCredentialType(nonRevocableTypeIdHash, false, schemaHash);

    const factory = await ethers.getContractFactory("CredentialRegistry");
    registry = await factory.deploy(
      owner.address,
      await typeRegistry.getAddress()
    );
    await registry.waitForDeployment();
  });

  async function registerDefaultCredential(typeIdHash = revocableTypeIdHash) {
    await registry
      .connect(owner)
      .registerCredential(
        credentialIdHash,
        credentialHash,
        issuer.address,
        holderDidHash,
        typeIdHash
      );
  }

  it("sets the constructor admin as owner", async function () {
    expect(await registry.owner()).to.equal(owner.address);
  });

  it("rejects zero admin or type registry in constructor", async function () {
    const factory = await ethers.getContractFactory("CredentialRegistry");
    await expect(
      factory.deploy(ethers.ZeroAddress, await typeRegistry.getAddress())
    ).to.be.revertedWithCustomError(factory, "ZeroAddress");

    await expect(
      factory.deploy(owner.address, ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(factory, "ZeroAddress");
  });

  it("registers a credential anchor with type", async function () {
    await expect(
      registry
        .connect(owner)
        .registerCredential(
          credentialIdHash,
          credentialHash,
          issuer.address,
          holderDidHash,
          revocableTypeIdHash
        )
    )
      .to.emit(registry, "CredentialIssued")
      .withArgs(
        credentialIdHash,
        credentialHash,
        issuer.address,
        holderDidHash,
        revocableTypeIdHash
      );

    const record = await registry.getCredentialRecord(credentialIdHash);
    expect(record.credentialHash).to.equal(credentialHash);
    expect(record.issuer).to.equal(issuer.address);
    expect(record.holderDidHash).to.equal(holderDidHash);
    expect(record.typeIdHash).to.equal(revocableTypeIdHash);
    expect(record.issuedAt).to.be.greaterThan(0n);
    expect(record.revokedAt).to.equal(0n);
    expect(record.reasonCode).to.equal(0);
  });

  it("revokes a registered revocable credential", async function () {
    await registerDefaultCredential();

    await expect(registry.connect(owner).revokeCredential(credentialIdHash, 1))
      .to.emit(registry, "CredentialRevoked")
      .withArgs(credentialIdHash, owner.address, 1);

    const record = await registry.getCredentialRecord(credentialIdHash);
    expect(record.revokedAt).to.be.greaterThan(0n);
    expect(record.reasonCode).to.equal(1);
  });

  it("rejects revoke for non-revocable credential type", async function () {
    await registerDefaultCredential(nonRevocableTypeIdHash);

    await expect(registry.connect(owner).revokeCredential(credentialIdHash, 1))
      .to.be.revertedWithCustomError(registry, "CredentialTypeNotRevocable")
      .withArgs(nonRevocableTypeIdHash);
  });

  it("rejects unknown credential type on register", async function () {
    const unknownType = ethers.keccak256(ethers.toUtf8Bytes("UnknownType"));
    await expect(
      registry
        .connect(owner)
        .registerCredential(
          credentialIdHash,
          credentialHash,
          issuer.address,
          holderDidHash,
          unknownType
        )
    )
      .to.be.revertedWithCustomError(registry, "CredentialTypeUnknown")
      .withArgs(unknownType);
  });

  it("rejects duplicate credential registration", async function () {
    await registerDefaultCredential();

    await expect(
      registry
        .connect(owner)
        .registerCredential(
          credentialIdHash,
          credentialHash,
          issuer.address,
          holderDidHash,
          revocableTypeIdHash
        )
    )
      .to.be.revertedWithCustomError(registry, "CredentialAlreadyRegistered")
      .withArgs(credentialIdHash);
  });

  it("rejects revoking unknown or already revoked credential", async function () {
    await expect(
      registry.connect(owner).revokeCredential(credentialIdHash, 0)
    )
      .to.be.revertedWithCustomError(registry, "CredentialNotFound")
      .withArgs(credentialIdHash);

    await registerDefaultCredential();
    await registry.connect(owner).revokeCredential(credentialIdHash, 0);

    await expect(
      registry.connect(owner).revokeCredential(credentialIdHash, 2)
    )
      .to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked")
      .withArgs(credentialIdHash);
  });

  it("rejects zero issuer or zero hashes on register", async function () {
    await expect(
      registry
        .connect(owner)
        .registerCredential(
          credentialIdHash,
          credentialHash,
          ethers.ZeroAddress,
          holderDidHash,
          revocableTypeIdHash
        )
    ).to.be.revertedWithCustomError(registry, "ZeroAddress");

    await expect(
      registry
        .connect(owner)
        .registerCredential(
          ethers.ZeroHash,
          credentialHash,
          issuer.address,
          holderDidHash,
          revocableTypeIdHash
        )
    ).to.be.revertedWithCustomError(registry, "ZeroHash");

    await expect(
      registry
        .connect(owner)
        .registerCredential(
          credentialIdHash,
          ethers.ZeroHash,
          issuer.address,
          holderDidHash,
          revocableTypeIdHash
        )
    ).to.be.revertedWithCustomError(registry, "ZeroHash");
  });

  it("rejects lookup for unknown credential", async function () {
    await expect(registry.getCredentialRecord(credentialIdHash))
      .to.be.revertedWithCustomError(registry, "CredentialNotFound")
      .withArgs(credentialIdHash);
  });

  it("rejects unauthorized callers", async function () {
    await expect(
      registry
        .connect(other)
        .registerCredential(
          credentialIdHash,
          credentialHash,
          issuer.address,
          holderDidHash,
          revocableTypeIdHash
        )
    ).to.be.revertedWithCustomError(registry, "NotOwner");

    await registerDefaultCredential();

    await expect(
      registry.connect(other).revokeCredential(credentialIdHash, 0)
    ).to.be.revertedWithCustomError(registry, "NotOwner");
  });
});
