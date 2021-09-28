# Zodiac Scope Guard Setup Guide

This guide shows how to setup a Scope Guard with a Gnosis Safe on the Rinkeby testnetwork.

_Note: Transaction guards only work with Safes version 1.3.0 or greater._

## Warning ⚠️

Enabling Scope Guard can brick your Safe, making it unusable and rendering any funds inaccessible.
Once enabled on your Safe, your Scope Guard will revert any transactions to addresses or functions that have not been explicitly allowed.

Before you enable Scope Guard, please make sure you have setup the Scope Guard fully to enable each of the addresses and functions you wish the Safe signers to be able to call.

The best practice is to enable another account that you control as a module on your Safe before enabling Scope Guard. There is a tutorial on [adding a module](https://help.gnosis-safe.io/en/articles/4934427-add-a-module) to a Gnosis Safe.


## Prerequisites

To start the process, you need to create a Safe on the Rinkeby test network (e.g. via https://rinkeby.gnosis-safe.io). A Safe transaction is required to setup Scope Guard.

Before anything else, you'll need to install the project's dependencies by running `yarn`.

```bash
yarn
```

Next, compile the contracts with `yarn build`.

```bash
yarn build
```

For the hardhat tasks to work the environment needs to be properly configured. See the [sample env file](../.env.sample) for more information.

## Deploying Scope Guard

The guard only has one attribute:
- `Owner`: Address that can call setter functions 

_Note: Multiple Safes can use the same instance of Scioe Guard, but they will all have the same settings controlled by the same `owner`. In most cases, it is preferable for each Safe to have its own instance of Scope Guard._

Hardhat tasks can be used to deploy a Scope Guard instance. There are two different ways to deploy the module. The first one is through a normal deployment, passing arguments to the constructor (without the `proxied` flag), or to deploy the Module through a [Minimal Proxy Factory](https://eips.ethereum.org/EIPS/eip-1167) (with the `proxied` flag) to save on gas costs. 

The master copy and factory address can be found in the [Zodiac repository](https://github.com/gnosis/zodiac/blob/master/src/factory/constants.ts). These are the addresses used when deploying the module through the factory.

An example for this on Rinkeby would be:
```bash
yarn hardhat setup --network rinkeby --owner <owner_address>
```

or

```bash
yarn hardhat setup --network rinkeby  --owner <owner_address> --proxied true
```

This should return the address of the deployed Scope Guard. For this guide we assume this to be `0x3939393939393939393939393939393939393939`.

Once the module has been deployed, you should verify the source code. (Note: If you used the factory deployment, the contract should be already verified.) If you use a network that is Etherscan compatible, and you configure the `ETHERSCAN_API_KEY` in your environment, you can use the provided hardhat task to do this.


```bash
yarn hardhat verifyEtherscan --network rinkeby --guard <scope_guard_address> --owner <owner_address>
```

### Setting up Scope Guard

⚠️ Warning: This step is critical to ensure that you do not brick your Safe.

Allow any target addresses that the Safe signers should be allowed to call.

#### Allow a target address

```bash
yarn hardhat allowTarget --network rinkeby --guard <scope_guard_address> --target <target_address>
```

You should use this command once for each address that the Safe signers are allowed to call.

#### Limit the scope of an address

To limit the scope of an address to specific function signatures, you must toggle on `scoped` for that address, and then allow the function signature for that address.

```bash
yarn hardhat toggleScoped --network rinkeby --guard <scope_guard_address> --target <target_address>
```

You can use this utility to generate the function signature for specific functions.

```bash
yarn hardhat getFunctionSignature --function <escaped_function_sighash>
```

Then, set allow the specific function signature.

```bash
yarn hardhat allowFunction --network rinkeby --guard <scope_guard_address> --target <target_address> --sig <function_signature>
```

An exampe of an escaped function sighash is `balanceOf\(address\)`.

#### Allow delegate calls to addresses

To allow the Safe signers to initiate delegate call trasnactions to an address, you must explicitly enable it for that target address.

```bash
yarn hardhat allowDelegateCall --network rinkeby --guard <scope_guard_address> --target <target_address>
```

#### Transferring ownership of a Scope Guard

Once you have set up Scope Guard, you should transfer ownership to the appropriate address (usually the Safe on which the guard will be enabled).

```bash
yarn hardhat transferOwnership --network rinkeby --guard <scope_guard_address> --newOwner <new_owner_address>
```

### Enabling Scope Guard

One your Scope Guard is set up, you'll need to call the `setGuard()` function on your Gnosis Safe.
You can do this with a custom contract interaction via the [Gnosis Safe UI](http://gnosis-safe.io/) or the [Gnosis Safe CLI](https://github.com/gnosis/safe-cli).


### Deploy a master copy 

The master copy contracts can be deployed through the `yarn deploy` command. Note that this only should be done if the Scope Guard contracts are updated. The ones referred to on the [Zodiac repository](https://github.com/gnosis/zodiac/blob/master/src/factory/constants.ts) should be used.