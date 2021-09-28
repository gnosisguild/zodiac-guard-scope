# Zodiac Scope Guard

[![Build Status](https://github.com/gnosis/zodiac-guard-scope/actions/workflows/ci.yml/badge.svg)](https://github.com/gnosis/zodiac-guard-scope/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/gnosis/zodiac-guard-scope/badge.svg?branch=main)](https://coveralls.io/github/gnosis/zodiac-guard-scope)

The Scope Guard belongs to the [Zodiac](https://github.com/gnosis/zodiac) collection of tools.

If you have any questions about Zodiac, join the [Gnosis Guild Discord](https://discord.gg/wwmBWTgyEq). Follow [@GnosisGuild](https://twitter.com/gnosisguild) on Twitter for updates.


### About the Scope Guard

This guard allows an avatar or module to limit the scope of the functions with which it can interact. This enables a DAO to define granular permissions for different control mechanisms.

This module is intended to be used with the [Gnosis Safe](https://github.com/gnosis/safe-contracts).


### Features

- Set specific addresses that the Safe signers can call
- Scope the functions that are allowed to be called on specific addresses
- Allow/disallow Safe transactions to use delegate calls to specific addresses

### Flow

- Deploy Scope Guard
- Allow addresses and function calls that the Safe signers should be able to call
- Enable the txguard on the Safe

### Warnings ⚠️

Before you enable Scope Guard, please make sure you have setup the Scope Guard fully to enable each of the addresses and functions you wish the Safe signers to be able to call.

The best practice is to enable another account that you control as a module on your Safe before enabling Scope Guard. 

Some specific things of which you should be aware:

- Enabling Scope Guard can brick your Safe, making it unusable and rendering any funds inaccessible.
  Once enabled on your Safe, your Scope Guard will revert any transactions to addresses or functions that have not been explicitly allowed.
- By default, it is not possible to use delegate call with any contract once your Scope Guard has been enabled.
  This means if Scope Guard is added without allowing delegate calls for the `MultiSendCallOnly` contract, there might be issues when using some Safe Apps available on the Safe web interface.
- Delegate call usage checks are per address. It is not possible to limit this to a specific function of a contract.
- Transaction value is not checked.
  This means that the Safe signers can send any amount of native assets allowed addresses.
- If a contract address is marked as scoped, it is not possible to call any function on this contract UNLESS it was explicitly marked as allowed.
- If the Safe contract itself is marked as scoped without any allowed functions, it is bricked (even if the Safe address itself is in the allowed list).
- Enabling Scope Guard will increase the gas cost of each multisig transaction.

### Solidity Compiler

The contracts have been developed with [Solidity 0.8.6](https://github.com/ethereum/solidity/releases/tag/v0.8.6) in mind. This version of Solidity made all arithmetic checked by default, therefore eliminating the need for explicit overflow or underflow (or other arithmetic) checks.

### Setup Guide

Follow our [Scope Guard Setup Guide](./docs/setup_guide.md).

### Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

### License

Created under the [LGPL-3.0+ license](LICENSE).

### Audits

An audit has been performed by the [G0 group](https://github.com/g0-group).

All issues and notes of the audit have been addressed in commit [ad2579a3fc684b2dd87c5f87c8736cd61e46e4cb](https://github.com/gnosis/zodiac-guard-scope/commit/ad2579a3fc684b2dd87c5f87c8736cd61e46e4cb).

The audit results are available as a pdf in [this repo](audits/ZodiacScopeGuardSep2021.pdf) or on the [g0-group repo](https://github.com/g0-group/Audits/blob/e11752abb010f74e32a6fc61142032a10deed578/ZodiacScopeGuardSep2021.pdf).

### Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
