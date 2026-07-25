const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustedEntityRegistry", function () {
  let registry;
  let owner;
  let issuer;
  let other;

  beforeEach(async function () {
    [owner, issuer, other] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("TrustedEntityRegistry");
    registry = await factory.deploy(owner.address);
    await registry.waitForDeployment();
  });

  it("sets the constructor admin as owner", async function () {
    expect(await registry.owner()).to.equal(owner.address);
  });

  it("rejects zero admin in constructor", async function () {
    const factory = await ethers.getContractFactory("TrustedEntityRegistry");
    await expect(factory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      factory,
      "ZeroAddress"
    );
  });

  it("authorizes an issuer for credential issuance checks", async function () {
    await expect(registry.connect(owner).authorizeIssuer(issuer.address))
      .to.emit(registry, "IssuerAuthorized")
      .withArgs(issuer.address, owner.address);

    expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(true);
    expect(await registry.isAuthorizedIssuer(other.address)).to.equal(false);
  });

  it("revokes an authorized issuer", async function () {
    await registry.connect(owner).authorizeIssuer(issuer.address);

    await expect(registry.connect(owner).revokeIssuer(issuer.address))
      .to.emit(registry, "IssuerRevoked")
      .withArgs(issuer.address, owner.address);

    expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(false);
  });

  it("allows re-authorization after revoke", async function () {
    await registry.connect(owner).authorizeIssuer(issuer.address);
    await registry.connect(owner).revokeIssuer(issuer.address);
    await registry.connect(owner).authorizeIssuer(issuer.address);

    expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(true);
  });

  it("rejects unauthorized callers", async function () {
    await expect(
      registry.connect(other).authorizeIssuer(issuer.address)
    ).to.be.revertedWithCustomError(registry, "NotOwner");

    await registry.connect(owner).authorizeIssuer(issuer.address);

    await expect(
      registry.connect(other).revokeIssuer(issuer.address)
    ).to.be.revertedWithCustomError(registry, "NotOwner");
  });
});
