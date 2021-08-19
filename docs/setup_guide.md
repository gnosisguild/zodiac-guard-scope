# ScopeGuard Setup Guide

This guide shows how to setup a ScopeGuard with a Gnosis Safe on the Rinkeby testnetwork.

_Note: transaction guards only work with safes on version 1.3.0 or greater._

## Warning ⚠️

Enabling a ScopeGuard can brick your Safe, making it unusable and rendering any funds inaccessible.
Once enabled on your Safe, your ScopeGuard will revert any transactions to addresses or functions that have not been explicitly allowed.

Before you enable your ScopeGuard, please make sure you have setup the ScopeGuard fully to enable each of the addresses and functions you wish the multisig owners to be able to call.

Best practice is to enable another account that you control as a module to your Safe before enabling your ScopeGuard.

## Prerequisites

To start the process you need to create a Safe on the Rinkeby test network (e.g. via https://rinkeby.gnosis-safe.io). A Safe transaction is required to setup the ScopeGuard.

Before anything else, you'll need to install the projects dependencies by running `yarn`.

```bash
yarn
```

And then compile the contracts with `yarn build`.

```bash
yarn build
```

For the hardhat tasks to work the environment needs to be properly configured. See the [sample env file](../.env.sample) for more information.

## Deploying the ScopeGuard

The first step is to deploy the ScopeGuard.

_Note: Multiple safes can use the same instance of a ScopeGuard, but they will all have the same settings controlled by the same `owner`. In most cases it is preferable for each safe to have its own instance of ScopeGuard._

```bash
yarn hardhat setup --network rinkeby
```

This will return the address of the ScopeGuard you deployed, with the owner set to the private key you used to deploy the ScopeGuard.

Now you can verify the contract on Etherscan.

```bash
yarn hardhat verifyEtherscan --network rinkeby --guard <scope_guard_address>
```

### Setting up the ScopeGuard

⚠️ Warning, this step is critical to ensure that you do not brick your Safe.

Allow any target addresses that the multisig owners should be allowed to call.

#### Allow a target address

```bash
yarn hardhat allowTarget --network rinkeby --guard <scope_guard_address> --target <target_address>
```

You should use this command once for each address that the multisig owners are allowed to call.

#### Limit the scope of an address

To limit the scope of an address to specific function signatures, you must toggle on `scoped` for that address and then allow the function signature for that address.

```bash
yarn hardhat toggleScoped --network rinkeby --guard <scope_guard_address> --target <target_address>
```

You can use this utitly to generate the function signature for specific functions.

```bash
yarn hardhat getFunctionSignature --function <escaped_function_sighash>
```

Then set allow the specific function signature.

```bash
yarn hardhat allowFunction --network rinkeby --guard <scope_guard_address> --target <target_address> --sig <function_signature>
```

An exampe of an escaped function sighash is `balanceOf\(address\)`.

#### Allow delegate calls to an addresses

To allow the multisig owners to initiate delegate call trasnactions to an address, you must explicitly enable it for that target address.

```bash
yarn hardhat allowDelegateCall --network rinkeby --guard <scope_guard_address> --target <target_address>
```

#### Transferring Ownership of the guard

Once you have set up your guard, you should transfer ownership to the appropriate address (usually the Safe that the guard will be enabled on).

```bash
yarn hardhat transferOwnership --network rinkeby --guard <scope_guard_address> --newOwner <new_owner_address>
```

### Enabling the ScopeGuard

One your scope guard is set up, you'll need to call the `setGuard()` function on your GnosisSafe.
You can do this with a custom contract interaction via the [Gnosis Safe UI](http://gnosis-safe.io/) or the [Gnosis Safe CLI](https://github.com/gnosis/safe-cli).
