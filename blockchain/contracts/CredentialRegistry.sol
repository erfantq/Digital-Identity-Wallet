// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface ICredentialTypeRegistry {
    function typeExists(bytes32 typeIdHash) external view returns (bool);
    function isRevocable(bytes32 typeIdHash) external view returns (bool);
}

/**
 * @title CredentialRegistry
 * @notice On-chain anchor and revocation status for verifiable credentials.
 * @dev Stores only hashes and minimal metadata — never the full VC payload.
 *
 * Backend needs today:
 * - registerCredential: after local issuance (cred.created consumer)
 * - revokeCredential: after local revocation (cred.revoked consumer)
 * - getCredentialRecord: verify API + consistency checks
 *
 * Keying: bytes32 credentialIdHash = keccak256(bytes(credentialId))
 *         e.g. credentialId = "urn:uuid:..."
 *
 * revokedAt == 0 means active; reasonCode 0 means unspecified (text stays off-chain).
 * Revocation is allowed only when the credential's type is marked revocable.
 */
contract CredentialRegistry {
    address public owner;
    ICredentialTypeRegistry public immutable typeRegistry;

    struct CredentialRecord {
        bytes32 credentialHash;
        bytes32 holderDidHash;
        bytes32 typeIdHash;
        uint64 issuedAt;
        uint64 revokedAt;
        uint32 reasonCode;
        address issuer;
    }

    mapping(bytes32 => CredentialRecord) private _records;

    event CredentialIssued(
        bytes32 indexed credentialIdHash,
        bytes32 credentialHash,
        address indexed issuer,
        bytes32 holderDidHash,
        bytes32 typeIdHash
    );

    event CredentialRevoked(
        bytes32 indexed credentialIdHash,
        address indexed revokedBy,
        uint32 reasonCode
    );

    error ZeroAddress();
    error ZeroHash();
    error NotOwner();
    error CredentialAlreadyRegistered(bytes32 credentialIdHash);
    error CredentialNotFound(bytes32 credentialIdHash);
    error CredentialAlreadyRevoked(bytes32 credentialIdHash);
    error CredentialTypeUnknown(bytes32 typeIdHash);
    error CredentialTypeNotRevocable(bytes32 typeIdHash);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address admin, address typeRegistry_) {
        if (admin == address(0)) revert ZeroAddress();
        if (typeRegistry_ == address(0)) revert ZeroAddress();
        owner = admin;
        typeRegistry = ICredentialTypeRegistry(typeRegistry_);
    }

    function registerCredential(
        bytes32 credentialIdHash,
        bytes32 credentialHash,
        address issuer,
        bytes32 holderDidHash,
        bytes32 typeIdHash
    ) external onlyOwner {
        if (credentialIdHash == bytes32(0)) revert ZeroHash();
        if (credentialHash == bytes32(0)) revert ZeroHash();
        if (typeIdHash == bytes32(0)) revert ZeroHash();
        if (issuer == address(0)) revert ZeroAddress();
        if (!typeRegistry.typeExists(typeIdHash)) {
            revert CredentialTypeUnknown(typeIdHash);
        }
        if (_records[credentialIdHash].issuedAt != 0) {
            revert CredentialAlreadyRegistered(credentialIdHash);
        }

        _records[credentialIdHash] = CredentialRecord({
            credentialHash: credentialHash,
            holderDidHash: holderDidHash,
            typeIdHash: typeIdHash,
            issuedAt: uint64(block.timestamp),
            revokedAt: 0,
            reasonCode: 0,
            issuer: issuer
        });

        emit CredentialIssued(
            credentialIdHash,
            credentialHash,
            issuer,
            holderDidHash,
            typeIdHash
        );
    }

    function revokeCredential(
        bytes32 credentialIdHash,
        uint32 reasonCode
    ) external onlyOwner {
        CredentialRecord storage record = _records[credentialIdHash];
        if (record.issuedAt == 0) revert CredentialNotFound(credentialIdHash);
        if (record.revokedAt != 0) revert CredentialAlreadyRevoked(credentialIdHash);
        if (!typeRegistry.isRevocable(record.typeIdHash)) {
            revert CredentialTypeNotRevocable(record.typeIdHash);
        }

        record.revokedAt = uint64(block.timestamp);
        record.reasonCode = reasonCode;

        emit CredentialRevoked(credentialIdHash, msg.sender, reasonCode);
    }

    function getCredentialRecord(
        bytes32 credentialIdHash
    )
        external
        view
        returns (
            bytes32 credentialHash,
            address issuer,
            bytes32 holderDidHash,
            bytes32 typeIdHash,
            uint64 issuedAt,
            uint64 revokedAt,
            uint32 reasonCode
        )
    {
        CredentialRecord storage record = _records[credentialIdHash];
        if (record.issuedAt == 0) revert CredentialNotFound(credentialIdHash);
        return (
            record.credentialHash,
            record.issuer,
            record.holderDidHash,
            record.typeIdHash,
            record.issuedAt,
            record.revokedAt,
            record.reasonCode
        );
    }
}
