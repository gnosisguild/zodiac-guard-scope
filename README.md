# ScopeGuard

[![Build Status](https://github.com/gnosis/ScopeGuard/workflows/ScopeGuard/badge.svg?branch=main)](https://github.com/gnosis/ScopeGuard/actions)
[![Coverage Status](https://coveralls.io/repos/github/gnosis/ScopeGuard/badge.svg?branch=main)](https://coveralls.io/github/gnosis/ScopeGuard)

A transaction guard that allows the owner to limit a Gnosis Safe's multisig owners to calling specific function signatures on specific contracts.

### Features

- Set specific addresses that the multisig owners can call
- Scope the functions that are allowed to be called on specific addresses
- Allow/disallow multisig transaction to use delegate calls to specific addresses

### Flow

- Deploy ScopeGuard
- Enqueue transactions by calling `execTransactionFromModule()`
- Wait for cooldown ⏱️
- Anyone can execute the next transaction by calling `executeNextTx`

### Solidity Compiler

The contracts have been developed with [Solidity 0.8.0](https://github.com/ethereum/solidity/releases/tag/v0.8.0) in mind. This version of Solidity made all arithmetic checked by default, therefore eliminating the need for explicit overflow or underflow (or other arithmetic) checks.

### Setup Guide

Follow our [ScopeGuard Setup Guide](./docs/setup_guide.md) to setup and use a DelayModule.
