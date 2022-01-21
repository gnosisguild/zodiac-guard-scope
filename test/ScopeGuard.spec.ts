import { expect } from 'chai';
import hre, { deployments, waffle, ethers } from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import { AddressZero } from '@ethersproject/constants';

enum ExecutionOptions {
  NONE = 0,
  SEND = 1,
  DELEGATE_CALL = 2,
  BOTH = 3,
}

describe('ScopeGuard', async () => {
  const [user1, user2] = waffle.provider.getWallets();
  const abiCoder = new ethers.utils.AbiCoder();
  const initializeParams = abiCoder.encode(['address'], [user1.address]);

  const setupTests = deployments.createFixture(async ({ deployments }) => {
    await deployments.fixture();
    const avatarFactory = await hre.ethers.getContractFactory('TestAvatar');
    const avatar = await avatarFactory.deploy();
    const guardFactory = await hre.ethers.getContractFactory('ScopeGuard');
    const guard = await guardFactory.deploy(user1.address);
    await avatar.enableModule(user1.address);
    await avatar.setGuard(guard.address);
    const tx = {
      to: avatar.address,
      value: 0,
      data: '0x',
      operation: 0,
      avatarTxGas: 0,
      baseGas: 0,
      gasPrice: 0,
      gasToken: AddressZero,
      refundReceiver: AddressZero,
      signatures: '0x',
    };
    return {
      avatar,
      guard,
      tx,
    };
  });

  describe('setUp()', async () => {
    it('throws if guard has already been initialized', async () => {
      const { guard } = await setupTests();
      await expect(guard.setUp(initializeParams)).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });

    it('throws if owner is zero address', async () => {
      const Guard = await hre.ethers.getContractFactory('ScopeGuard');
      await expect(Guard.deploy(AddressZero)).to.be.revertedWith(
        'Ownable: new owner is the zero address'
      );
    });

    it('should emit event because of successful set up', async () => {
      const Guard = await hre.ethers.getContractFactory('ScopeGuard');
      const guard = await Guard.deploy(user1.address);
      await guard.deployed();

      await expect(guard.deployTransaction)
        .to.emit(guard, 'ScopeGuardSetup')
        .withArgs(user1.address, user1.address);
    });
  });

  describe('fallback', async () => {
    it('must NOT revert on fallback without value', async () => {
      const { guard } = await setupTests();
      await user1.sendTransaction({
        to: guard.address,
        data: '0xbaddad',
      });
    });
    it('should revert on fallback with value', async () => {
      const { guard } = await setupTests();
      await expect(
        user1.sendTransaction({
          to: guard.address,
          data: '0xbaddad',
          value: 1,
        })
      ).to.be.reverted;
    });
  });

  describe('checkTransaction()', async () => {
    it('should revert if target is not allowed', async () => {
      const { guard, tx } = await setupTests();
      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user1.address
        )
      ).to.be.revertedWith('TargetAddressNotAllowed()');
    });

    it('should revert delegate call if delegate calls are not allowed to target', async () => {
      const { guard, tx } = await setupTests();
      tx.operation = 1;
      await guard.allowTarget(tx.to);
      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user1.address
        )
      ).to.be.revertedWith('DelegateCallNotAllowed()');
    });

    it('should allow delegate call if delegate calls are allowed to target', async () => {
      const { guard, avatar, tx } = await setupTests();

      await guard.allowTarget(avatar.address);

      tx.operation = 1;

      const checkTransaction = () =>
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user1.address
        );

      await guard.setExecutionOptions(avatar.address, ExecutionOptions.NONE);
      await expect(checkTransaction()).to.be.revertedWith(
        'DelegateCallNotAllowed()'
      );

      await guard.setExecutionOptions(avatar.address, ExecutionOptions.SEND);
      await expect(checkTransaction()).to.be.revertedWith(
        'DelegateCallNotAllowed()'
      );

      await guard.setExecutionOptions(
        avatar.address,
        ExecutionOptions.DELEGATE_CALL
      );
      await expect(checkTransaction()).to.not.be.reverted;

      await guard.setExecutionOptions(avatar.address, ExecutionOptions.BOTH);
      await expect(checkTransaction()).to.not.be.reverted;
    });

    it('should revert if scoped and target function is not allowed', async () => {
      const { avatar, guard, tx } = await setupTests();

      await guard.scopeTarget(avatar.address);

      tx.data = '0x12345678';
      tx.operation = 0;

      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user1.address
        )
      ).to.be.revertedWith('FunctionNotAllowed()');
    });

    it('should revert if scoped and transaction data is greater than 0 and less than 4', async () => {
      const { avatar, guard, tx } = await setupTests();
      await guard.scopeTarget(avatar.address);
      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          0x123456,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user1.address
        )
      ).to.be.revertedWith('FunctionSignatureTooShort()');
    });

    it('should revert if scoped and empty transaction data is disallowed', async () => {
      const { avatar, guard, tx } = await setupTests();
      await guard.scopeTarget(avatar.address);
      tx.data = '0x';
      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user1.address
        )
        //).to.be.revertedWith('Fallback not allowed for this address');
      ).to.be.revertedWith('FunctionNotAllowed()');
    });

    it('should revert if function sig is 0x00000000 and not explicitly approved', async () => {
      const { avatar, guard, tx } = await setupTests();
      await guard.scopeTarget(avatar.address);
      tx.data = '0x00000000';
      const checkTransaction = () =>
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user1.address
        );

      await expect(checkTransaction()).to.be.revertedWith('FunctionNotAllowed');

      await guard.scopeAllowFallback(avatar.address);
      await expect(checkTransaction()).to.not.be.reverted;

      await guard.scopeRevokeFallback(avatar.address);
      await expect(checkTransaction()).to.be.revertedWith('FunctionNotAllowed');

      await guard.scopeAllowFunction(avatar.address, '0x00000000');
      await expect(checkTransaction()).to.not.be.reverted;

      await guard.scopeRevokeFunction(avatar.address, '0x00000000');
      await expect(checkTransaction()).to.be.revertedWith('FunctionNotAllowed');
    });

    it('should revert if value is greater than zero and value is not allowed', async () => {
      const { avatar, guard, tx } = await setupTests();
      await guard.allowTarget(avatar.address);
      tx.data = '0x12345678';
      tx.value = 1;
      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user1.address
        )
      ).to.be.revertedWith('SendNotAllowed()');
    });

    it('should send ETH to target if value is allowed', async () => {
      const { avatar, guard, tx } = await setupTests();
      await guard.allowTarget(avatar.address);

      tx.data = '0x12345678';
      tx.value = 1;
      const checkTransaction = () =>
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user1.address
        );

      await guard.setExecutionOptions(avatar.address, ExecutionOptions.NONE);
      await expect(checkTransaction()).to.be.revertedWith('SendNotAllowed()');

      await guard.setExecutionOptions(avatar.address, ExecutionOptions.SEND);
      await expect(checkTransaction()).to.not.be.reverted;

      await guard.setExecutionOptions(
        avatar.address,
        ExecutionOptions.DELEGATE_CALL
      );
      await expect(checkTransaction()).to.be.revertedWith('SendNotAllowed()');

      await guard.setExecutionOptions(avatar.address, ExecutionOptions.BOTH);
      await expect(checkTransaction()).to.not.be.reverted;
    });

    it('should be callable by an avatar', async () => {
      const { avatar, guard, tx } = await setupTests();
      await guard.allowTarget(guard.address);
      tx.operation = 0;
      tx.to = guard.address;
      tx.value = 0;
      await expect(
        avatar.execTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures
        )
      ).to.not.be.reverted;
    });
  });

  describe('allowTarget()', async () => {
    it('should revert if caller is not owner', async () => {
      const { guard } = await setupTests();
      await expect(
        guard.connect(user2).allowTarget(guard.address)
      ).to.be.revertedWith('caller is not the owner');
    });

    it('should allow a target', async () => {
      const { guard } = await setupTests();
      expect(await guard.isAllowedTarget(guard.address)).to.be.equals(false);
      await expect(guard.allowTarget(guard.address))
        .to.emit(guard, 'AllowTarget')
        .withArgs(guard.address);
      expect(await guard.isAllowedTarget(guard.address)).to.be.equals(true);
    });

    it('should emit AllowTarget(target)', async () => {
      const { avatar, guard } = await setupTests();
      await expect(guard.allowTarget(guard.address))
        .to.emit(guard, 'AllowTarget')
        .withArgs(guard.address);
    });
  });

  describe('revokeTarget()', async () => {
    it('should revert if caller is not owner', async () => {
      const { guard } = await setupTests();
      await expect(
        guard.connect(user2).revokeTarget(guard.address)
      ).to.be.revertedWith('caller is not the owner');
    });

    it('should disallow a target', async () => {
      const { guard } = await setupTests();
      await guard.allowTarget(guard.address);

      expect(await guard.isAllowedTarget(guard.address)).to.be.equals(true);
      await expect(guard.revokeTarget(guard.address))
        .to.emit(guard, 'RevokeTarget')
        .withArgs(guard.address);
      expect(await guard.isAllowedTarget(guard.address)).to.be.equals(false);
    });

    it('should emit RevokeTarget(target)', async () => {
      const { guard } = await setupTests();
      expect(guard.revokeTarget(guard.address))
        .to.emit(guard, 'RevokeTarget')
        .withArgs(guard.address);
    });
  });

  describe('scopeTarget()', async () => {
    it('should revert if caller is not owner', async () => {
      const { guard } = await setupTests();
      expect(
        guard.connect(user2).scopeTarget(guard.address)
      ).to.be.revertedWith('caller is not the owner');
    });

    it('should set clearance Function for a target', async () => {
      const { guard } = await setupTests();

      expect(await guard.isScoped(guard.address)).to.be.equals(false);
      await expect(guard.scopeTarget(guard.address))
        .to.emit(guard, 'ScopeTarget')
        .withArgs(guard.address);
      expect(await guard.isScoped(guard.address)).to.be.equals(true);
    });

    it('should set scoped to false for a target', async () => {
      const { guard } = await setupTests();

      expect(await guard.isScoped(guard.address)).to.be.equals(false);
      await expect(guard.scopeTarget(guard.address))
        .to.emit(guard, 'ScopeTarget')
        .withArgs(guard.address);

      await guard.revokeTarget(guard.address);
      expect(await guard.isScoped(guard.address)).to.be.equals(false);
    });

    it('should emit ScopedTarget(target)', async () => {
      const { guard } = await setupTests();

      await expect(guard.scopeTarget(guard.address))
        .to.emit(guard, 'ScopeTarget')
        .withArgs(guard.address);
    });
  });

  describe('setExecutionOptions()', async () => {
    it('should revert if caller is not owner', async () => {
      const { guard } = await setupTests();
      expect(
        guard
          .connect(user2)
          .setExecutionOptions(guard.address, ExecutionOptions.BOTH)
      ).to.be.revertedWith('caller is not the owner');
    });

    it('should allow delegate calls for a target', async () => {
      const { guard } = await setupTests();
      expect(await guard.isAllowedToDelegateCall(guard.address)).to.be.equals(
        false
      );
      await expect(
        guard.setExecutionOptions(guard.address, ExecutionOptions.DELEGATE_CALL)
      )
        .to.emit(guard, 'SetExecutionOptions')
        .withArgs(guard.address, ExecutionOptions.DELEGATE_CALL);
      expect(await guard.isAllowedToDelegateCall(guard.address)).to.be.equals(
        true
      );
    });

    it('should disallow delegate calls for a target', async () => {
      const { guard } = await setupTests();
      expect(await guard.isAllowedToDelegateCall(guard.address)).to.be.equals(
        false
      );
      await expect(
        guard.setExecutionOptions(guard.address, ExecutionOptions.BOTH)
      )
        .to.emit(guard, 'SetExecutionOptions')
        .withArgs(guard.address, ExecutionOptions.BOTH);
      await expect(
        guard.setExecutionOptions(guard.address, ExecutionOptions.NONE)
      )
        .to.emit(guard, 'SetExecutionOptions')
        .withArgs(guard.address, ExecutionOptions.NONE);
      expect(await guard.isAllowedToDelegateCall(guard.address)).to.be.equals(
        false
      );
    });

    it('should return true if target is allowed to delegate call', async () => {
      const { avatar, guard } = await setupTests();

      expect(await guard.isAllowedToDelegateCall(avatar.address)).to.be.equals(
        false
      );
      await expect(guard.setExecutionOptions(avatar.address, 2));

      expect(await guard.isAllowedToDelegateCall(avatar.address)).to.be.equals(
        true
      );
    });

    it('should emit SetExecutionOptions(target, options)', async () => {
      const { avatar, guard } = await setupTests();
      await expect(
        guard.setExecutionOptions(guard.address, ExecutionOptions.BOTH)
      )
        .to.emit(guard, 'SetExecutionOptions')
        .withArgs(guard.address, ExecutionOptions.BOTH);
    });
  });

  describe('scopeAllowFallback()', async () => {
    it('should revert if caller is not owner', async () => {
      const { guard } = await setupTests();
      expect(
        guard.connect(user2).scopeAllowFallback(guard.address)
      ).to.be.revertedWith('caller is not the owner');
    });

    it('should set fallbackAllowed to true for a target', async () => {
      const { guard } = await setupTests();

      expect(await guard.isfallbackAllowed(guard.address)).to.be.equals(false);
      await expect(guard.scopeAllowFallback(guard.address))
        .to.emit(guard, 'ScopeAllowFunction')
        .withArgs(guard.address, '0x00000000');
      expect(await guard.isfallbackAllowed(guard.address)).to.be.equals(true);
    });

    it('should emit ScopeAllowFunction(target, functionSig)', async () => {
      const { guard } = await setupTests();

      await expect(guard.scopeAllowFallback(guard.address))
        .to.emit(guard, 'ScopeAllowFunction')
        .withArgs(guard.address, '0x00000000');
    });
  });

  describe('scopeRevokeFallback()', async () => {
    it('should revert if caller is not owner', async () => {
      const { guard } = await setupTests();
      expect(
        guard.connect(user2).scopeRevokeFallback(guard.address)
      ).to.be.revertedWith('caller is not the owner');
    });

    it('should set fallbackAllowed to false for a target', async () => {
      const { guard } = await setupTests();

      expect(await guard.isfallbackAllowed(guard.address)).to.be.equals(false);
      await expect(guard.scopeAllowFallback(guard.address))
        .to.emit(guard, 'ScopeAllowFunction')
        .withArgs(guard.address, '0x00000000');
      await expect(guard.scopeRevokeFallback(guard.address))
        .to.emit(guard, 'ScopeRevokeFunction')
        .withArgs(guard.address, '0x00000000');
      expect(await guard.isfallbackAllowed(guard.address)).to.be.equals(false);
    });

    it('should emit ScopeRevokeFunction(target, functionSig)', async () => {
      const { guard } = await setupTests();

      await expect(guard.scopeRevokeFallback(guard.address))
        .to.emit(guard, 'ScopeRevokeFunction')
        .withArgs(guard.address, '0x00000000');
    });
  });

  describe('scopeAllowFunction()', async () => {
    it('should revert if caller is not owner', async () => {
      const { guard } = await setupTests();
      expect(
        guard.connect(user2).scopeAllowFunction(guard.address, '0x12345678')
      ).to.be.revertedWith('caller is not the owner');
    });

    it('should allow function for a target', async () => {
      const { guard } = await setupTests();
      expect(
        await guard.isAllowedFunction(guard.address, '0x12345678')
      ).to.be.equals(false);

      await expect(guard.scopeAllowFunction(guard.address, '0x12345678'))
        .to.emit(guard, 'ScopeAllowFunction')
        .withArgs(guard.address, '0x12345678');
      expect(
        await guard.isAllowedFunction(guard.address, '0x12345678')
      ).to.be.equals(true);
    });

    it('should emit ScopeAllowFunction(address, sig)', async () => {
      const { guard } = await setupTests();
      await expect(guard.scopeAllowFunction(guard.address, '0x12345678'))
        .to.emit(guard, 'ScopeAllowFunction')
        .withArgs(guard.address, '0x12345678');
    });
  });

  describe('scopeRevokeFunction()', async () => {
    it('should revert if caller is not owner', async () => {
      const { guard } = await setupTests();
      await expect(
        guard.connect(user2).scopeRevokeFunction(guard.address, '0x12345678')
      ).to.be.revertedWith('caller is not the owner');
    });

    it('should disallow function for a target', async () => {
      const { guard } = await setupTests();
      expect(
        await guard.isAllowedFunction(guard.address, '0x12345678')
      ).to.be.equals(false);

      await guard.scopeAllowFunction(guard.address, '0x12345678');

      await expect(guard.scopeRevokeFunction(guard.address, '0x12345678'))
        .to.emit(guard, 'ScopeRevokeFunction')
        .withArgs(guard.address, '0x12345678');
      expect(
        await guard.isAllowedFunction(guard.address, '0x12345678')
      ).to.be.equals(false);
    });

    it('should emit ScopeRevokeFunctuion(address, sig)', async () => {
      const { guard } = await setupTests();
      expect(guard.scopeRevokeFunction(guard.address, '0x12345678'))
        .to.emit(guard, 'ScopeRevokeFunction')
        .withArgs(guard.address, '0x12345678');
    });
  });

  describe('isAllowedTarget()', async () => {
    it('should return false if not set', async () => {
      const { avatar, guard } = await setupTests();

      expect(await guard.isAllowedTarget(avatar.address)).to.be.equals(false);
    });

    it('should return true if target is allowed', async () => {
      const { avatar, guard } = await setupTests();

      expect(await guard.isAllowedTarget(avatar.address)).to.be.equals(false);
      await guard.allowTarget(avatar.address);
      expect(await guard.isAllowedTarget(avatar.address)).to.be.equals(true);
    });
  });

  describe('isScoped()', async () => {
    it('should return false if not set', async () => {
      const { guard } = await setupTests();

      expect(await guard.isScoped(guard.address)).to.be.equals(false);
    });

    it('should return false if set to false', async () => {
      const { guard } = await setupTests();

      expect(await guard.isScoped(guard.address)).to.be.equals(false);
      await guard.scopeTarget(guard.address);
      expect(await guard.isScoped(guard.address)).to.be.equals(true);

      await guard.revokeTarget(guard.address);
      expect(await guard.isScoped(guard.address)).to.be.equals(false);
    });

    it('should return true if set to true', async () => {
      const { guard } = await setupTests();

      await guard.scopeTarget(guard.address);
      expect(await guard.isScoped(guard.address)).to.be.equals(true);
    });
  });

  describe('isfallbackAllowed()', async () => {
    it('should return false if not set', async () => {
      const { guard } = await setupTests();

      expect(await guard.isfallbackAllowed(guard.address)).to.be.equals(false);
    });

    it('should return false if set to false', async () => {
      const { guard } = await setupTests();

      expect(await guard.isfallbackAllowed(guard.address)).to.be.equals(false);
      await guard.scopeAllowFallback(guard.address);
      expect(await guard.isfallbackAllowed(guard.address)).to.be.equals(true);
      await guard.scopeRevokeFallback(guard.address);
      expect(await guard.isfallbackAllowed(guard.address)).to.be.equals(false);
    });

    it('should return true if set to true', async () => {
      const { guard } = await setupTests();

      await guard.scopeAllowFallback(guard.address);
      expect(await guard.isfallbackAllowed(guard.address)).to.be.equals(true);
    });
  });

  describe('isAllowedFunction()', async () => {
    it('should return false if not set', async () => {
      const { avatar, guard } = await setupTests();

      expect(
        await guard.isAllowedFunction(avatar.address, '0x12345678')
      ).to.be.equals(false);
    });

    it('should return true if function is allowed', async () => {
      const { guard } = await setupTests();

      expect(
        await guard.isAllowedFunction(guard.address, '0x12345678')
      ).to.be.equals(false);
      expect(guard.scopeAllowFunction(guard.address, '0x12345678'))
        .to.emit(guard, 'ScopeAllowFunction')
        .withArgs(guard.address, '0x12345678');
      expect(
        await guard.isAllowedFunction(guard.address, '0x12345678')
      ).to.be.equals(true);
    });
  });
});
