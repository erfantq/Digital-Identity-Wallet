const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateSBT", function () {
  let sbt;
  let owner;
  let holder;
  let issuer;
  let other;

  const credentialId = "urn:uuid:550e8400-e29b-41d4-a716-446655440000";
  const tokenURI = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

  let credentialIdHash;
  let credentialHash;

  beforeEach(async function () {
    [owner, holder, issuer, other] = await ethers.getSigners();

    credentialIdHash = ethers.keccak256(ethers.toUtf8Bytes(credentialId));
    credentialHash = ethers.keccak256(
      ethers.toUtf8Bytes('{"id":"urn:uuid:550e8400-e29b-41d4-a716-446655440000"}')
    );

    const factory = await ethers.getContractFactory("CertificateSBT");
    sbt = await factory.deploy(owner.address, "UniversityCertificate", "UNICERT");
    await sbt.waitForDeployment();
  });

  async function mintDefault() {
    return sbt
      .connect(owner)
      .mintCertificate(
        holder.address,
        credentialIdHash,
        credentialHash,
        issuer.address,
        tokenURI
      );
  }

  it("sets name, symbol, and constructor admin", async function () {
    expect(await sbt.owner()).to.equal(owner.address);
    expect(await sbt.name()).to.equal("UniversityCertificate");
    expect(await sbt.symbol()).to.equal("UNICERT");
  });

  it("rejects zero admin in constructor", async function () {
    const factory = await ethers.getContractFactory("CertificateSBT");
    await expect(
      factory.deploy(ethers.ZeroAddress, "UniversityCertificate", "UNICERT")
    ).to.be.revertedWithCustomError(factory, "ZeroAddress");
  });

  it("mints a soulbound certificate to the holder", async function () {
    await expect(mintDefault())
      .to.emit(sbt, "CertificateMinted")
      .withArgs(
        1n,
        credentialIdHash,
        holder.address,
        issuer.address,
        tokenURI
      );

    expect(await sbt.ownerOf(1n)).to.equal(holder.address);
    expect(await sbt.balanceOf(holder.address)).to.equal(1n);
    expect(await sbt.tokenURI(1n)).to.equal(tokenURI);
    expect(await sbt.tokenIdOf(credentialIdHash)).to.equal(1n);

    const cert = await sbt.getCertificate(credentialIdHash);
    expect(cert.tokenId).to.equal(1n);
    expect(cert.tokenOwner).to.equal(holder.address);
    expect(cert.credentialHash).to.equal(credentialHash);
    expect(cert.issuer).to.equal(issuer.address);
    expect(cert.mintedAt).to.be.greaterThan(0n);
    expect(cert.revokedAt).to.equal(0n);
    expect(cert.uri).to.equal(tokenURI);
    expect(await sbt.isRevoked(credentialIdHash)).to.equal(false);
  });

  it("rejects duplicate mint for the same credential", async function () {
    await mintDefault();

    await expect(mintDefault())
      .to.be.revertedWithCustomError(sbt, "CredentialAlreadyMinted")
      .withArgs(credentialIdHash);
  });

  it("revokes a minted certificate without transferring it", async function () {
    await mintDefault();

    await expect(sbt.connect(owner).revokeCertificate(credentialIdHash))
      .to.emit(sbt, "CertificateRevoked")
      .withArgs(1n, credentialIdHash, owner.address);

    expect(await sbt.ownerOf(1n)).to.equal(holder.address);
    expect(await sbt.isRevoked(credentialIdHash)).to.equal(true);

    const cert = await sbt.getCertificate(credentialIdHash);
    expect(cert.revokedAt).to.be.greaterThan(0n);
  });

  it("rejects transferring or approving the soulbound token", async function () {
    await mintDefault();

    await expect(
      sbt.connect(holder).transferFrom(holder.address, other.address, 1n)
    ).to.be.revertedWithCustomError(sbt, "Soulbound");

    await expect(
      sbt
        .connect(holder)
        ["safeTransferFrom(address,address,uint256)"](
          holder.address,
          other.address,
          1n
        )
    ).to.be.revertedWithCustomError(sbt, "Soulbound");

    await expect(
      sbt.connect(holder).approve(other.address, 1n)
    ).to.be.revertedWithCustomError(sbt, "Soulbound");

    await expect(
      sbt.connect(holder).setApprovalForAll(other.address, true)
    ).to.be.revertedWithCustomError(sbt, "Soulbound");
  });

  it("rejects unauthorized mint and revoke", async function () {
    await expect(
      sbt
        .connect(other)
        .mintCertificate(
          holder.address,
          credentialIdHash,
          credentialHash,
          issuer.address,
          tokenURI
        )
    ).to.be.revertedWithCustomError(sbt, "NotOwner");

    await mintDefault();

    await expect(
      sbt.connect(other).revokeCertificate(credentialIdHash)
    ).to.be.revertedWithCustomError(sbt, "NotOwner");
  });

  it("rejects zero addresses or hashes on mint", async function () {
    await expect(
      sbt
        .connect(owner)
        .mintCertificate(
          ethers.ZeroAddress,
          credentialIdHash,
          credentialHash,
          issuer.address,
          tokenURI
        )
    ).to.be.revertedWithCustomError(sbt, "ZeroAddress");

    await expect(
      sbt
        .connect(owner)
        .mintCertificate(
          holder.address,
          ethers.ZeroHash,
          credentialHash,
          issuer.address,
          tokenURI
        )
    ).to.be.revertedWithCustomError(sbt, "ZeroHash");

    await expect(
      sbt
        .connect(owner)
        .mintCertificate(
          holder.address,
          credentialIdHash,
          credentialHash,
          issuer.address,
          ""
        )
    ).to.be.revertedWithCustomError(sbt, "EmptyTokenURI");
  });

  it("rejects revoke of unknown or already revoked certificates", async function () {
    await expect(
      sbt.connect(owner).revokeCertificate(credentialIdHash)
    )
      .to.be.revertedWithCustomError(sbt, "CredentialNotMinted")
      .withArgs(credentialIdHash);

    await mintDefault();
    await sbt.connect(owner).revokeCertificate(credentialIdHash);

    await expect(
      sbt.connect(owner).revokeCertificate(credentialIdHash)
    )
      .to.be.revertedWithCustomError(sbt, "CertificateAlreadyRevoked")
      .withArgs(credentialIdHash);
  });

  it("reports ERC721 and metadata interface support", async function () {
    expect(await sbt.supportsInterface("0x01ffc9a7")).to.equal(true);
    expect(await sbt.supportsInterface("0x80ac58cd")).to.equal(true);
    expect(await sbt.supportsInterface("0x5b5e139f")).to.equal(true);
    expect(await sbt.supportsInterface("0xffffffff")).to.equal(false);
  });
});
