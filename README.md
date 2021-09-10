# ScopeGuard

[![Build Status](https://github.com/gnosis/zodiac-guard-scope/actions/workflows/ci.yml/badge.svg)](https://github.com/gnosis/zodiac-guard-scope/actions/workflows/ci.yml)

[![Coverage Status](https://coveralls.io/repos/github/gnosis/zodiac-guard-scope/badge.svg?branch=main)](https://coveralls.io/github/gnosis/zodiac-guard-scope)

A transaction guard that allows the owner to limit a Gnosis Safe's multisig owners to calling specific function signatures on specific contracts.

### Features

- Set specific addresses that the multisig owners can call
- Scope the functions that are allowed to be called on specific addresses
- Allow/disallow multisig transaction to use delegate calls to specific addresses

### Flow

- Deploy ScopeGuard
- Allow addresses and function calls that the Safe multisig signers should be able to call
- Enable the txguard in the Safe

### Warnings ⚠️

Before you enable your ScopeGuard, please make sure you have setup the ScopeGuard fully to enable each of the addresses and functions you wish the multisig owners to be able to call.

Best practice is to enable another account that you control as a module to your Safe before enabling your ScopeGuard.

Some specific things you should be aware of:

- Enabling a ScopeGuard can brick your Safe, making it unusable and rendering any funds inaccessible.
  Once enabled on your Safe, your ScopeGuard will revert any transactions to addresses or functions that have not been explicitly allowed.
- By default it is not possible to use delegate call with any contract once your ScopeGuard is enabled.
  This means if the ScopeGuard is added without allowing delegate calls for the `MultiSendCallOnly` contract, there might be issues when using some Safe apps via the Safe web interface.
- Delegate call usage checks are per address. It is not possible to limit this to a specific function of a contract.
- Transaction value is not checked.
  This means that the multisig owners can send any amount of native assets allowed addresses.
- If a contract address is marked as scoped it is not possible to call any function on this contract UNLESS it was explicitly marked as allowed.
- If the Safe contract itself is marked as scoped without any allowed functions, it is bricked (even if the Safe address itself is in the allowed list).
- Enabling the ScopeGuard will increase the gas cost of each multisig transaction.

### Solidity Compiler

The contracts have been developed with [Solidity 0.8.6](https://github.com/ethereum/solidity/releases/tag/v0.8.6) in mind. This version of Solidity made all arithmetic checked by default, therefore eliminating the need for explicit overflow or underflow (or other arithmetic) checks.

### Setup Guide

Follow our [ScopeGuard Setup Guide](./docs/setup_guide.md) to setup and use a ScopeGuard.
