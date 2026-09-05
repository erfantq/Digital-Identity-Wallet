// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title DIDRegistry
 * @notice Minimal on-chain DID anchor for the university wallet.
 * @dev Stores only integrity/ownership data — never the full DID document.
 *
 * Backend needs today:
 * - registerDid: after local DID creation (did.created)
 * - deactivateDid: if a DID must be invalidated
 * - getDidRecord / isActive: resolve / consistency checks
 *
 * Keying: bytes32 didHash = keccak256(bytes(didString))
 * Computed off-chain by the backend (Web3.keccak).
 */
contract DIDRegistry {
    address public owner;

    struct DidRecord {
        address controller;
        bytes32 documentHash;
        bool active;
        uint64 registeredAt;
    }

    mapping(bytes32 => DidRecord) private _records;

    event DidRegistered(
        bytes32 indexed didHash,
        address indexed controller,
        bytes32 documentHash,
        address indexed registeredBy
    );

    event DidDeactivated(
        bytes32 indexed didHash,
        address indexed controller,
        address indexed deactivatedBy
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error ZeroAddress();
    error ZeroHash();
    error NotOwner();
    error DidAlreadyRegistered(bytes32 didHash);
    error DidNotFound(bytes32 didHash);
    error DidNotActive(bytes32 didHash);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        owner = admin;
        emit OwnershipTransferred(address(0), admin);
    }

    /**
     * @notice Anchor a DID document hash and its controller address.
     * @param didHash keccak256 of the DID string (e.g. did:ethr:...)
     * @param controller Ethereum address bound to the DID
     * @param documentHash keccak256 of the canonical DID document JSON
     */
    function registerDid(
        bytes32 didHash,
        address controller,
        bytes32 documentHash
    ) external onlyOwner {
        if (didHash == bytes32(0)) revert ZeroHash();
        if (controller == address(0)) revert ZeroAddress();
        if (documentHash == bytes32(0)) revert ZeroHash();
        if (_records[didHash].registeredAt != 0) revert DidAlreadyRegistered(didHash);

        _records[didHash] = DidRecord({
            controller: controller,
            documentHash: documentHash,
            active: true,
            registeredAt: uint64(block.timestamp)
        });

        emit DidRegistered(didHash, controller, documentHash, msg.sender);
    }

    /**
     * @notice Deactivate an anchored DID. Record remains for audit.
     */
    function deactivateDid(bytes32 didHash) external onlyOwner {
        DidRecord storage record = _records[didHash];
        if (record.registeredAt == 0) revert DidNotFound(didHash);
        if (!record.active) revert DidNotActive(didHash);

        record.active = false;
        emit DidDeactivated(didHash, record.controller, msg.sender);
    }

    function getDidRecord(
        bytes32 didHash
    )
        external
        view
        returns (
            address controller,
            bytes32 documentHash,
            bool active,
            uint64 registeredAt
        )
    {
        DidRecord storage record = _records[didHash];
        if (record.registeredAt == 0) revert DidNotFound(didHash);
        return (
            record.controller,
            record.documentHash,
            record.active,
            record.registeredAt
        );
    }

    function isActive(bytes32 didHash) external view returns (bool) {
        DidRecord storage record = _records[didHash];
        return record.registeredAt != 0 && record.active;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
