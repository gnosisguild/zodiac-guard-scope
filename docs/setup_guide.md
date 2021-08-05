# ScopeGuard Setup Guide

This guide shows how to setup a ScopeGuard with a Gnosis Safe on the Rinkeby testnetwork.

## ⚠️ Warning ⚠️

Enabling a ScopeGuard can brick your Safe, making it unusable and rendering any funds inaccessible.
Once enabled on your Safe, your ScopeGuard will revert any transactions to addresses or functions that have not been explicitly allowed.
Before you enable your ScopeGuard, please make sure you have setup the ScopeGuard fully to enable each of the addresses and functions you wish the multisig owners to be able to call.

## Prerequisites

To start the process you need to create a Safe on the Rinkeby test network (e.g. via https://rinkeby.gnosis-safe.io). A Safe transaction is required to setup the ScopeGuard.

For the hardhat tasks to work the environment needs to be properly configured. See the [sample env file](../.env.sample) for more information.

## Setting up the module

The first step is to deploy the ScopeGuard. Every Safe will deploy their own instance of the ScopeGuard.

### Deploying the ScopeGuard

### Setting up the ScopeGuard

### Enabling the ScopeGuard
