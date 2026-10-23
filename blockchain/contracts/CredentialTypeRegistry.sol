// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title CredentialTypeRegistry
 * @notice Immutable on-chain registry of credential type templates.
 * @dev Stores only typeIdHash, revocable flag, and schemaHash — never field payloads.
 *      Once registered, a type cannot be updated or deleted.
 *
 * Keying: bytes32 typeIdHash = keccak256(bytes(typeId))
 *         e.g. typeId = "UniversityEnrollmentCredential"
 * schemaHash = keccak256(bytes(canonicalFieldsJson))
 */
contract CredentialTypeRegistry {
    address public owner;

    struct TypeRecord {
        bool exists;
        bool revocable;
        bytes32 schemaHash;
        uint64 registeredAt;
    }

    mapping(bytes32 => TypeRecord) private _types;

    event CredentialTypeRegistered(
        bytes32 indexed typeIdHash,
        bool revocable,
        bytes32 schemaHash,
        address indexed registeredBy
    );

    error ZeroAddress();
    error ZeroHash();
    error NotOwner();
    error TypeAlreadyRegistered(bytes32 typeIdHash);
    error TypeNotFound(bytes32 typeIdHash);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        owner = admin;
    }

    function registerCredentialType(
        bytes32 typeIdHash,
        bool revocable,
        bytes32 schemaHash
    ) external onlyOwner {
        if (typeIdHash == bytes32(0)) revert ZeroHash();
        if (schemaHash == bytes32(0)) revert ZeroHash();
        if (_types[typeIdHash].exists) revert TypeAlreadyRegistered(typeIdHash);

        _types[typeIdHash] = TypeRecord({
            exists: true,
            revocable: revocable,
            schemaHash: schemaHash,
            registeredAt: uint64(block.timestamp)
        });

        emit CredentialTypeRegistered(typeIdHash, revocable, schemaHash, msg.sender);
    }

    function getType(
        bytes32 typeIdHash
    )
        external
        view
        returns (
            bool exists,
            bool revocable,
            bytes32 schemaHash,
            uint64 registeredAt
        )
    {
        TypeRecord storage record = _types[typeIdHash];
        if (!record.exists) revert TypeNotFound(typeIdHash);
        return (record.exists, record.revocable, record.schemaHash, record.registeredAt);
    }

    function isRevocable(bytes32 typeIdHash) external view returns (bool) {
        TypeRecord storage record = _types[typeIdHash];
        if (!record.exists) revert TypeNotFound(typeIdHash);
        return record.revocable;
    }

    function typeExists(bytes32 typeIdHash) external view returns (bool) {
        return _types[typeIdHash].exists;
    }
}
