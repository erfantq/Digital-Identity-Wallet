// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface ICredentialTypeRegistryForSBT {
    function isRevocable(bytes32 typeIdHash) external view returns (bool);
    function typeExists(bytes32 typeIdHash) external view returns (bool);
}

/**
 * @title CertificateSBT
 * @notice Soulbound (non-transferable) certificate NFT for issued credentials.
 * @dev Minted to the holder's Ethereum address. tokenURI must be an ERC-721
 *      metadata URI (ipfs://<cid>) that contains the certificate fields,
 *      optional document image, and the signed VC. Transfers always revert.
 *
 * Backend needs today:
 * - mintCertificate: after local issuance (cred.created consumer)
 * - revokeCertificate: after local revocation (cred.revoked consumer)
 * - tokenIdOf / getCertificate: verify API + wallet metadata
 *
 * Keying: bytes32 credentialIdHash = keccak256(bytes(credentialId))
 * revokedAt == 0 means active.
 * Revocation is allowed only when the credential's type is marked revocable.
 */
contract CertificateSBT {
    address public owner;
    ICredentialTypeRegistryForSBT public immutable typeRegistry;
    string public name;
    string public symbol;

    uint256 private _nextTokenId = 1;

    struct Certificate {
        bytes32 credentialIdHash;
        bytes32 credentialHash;
        bytes32 typeIdHash;
        address issuer;
        uint64 mintedAt;
        uint64 revokedAt;
        string uri;
    }

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => Certificate) private _certificates;
    mapping(bytes32 => uint256) private _tokenByCredential;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event CertificateMinted(
        uint256 indexed tokenId,
        bytes32 indexed credentialIdHash,
        address indexed to,
        address issuer,
        string tokenURI
    );
    event CertificateRevoked(
        uint256 indexed tokenId,
        bytes32 indexed credentialIdHash,
        address revokedBy
    );

    error ZeroAddress();
    error ZeroHash();
    error NotOwner();
    error Soulbound();
    error TokenNotFound(uint256 tokenId);
    error CredentialAlreadyMinted(bytes32 credentialIdHash);
    error CredentialNotMinted(bytes32 credentialIdHash);
    error CertificateAlreadyRevoked(bytes32 credentialIdHash);
    error CredentialTypeUnknown(bytes32 typeIdHash);
    error CredentialTypeNotRevocable(bytes32 typeIdHash);
    error EmptyTokenURI();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        address admin,
        address typeRegistry_,
        string memory name_,
        string memory symbol_
    ) {
        if (admin == address(0)) revert ZeroAddress();
        if (typeRegistry_ == address(0)) revert ZeroAddress();
        owner = admin;
        typeRegistry = ICredentialTypeRegistryForSBT(typeRegistry_);
        name = name_;
        symbol = symbol_;
    }

    function mintCertificate(
        address to,
        bytes32 credentialIdHash,
        bytes32 credentialHash,
        bytes32 typeIdHash,
        address issuer,
        string calldata tokenURI_
    ) external onlyOwner returns (uint256 tokenId) {
        if (to == address(0) || issuer == address(0)) revert ZeroAddress();
        if (
            credentialIdHash == bytes32(0) ||
            credentialHash == bytes32(0) ||
            typeIdHash == bytes32(0)
        ) {
            revert ZeroHash();
        }
        if (bytes(tokenURI_).length == 0) revert EmptyTokenURI();
        if (!typeRegistry.typeExists(typeIdHash)) {
            revert CredentialTypeUnknown(typeIdHash);
        }
        if (_tokenByCredential[credentialIdHash] != 0) {
            revert CredentialAlreadyMinted(credentialIdHash);
        }

        tokenId = _nextTokenId++;
        _owners[tokenId] = to;
        _balances[to] += 1;
        _tokenByCredential[credentialIdHash] = tokenId;
        _certificates[tokenId] = Certificate({
            credentialIdHash: credentialIdHash,
            credentialHash: credentialHash,
            typeIdHash: typeIdHash,
            issuer: issuer,
            mintedAt: uint64(block.timestamp),
            revokedAt: 0,
            uri: tokenURI_
        });

        emit Transfer(address(0), to, tokenId);
        emit CertificateMinted(tokenId, credentialIdHash, to, issuer, tokenURI_);
    }

    function revokeCertificate(bytes32 credentialIdHash) external onlyOwner {
        uint256 tokenId = _tokenByCredential[credentialIdHash];
        if (tokenId == 0) revert CredentialNotMinted(credentialIdHash);

        Certificate storage cert = _certificates[tokenId];
        if (cert.revokedAt != 0) {
            revert CertificateAlreadyRevoked(credentialIdHash);
        }
        if (!typeRegistry.isRevocable(cert.typeIdHash)) {
            revert CredentialTypeNotRevocable(cert.typeIdHash);
        }

        cert.revokedAt = uint64(block.timestamp);
        emit CertificateRevoked(tokenId, credentialIdHash, msg.sender);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert TokenNotFound(tokenId);
        return _certificates[tokenId].uri;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = _owners[tokenId];
        if (tokenOwner == address(0)) revert TokenNotFound(tokenId);
        return tokenOwner;
    }

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _balances[account];
    }

    function tokenIdOf(bytes32 credentialIdHash) external view returns (uint256) {
        uint256 tokenId = _tokenByCredential[credentialIdHash];
        if (tokenId == 0) revert CredentialNotMinted(credentialIdHash);
        return tokenId;
    }

    function getCertificate(
        bytes32 credentialIdHash
    )
        external
        view
        returns (
            uint256 tokenId,
            address tokenOwner,
            bytes32 credentialHash,
            bytes32 typeIdHash,
            address issuer,
            uint64 mintedAt,
            uint64 revokedAt,
            string memory uri
        )
    {
        tokenId = _tokenByCredential[credentialIdHash];
        if (tokenId == 0) revert CredentialNotMinted(credentialIdHash);

        Certificate storage cert = _certificates[tokenId];
        return (
            tokenId,
            _owners[tokenId],
            cert.credentialHash,
            cert.typeIdHash,
            cert.issuer,
            cert.mintedAt,
            cert.revokedAt,
            cert.uri
        );
    }

    function isRevoked(bytes32 credentialIdHash) external view returns (bool) {
        uint256 tokenId = _tokenByCredential[credentialIdHash];
        if (tokenId == 0) revert CredentialNotMinted(credentialIdHash);
        return _certificates[tokenId].revokedAt != 0;
    }

    function approve(address, uint256) external pure {
        revert Soulbound();
    }

    function setApprovalForAll(address, bool) external pure {
        revert Soulbound();
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        if (_owners[tokenId] == address(0)) revert TokenNotFound(tokenId);
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function transferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    function safeTransferFrom(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure {
        revert Soulbound();
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC165
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x5b5e139f; // ERC721Metadata
    }
}
