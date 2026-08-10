const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DIDRegistry", function () {
  let registry;
  let owner;
  let controller;
  let other;

  const did = "did:ethr:1:0xController";
  let didHash;
  let documentHash;

  beforeEach(async function () {
    [owner, controller, other] = await ethers.getSigners();

    didHash = ethers.keccak256(ethers.toUtf8Bytes(did));
    documentHash = ethers.keccak256(
      ethers.toUtf8Bytes('{"id":"did:ethr:1:0xController"}')
    );

    const factory = await ethers.getContractFactory("DIDRegistry");
    registry = await factory.deploy(owner.address);
    await registry.waitForDeployment();
  });

  it("sets the constructor admin as owner", async function () {
    expect(await registry.owner()).to.equal(owner.address);
  });

  it("rejects zero admin in constructor", async function () {
    const factory = await ethers.getContractFactory("DIDRegistry");
    await expect(factory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      factory,
      "ZeroAddress"
    );
  });

  it("registers a DID with controller and document hash", async function () {
    await expect(
      registry.connect(owner).registerDid(didHash, controller.address, documentHash)
    )
      .to.emit(registry, "DidRegistered")
      .withArgs(didHash, controller.address, documentHash, owner.address);

    const record = await registry.getDidRecord(didHash);
    expect(record.controller).to.equal(controller.address);
    expect(record.documentHash).to.equal(documentHash);
    expect(record.active).to.equal(true);
    expect(record.registeredAt).to.be.greaterThan(0n);
    expect(await registry.isActive(didHash)).to.equal(true);
  });

  it("rejects duplicate DID registration", async function () {
    await registry
      .connect(owner)
      .registerDid(didHash, controller.address, documentHash);

    await expect(
      registry.connect(owner).registerDid(didHash, controller.address, documentHash)
    )
      .to.be.revertedWithCustomError(registry, "DidAlreadyRegistered")
      .withArgs(didHash);
  });

  it("rejects zero controller or zero hashes", async function () {
    await expect(
      registry.connect(owner).registerDid(didHash, ethers.ZeroAddress, documentHash)
    ).to.be.revertedWithCustomError(registry, "ZeroAddress");

    await expect(
      registry
        .connect(owner)
        .registerDid(ethers.ZeroHash, controller.address, documentHash)
    ).to.be.revertedWithCustomError(registry, "ZeroHash");

    await expect(
      registry
        .connect(owner)
        .registerDid(didHash, controller.address, ethers.ZeroHash)
    ).to.be.revertedWithCustomError(registry, "ZeroHash");
  });

  it("deactivates a registered DID", async function () {
    await registry
      .connect(owner)
      .registerDid(didHash, controller.address, documentHash);

    await expect(registry.connect(owner).deactivateDid(didHash))
      .to.emit(registry, "DidDeactivated")
      .withArgs(didHash, controller.address, owner.address);

    const record = await registry.getDidRecord(didHash);
    expect(record.active).to.equal(false);
    expect(await registry.isActive(didHash)).to.equal(false);
  });

  it("rejects unauthorized callers", async function () {
    await expect(
      registry.connect(other).registerDid(didHash, controller.address, documentHash)
    ).to.be.revertedWithCustomError(registry, "NotOwner");

    await registry
      .connect(owner)
      .registerDid(didHash, controller.address, documentHash);

    await expect(
      registry.connect(other).deactivateDid(didHash)
    ).to.be.revertedWithCustomError(registry, "NotOwner");
  });
});
