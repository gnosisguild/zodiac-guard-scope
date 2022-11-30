// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.6;

import "@gnosis.pm/zodiac/contracts/guard/BaseGuard.sol";
import "@gnosis.pm/zodiac/contracts/factory/FactoryFriendly.sol";

enum Clearance {
    None,
    Target,
    Function
}

enum ExecutionOptions {
    None,
    Send,
    DelegateCall,
    Both
}

contract ScopeGuard is FactoryFriendly, BaseGuard {
    event AllowTarget(address target);
    event RevokeTarget(address target);
    event ScopeTarget(address target);

    event SetExecutionOptions(address target, ExecutionOptions options);

    event ScopeAllowFunction(address target, bytes4 functionSig);
    event ScopeRevokeFunction(address target, bytes4 functionSig);

    event ScopeGuardSetup(address indexed initiator, address indexed owner);

    /// Function signature too short
    error FunctionSignatureTooShort();

    /// Role not allowed to send to target address
    error SendNotAllowed();

    /// Role not allowed to delegate call to target address
    error DelegateCallNotAllowed();

    /// Role not allowed to call target address
    error TargetAddressNotAllowed();

    /// Role not allowed to call this function on target address
    error FunctionNotAllowed();

    bytes4 internal constant FALLBACK_FUNCTION_SIG = 0x00000000;

    constructor(address _owner) {
        bytes memory initializeParams = abi.encode(_owner);
        setUp(initializeParams);
    }

    /// @dev Initialize function, will be triggered when a new proxy is deployed
    /// @param initializeParams Parameters of initialization encoded
    function setUp(bytes memory initializeParams) public override {
        __Ownable_init();
        address _owner = abi.decode(initializeParams, (address));

        transferOwnership(_owner);

        emit ScopeGuardSetup(msg.sender, _owner);
    }

    struct Target {
        Clearance clearance;
        ExecutionOptions options;
        mapping(bytes4 => bool) allowedFunctions;
    }

    mapping(address => Target) public targets;

    /// @dev Allows all calls made to an address.
    /// @notice Only callable by owner.
    /// @param target Address to be allowed
    function allowTarget(address target) public onlyOwner {
        targets[target].clearance = Clearance.Target;
        emit AllowTarget(target);
    }

    /// @dev Disallows all calls made to an address.
    /// @notice Only callable by owner.
    /// @param target Address to be disallowed.
    function revokeTarget(address target) public onlyOwner {
        targets[target].clearance = Clearance.None;
        emit RevokeTarget(target);
    }

    /// @dev Scopes calls to an address, limited to specific function signatures.
    /// @notice Only callable by owner.
    /// @param target Address to be scoped.
    function scopeTarget(address target) public onlyOwner {
        targets[target].clearance = Clearance.Function;
        emit ScopeTarget(target);
    }

    /// @dev Sets whether or not delegate calls and/or eth can be sent to a target.
    /// @notice Only callable by owner.
    /// @param target Address to which delegate calls should be allowed/disallowed.
    /// @param options One of None, Send, DelegateCall or Both
    function setExecutionOptions(address target, ExecutionOptions options)
        public
        onlyOwner
    {
        targets[target].options = options;
        emit SetExecutionOptions(target, options);
    }

    /// @dev Allows a specific function signature on a scoped target.
    /// @notice Only callable by owner.
    /// @param target Scoped address on which a function signature should be allowed
    /// @param functionSig Function signature to be allowed
    function scopeAllowFunction(address target, bytes4 functionSig)
        public
        onlyOwner
    {
        targets[target].allowedFunctions[functionSig] = true;
        emit ScopeAllowFunction(target, functionSig);
    }

    /// @dev Disallows a specific function signature on a scoped target.
    /// @notice Only callable by owner.
    /// @param target Scoped address on which a function signature should be disallowed
    /// @param functionSig Function signature to be disallowed
    function scopeRevokeFunction(address target, bytes4 functionSig)
        public
        onlyOwner
    {
        targets[target].allowedFunctions[functionSig] = false;
        emit ScopeRevokeFunction(target, functionSig);
    }

    /// @dev Allows the fallback function on a scoped target.
    /// @notice Only callable by owner.
    /// @param target Scoped address on which a function signature should be allowed
    function scopeAllowFallback(address target) public onlyOwner {
        scopeAllowFunction(target, FALLBACK_FUNCTION_SIG);
    }

    /// @dev Disallows the fallback function on a scoped target.
    /// @notice Only callable by owner.
    /// @param target Scoped address on which a function signature should be disallowed
    function scopeRevokeFallback(address target) public onlyOwner {
        scopeRevokeFunction(target, FALLBACK_FUNCTION_SIG);
    }

    /// @dev Returns bool to indicate if an address is an allowed target.
    /// @param target Address to check.
    function isTargetAllowed(address target) public view returns (bool) {
        return targets[target].clearance == Clearance.Target;
    }

    /// @dev Returns bool to indicate if an address is scoped.
    /// @param target Address to check.
    function isTargetScoped(address target) public view returns (bool) {
        return targets[target].clearance == Clearance.Function;
    }

    /// @dev Returns bool to indicate if a function signature is allowed for a target address.
    /// @param target Address to check.
    /// @param functionSig Signature to check.
    function isFunctionAllowed(address target, bytes4 functionSig)
        public
        view
        returns (bool)
    {
        return targets[target].allowedFunctions[functionSig] == true;
    }

    /// @dev Returns bool to indicate if fallback is allowed on a target.
    /// @param target Address to check.
    function isFallbackAllowed(address target) public view returns (bool) {
        return targets[target].allowedFunctions[FALLBACK_FUNCTION_SIG] == true;
    }

    /// @dev Returns bool to indicate if ETH can be sent to a target.
    /// @param target Address to check.
    function canSendToTarget(address target) public view returns (bool) {
        return
            targets[target].options == ExecutionOptions.Send ||
            targets[target].options == ExecutionOptions.Both;
    }

    /// @dev Returns bool to indicate if delegate calls are allowed to a target address.
    /// @param target Address to check.
    function canDelegateCallToTarget(address target)
        public
        view
        returns (bool)
    {
        return
            targets[target].options == ExecutionOptions.DelegateCall ||
            targets[target].options == ExecutionOptions.Both;
    }

    // solhint-disallow-next-line payable-fallback
    fallback() external {
        // We don't revert on fallback to avoid issues in case of a Safe upgrade
        // E.g. The expected check method might change and then the Safe would be locked.
    }

    function checkTransaction(
        address to,
        uint256 value,
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
        if (data.length != 0 && data.length < 4) {
            revert FunctionSignatureTooShort();
        }

        Target storage target = targets[to];

        if (target.clearance == Clearance.None) {
            revert TargetAddressNotAllowed();
        }

        if (
            value > 0 &&
            target.options != ExecutionOptions.Send &&
            target.options != ExecutionOptions.Both
        ) {
            // isSend && !canSend
            revert SendNotAllowed();
        }

        if (
            operation == Enum.Operation.DelegateCall &&
            target.options != ExecutionOptions.DelegateCall &&
            target.options != ExecutionOptions.Both
        ) {
            // isDelegateCall && !canDelegateCall
            revert DelegateCallNotAllowed();
        }

        if (target.clearance == Clearance.Target) {
            return;
        }

        if (target.clearance == Clearance.Function) {
            if (targets[to].allowedFunctions[bytes4(data)] == false) {
                revert FunctionNotAllowed();
            }
            return;
        }

        assert(false);
    }

    function checkAfterExecution(bytes32, bool) external view override {}
}
