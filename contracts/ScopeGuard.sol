// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.6;

import "@gnosis.pm/zodiac/contracts/guard/BaseGuard.sol";
import "@gnosis.pm/zodiac/contracts/factory/FactoryFriendly.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@gnosis.pm/safe-contracts/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ScopeGuard is FactoryFriendly, OwnableUpgradeable, BaseGuard {
    event TargetAllowed(address target);
    event TargetDisallowed(address target);
    event TargetScoped(address target, bool scoped);
    event DelegateCallsAllowedOnTarget(address target);
    event DelegateCallsDisallowedOnTarget(address target);
    event FunctionAllowedOnTarget(address target, bytes4 functionSig);
    event FunctionDisallowedOnTarget(address target, bytes4 functionSig);
    event ScopeGuardSetup(address indexed initiator, address indexed owner);

    constructor(address _owner) {
        bytes memory initializeParams = abi.encode(_owner);
        setUp(initializeParams);
    }

    /// @dev Initialize function, will be triggered when a new proxy is deployed
    /// @param initializeParams Parameters of initialization encoded
    function setUp(bytes memory initializeParams) public override {
        require(!initialized, "Guard is already initialized");
        initialized = true;
        address _owner = abi.decode(initializeParams, (address));
        require(_owner != address(0), "Owner can not be zero address");

        __Ownable_init();
        transferOwnership(_owner);

        emit ScopeGuardSetup(msg.sender, _owner);
    }

    struct Target {
        bool allowed;
        bool scoped;
        bool delegateCallAllowed;
        mapping(bytes4 => bool) allowedFunctions;
    }

    mapping(address => Target) public allowedTargets;

    /// @dev Allows multisig owners to make call to an address.
    /// @notice Only callable by owner.
    /// @param target Address to be allowed.
    function allowTarget(address target) public onlyOwner {
        allowedTargets[target].allowed = true;
        emit TargetAllowed(target);
    }

    /// @dev Disallows multisig owners to make call to an address.
    /// @notice Only callable by owner.
    /// @param target Address to be disallowed.
    function disallowTarget(address target) public onlyOwner {
        allowedTargets[target].allowed = false;
        emit TargetDisallowed(target);
    }

    /// @dev Allows multisig owners to make delegate calls to an address.
    /// @notice Only callable by owner.
    /// @param target Address to which delegate calls will be allowed.
    function allowDelegateCall(address target) public onlyOwner {
        allowedTargets[target].delegateCallAllowed = true;
        emit DelegateCallsAllowedOnTarget(target);
    }

    /// @dev Disallows multisig owners to make delegate calls to an address.
    /// @notice Only callable by owner.
    /// @param target Address to which delegate calls will be disallowed.
    function disallowDelegateCall(address target) public onlyOwner {
        allowedTargets[target].delegateCallAllowed = false;
        emit DelegateCallsDisallowedOnTarget(target);
    }

    /// @dev Sets whether or not calls to an address should be scoped to specific function signatures.
    /// @notice Only callable by owner.
    /// @param target Address that will be scoped/unscoped.
    function toggleScoped(address target) public onlyOwner {
        allowedTargets[target].scoped = !allowedTargets[target].scoped;
        emit TargetScoped(target, allowedTargets[target].scoped);
    }

    function allowFunction(address target, bytes4 functionSig)
        public
        onlyOwner
    {
        /// @dev Allows multisig owners to call specific function on a scoped address.
        /// @notice Only callable by owner.
        /// @param target Address that the function should be allowed.
        /// @param functionSig Function signature to be allowed.
        allowedTargets[target].allowedFunctions[functionSig] = true;
        emit FunctionAllowedOnTarget(target, functionSig);
    }

    /// @dev Disallows multisig owners to call specific function on a scoped address.
    /// @notice Only callable by owner.
    /// @param target Address that the function should be disallowed.
    /// @param functionSig Function signature to be disallowed.
    function disallowFunction(address target, bytes4 functionSig)
        public
        onlyOwner
    {
        allowedTargets[target].allowedFunctions[functionSig] = false;
        emit FunctionDisallowedOnTarget(target, functionSig);
    }

    /// @dev Returns bool to indicate if an address is an allowed target.
    /// @param target Address to check.
    function isAllowedTarget(address target) public view returns (bool) {
        return (allowedTargets[target].allowed);
    }

    /// @dev Returns bool to indicate if an address is scoped.
    /// @param target Address to check.
    function isScoped(address target) public view returns (bool) {
        return (allowedTargets[target].scoped);
    }

    /// @dev Returns bool to indicate if a function signature is allowed for a target address.
    /// @param target Address to check.
    /// @param functionSig Signature to check.
    function isAllowedFunction(address target, bytes4 functionSig)
        public
        view
        returns (bool)
    {
        return (allowedTargets[target].allowedFunctions[functionSig]);
    }

    /// @dev Returns bool to indicate if delegate calls are allowed to a target address.
    /// @param target Address to check.
    function isAllowedToDelegateCall(address target)
        public
        view
        returns (bool)
    {
        return (allowedTargets[target].delegateCallAllowed);
    }

    // solhint-disallow-next-line payable-fallback
    fallback() external {
        // We don't revert on fallback to avoid issues in case of a Safe upgrade
        // E.g. The expected check method might change and then the Safe would be locked.
    }

    function checkTransaction(
        address to,
        uint256,
        bytes memory data,
        Enum.Operation operation,
        uint256,
        uint256,
        uint256,
        address,
        // solhint-disallow-next-line no-unused-vars
        address payable,
        bytes memory,
        address
    ) external view override {
        bool scoped = allowedTargets[to].scoped;
        require(
            operation != Enum.Operation.DelegateCall ||
                allowedTargets[to].delegateCallAllowed,
            "Delegate call not allowed to this address"
        );
        require(isAllowedTarget(to), "Target address is not allowed");
        if (data.length >= 4) {
            require(
                !scoped || isAllowedFunction(to, bytes4(data)),
                "Target function is not allowed"
            );
        } else {
            require(
                !scoped || isAllowedFunction(to, bytes4(0)),
                "Cannot send to this address"
            );
        }
    }

    function checkAfterExecution(bytes32, bool) external view override {}
}
