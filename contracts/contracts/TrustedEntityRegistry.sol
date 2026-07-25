// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title TrustedEntityRegistry
 * @notice Minimal on-chain Trusted List for credential issuers.
 * @dev Only what the backend needs today:
 *      - authorizeIssuer / revokeIssuer (admin writes)
 *      - isAuthorizedIssuer (checked before VC issuance)
 */
contract TrustedEntityRegistry {
    address public owner;

    mapping(address => bool) private _authorizedIssuers;

    event IssuerAuthorized(address indexed account, address indexed authorizedBy);
    event IssuerRevoked(address indexed account, address indexed revokedBy);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error ZeroAddress();
    error NotOwner();
    error AlreadyAuthorized(address account);
    error NotAuthorized(address account);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        owner = admin;
        emit OwnershipTransferred(address(0), admin);
    }

    function authorizeIssuer(address account) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        if (_authorizedIssuers[account]) revert AlreadyAuthorized(account);

        _authorizedIssuers[account] = true;
        emit IssuerAuthorized(account, msg.sender);
    }

    function revokeIssuer(address account) external onlyOwner {
        if (!_authorizedIssuers[account]) revert NotAuthorized(account);

        _authorizedIssuers[account] = false;
        emit IssuerRevoked(account, msg.sender);
    }

    function isAuthorizedIssuer(address account) external view returns (bool) {
        return _authorizedIssuers[account];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
