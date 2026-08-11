// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

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
 */
contract CredentialRegistry {
    address public owner;

    struct CredentialRecord {
        bytes32 credentialHash;
        bytes32 holderDidHash;
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
        bytes32 holderDidHash
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

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        owner = admin;
    }

    function registerCredential(
        bytes32 credentialIdHash,
        bytes32 credentialHash,
        address issuer,
        bytes32 holderDidHash
    ) external onlyOwner {
        if (credentialIdHash == bytes32(0)) revert ZeroHash();
        if (credentialHash == bytes32(0)) revert ZeroHash();
        if (issuer == address(0)) revert ZeroAddress();
        if (_records[credentialIdHash].issuedAt != 0) {
            revert CredentialAlreadyRegistered(credentialIdHash);
        }

        _records[credentialIdHash] = CredentialRecord({
            credentialHash: credentialHash,
            holderDidHash: holderDidHash,
            issuedAt: uint64(block.timestamp),
            revokedAt: 0,
            reasonCode: 0,
            issuer: issuer
        });

        emit CredentialIssued(
            credentialIdHash,
            credentialHash,
            issuer,
            holderDidHash
        );
    }

    function revokeCredential(
        bytes32 credentialIdHash,
        uint32 reasonCode
    ) external onlyOwner {
        CredentialRecord storage record = _records[credentialIdHash];
        if (record.issuedAt == 0) revert CredentialNotFound(credentialIdHash);
        if (record.revokedAt != 0) revert CredentialAlreadyRevoked(credentialIdHash);

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
            record.issuedAt,
            record.revokedAt,
            record.reasonCode
        );
    }
}
