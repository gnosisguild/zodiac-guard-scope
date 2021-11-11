import { expect } from "chai";
import hre, { deployments, waffle, ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { AddressZero } from "@ethersproject/constants";

describe("ScopeGuard", async () => {
  const [user1, user2] = waffle.provider.getWallets();
  const abiCoder = new ethers.utils.AbiCoder();
  const initializeParams = abiCoder.encode(["address"], [user1.address]);

  const setupTests = deployments.createFixture(async ({ deployments }) => {
    await deployments.fixture();
    const avatarFactory = await hre.ethers.getContractFactory("TestAvatar");
    const avatar = await avatarFactory.deploy();
    const guardFactory = await hre.ethers.getContractFactory("ScopeGuard");
    const guard = await guardFactory.deploy(user1.address);
    await avatar.enableModule(user1.address);
    await avatar.setGuard(guard.address);
    const tx = {
      to: avatar.address,
      value: 0,
      data: "0x",
      operation: 0,
      avatarTxGas: 0,
      baseGas: 0,
      gasPrice: 0,
      gasToken: AddressZero,
      refundReceiver: AddressZero,
      signatures: "0x",
    };
    return {
      avatar,
      guard,
      tx,
    };
  });

  describe("setUp()", async () => {
    it("throws if guard has already been initialized", async () => {
      const { guard } = await setupTests();
      await expect(guard.setUp(initializeParams)).to.be.revertedWith(
        "Initializable: contract is already initialized"
      );
    });

    it("throws if owner is zero address", async () => {
      const Guard = await hre.ethers.getContractFactory("ScopeGuard");
      await expect(Guard.deploy(AddressZero)).to.be.revertedWith(
        "Ownable: new owner is the zero address"
      );
    });

    it("should emit event because of successful set up", async () => {
      const Guard = await hre.ethers.getContractFactory("ScopeGuard");
      const guard = await Guard.deploy(user1.address);
      await guard.deployed();

      await expect(guard.deployTransaction)
        .to.emit(guard, "ScopeGuardSetup")
        .withArgs(user1.address, user1.address);
    });
  });

  describe("fallback", async () => {
    it("must NOT revert on fallback without value", async () => {
      const { guard } = await setupTests();
      await user1.sendTransaction({
        to: guard.address,
        data: "0xbaddad",
      });
    });
    it("should revert on fallback with value", async () => {
      const { guard } = await setupTests();
      await expect(
        user1.sendTransaction({
          to: guard.address,
          data: "0xbaddad",
          value: 1,
        })
      ).to.be.reverted;
    });
  });

  describe("checkTransaction()", async () => {
    it("should revert if target is not allowed", async () => {
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
      ).to.be.revertedWith("Target address is not allowed");
    });

    it("should revert delegate call if delegate calls are not allowed to target", async () => {
      const { guard, tx } = await setupTests();
      tx.operation = 1;
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
      ).to.be.revertedWith("Delegate call not allowed to this address");
    });

    it("should allow delegate call if delegate calls are allowed to target", async () => {
      const { guard, avatar, tx } = await setupTests();

      await guard.setTargetAllowed(avatar.address, true);
      await guard.setDelegateCallAllowedOnTarget(avatar.address, true);
      tx.operation = 1;

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
      );
    });

    it("should revert if scoped and target function is not allowed", async () => {
      const { avatar, guard, tx } = await setupTests();
      await guard.setTargetAllowed(avatar.address, true);
      await guard.setScoped(avatar.address, true);
      tx.data = "0x12345678";
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
      ).to.be.revertedWith("Target function is not allowed");
    });

    it("should revert if scoped and transaction data is greater than 0 and less than 4", async () => {
      const { avatar, guard, tx } = await setupTests();
      await guard.setTargetAllowed(avatar.address, true);
      await guard.setScoped(avatar.address, true);
      tx.value = 1;
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
      ).to.be.revertedWith("Function signature too short");
    });

    it("should revert if scoped and no transaction data is disallowed", async () => {
      const { avatar, guard, tx } = await setupTests();
      await guard.setTargetAllowed(avatar.address, true);
      await guard.setScoped(avatar.address, true);
      tx.data = "0x";
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
      ).to.be.revertedWith("Cannot send to this address");
    });

    it("should revert if function sig is 0x00000000 and not explicitly approved", async () => {
      const { avatar, guard, tx } = await setupTests();
      await guard.setTargetAllowed(avatar.address, true);
      await guard.setScoped(avatar.address, true);
      await guard.setSendAllowedOnTarget(avatar.address, false);
      await guard.setAllowedFunction(avatar.address, "0x00000000", false);
      tx.data = "0x00000000";
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
      ).to.be.revertedWith("Target function is not allowed");
    });

    it("should send to target is send is allowed", async () => {
      const { avatar, guard, tx } = await setupTests();
      await guard.setTargetAllowed(avatar.address, true);
      await guard.setScoped(avatar.address, true);
      await guard.setSendAllowedOnTarget(avatar.address, true);
      tx.data = "0x";
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
      );
    });

    it("should be callable by an avatar", async () => {
      const { avatar, guard, tx } = await setupTests();
      expect(guard.setTargetAllowed(guard.address, true));
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
      );
    });
  });

  describe("setTargetAllowed()", async () => {
    it("should revert if caller is not owner", async () => {
      const { guard } = await setupTests();
      expect(
        guard.connect(user2).setTargetAllowed(guard.address, true)
      ).to.be.revertedWith("caller is not the owner");
    });

    it("should allow a target", async () => {
      const { avatar, guard } = await setupTests();
      expect(await guard.isAllowedTarget(guard.address)).to.be.equals(false);
      expect(guard.setTargetAllowed(guard.address, true))
        .to.emit(guard, "SetTargetAllowed")
        .withArgs(guard.address, true);
      await expect(await guard.isAllowedTarget(guard.address)).to.be.equals(
        true
      );
    });

    it("should disallow a target", async () => {
      const { avatar, guard } = await setupTests();
      expect(await guard.isAllowedTarget(guard.address)).to.be.equals(false);
      expect(guard.setTargetAllowed(guard.address, true))
        .to.emit(guard, "SetTargetAllowed")
        .withArgs(guard.address, true);
      expect(guard.setTargetAllowed(guard.address, false))
        .to.emit(guard, "SetTargetAllowed")
        .withArgs(guard.address, false);
      expect(await guard.isAllowedTarget(guard.address)).to.be.equals(false);
    });

    it("should emit SetTargetAllowed(target, allowed)", async () => {
      const { avatar, guard } = await setupTests();
      expect(guard.setTargetAllowed(guard.address, false))
        .to.emit(guard, "SetTargetAllowed")
        .withArgs(guard.address, false);
    });
  });

  describe("setDelegateCallAllowedOnTarget()", async () => {
    it("should revert if caller is not owner", async () => {
      const { guard } = await setupTests();
      expect(
        guard.connect(user2).setDelegateCallAllowedOnTarget(guard.address, true)
      ).to.be.revertedWith("caller is not the owner");
    });

    it("should allow delegate calls for a target", async () => {
      const { avatar, guard } = await setupTests();
      expect(await guard.isAllowedToDelegateCall(guard.address)).to.be.equals(
        false
      );
      expect(guard.setDelegateCallAllowedOnTarget(guard.address, true))
        .to.emit(guard, "SetDelegateCallAllowedOnTarget")
        .withArgs(guard.address, true);
      expect(await guard.isAllowedToDelegateCall(guard.address)).to.be.equals(
        true
      );
    });

    it("should disallow delegate calls for a target", async () => {
      const { avatar, guard } = await setupTests();
      expect(await guard.isAllowedToDelegateCall(guard.address)).to.be.equals(
        false
      );
      expect(guard.setDelegateCallAllowedOnTarget(guard.address, true))
        .to.emit(guard, "SetDelegateCallAllowedOnTarget")
        .withArgs(guard.address, true);
      expect(guard.setDelegateCallAllowedOnTarget(guard.address, false))
        .to.emit(guard, "SetDelegateCallAllowedOnTarget")
        .withArgs(guard.address, false);
      expect(await guard.isAllowedToDelegateCall(guard.address)).to.be.equals(
        false
      );
    });

    it("should emit DelegateCallsAllowedOnTarget(target, allowed)", async () => {
      const { avatar, guard } = await setupTests();
      expect(guard.setDelegateCallAllowedOnTarget(guard.address, true))
        .to.emit(guard, "SetDelegateCallAllowedOnTarget")
        .withArgs(guard.address, true);
    });
  });

  describe("setScoped()", async () => {
    it("should revert if caller is not owner", async () => {
      const { guard } = await setupTests();
      expect(
        guard.connect(user2).setScoped(guard.address, true)
      ).to.be.revertedWith("caller is not the owner");
    });

    it("should set scoped to true for a target", async () => {
      const { guard } = await setupTests();

      expect(await guard.isScoped(guard.address)).to.be.equals(false);
      expect(guard.setScoped(guard.address, true))
        .to.emit(guard, "SetTargetScoped")
        .withArgs(guard.address, true);
      expect(await guard.isScoped(guard.address)).to.be.equals(true);
    });

    it("should set scoped to false for a target", async () => {
      const { guard } = await setupTests();

      expect(await guard.isScoped(guard.address)).to.be.equals(false);
      expect(guard.setScoped(guard.address, true))
        .to.emit(guard, "SetTargetScoped")
        .withArgs(guard.address, true);
      expect(guard.setScoped(guard.address, false))
        .to.emit(guard, "SetTargetScoped")
        .withArgs(guard.address, false);
      expect(await guard.isScoped(guard.address)).to.be.equals(false);
    });

    it("should emit SetTargetScoped(target, scoped)", async () => {
      const { guard } = await setupTests();

      expect(guard.setScoped(guard.address, true))
        .to.emit(guard, "SetTargetScoped")
        .withArgs(guard.address, true);
    });
  });

  describe("setAllowedFunction()", async () => {
    it("should revert if caller is not owner", async () => {
      const { guard } = await setupTests();
      expect(
        guard
          .connect(user2)
          .setAllowedFunction(guard.address, "0x12345678", true)
      ).to.be.revertedWith("caller is not the owner");
    });

    it("should allow function for a target", async () => {
      const { guard } = await setupTests();
      expect(
        await guard.isAllowedFunction(guard.address, "0x12345678")
      ).to.be.equals(false);
      expect(guard.setAllowedFunction(guard.address, "0x12345678", true))
        .to.emit(guard, "SetFunctionAllowedOnTarget")
        .withArgs(guard.address, "0x12345678", true);
      expect(
        await guard.isAllowedFunction(guard.address, "0x12345678")
      ).to.be.equals(true);
    });

    it("should disallow function for a target", async () => {
      const { guard } = await setupTests();
      expect(
        await guard.isAllowedFunction(guard.address, "0x12345678")
      ).to.be.equals(false);
      expect(guard.setAllowedFunction(guard.address, "0x12345678", true))
        .to.emit(guard, "SetFunctionAllowedOnTarget")
        .withArgs(guard.address, "0x12345678", true);
      expect(guard.setAllowedFunction(guard.address, "0x12345678", false))
        .to.emit(guard, "SetFunctionAllowedOnTarget")
        .withArgs(guard.address, "0x12345678", false);
      expect(
        await guard.isAllowedFunction(guard.address, "0x12345678")
      ).to.be.equals(false);
    });

    it("should emit SetFunctionAllowedOnTarget(address, sig, allowed)", async () => {
      const { avatar, guard } = await setupTests();
      expect(guard.setAllowedFunction(guard.address, "0x12345678", false))
        .to.emit(guard, "SetFunctionAllowedOnTarget")
        .withArgs(guard.address, "0x12345678", false);
    });
  });

  describe("isAllowedTarget", async () => {
    it("should return false if not set", async () => {
      const { avatar, guard } = await setupTests();

      expect(await guard.isAllowedTarget(avatar.address)).to.be.equals(false);
    });

    it("should return true if target is allowed", async () => {
      const { avatar, guard } = await setupTests();

      expect(await guard.isAllowedTarget(avatar.address)).to.be.equals(false);
      expect(guard.setTargetAllowed(avatar.address, true));
      expect(await guard.isAllowedTarget(avatar.address)).to.be.equals(true);
    });
  });

  describe("isScoped", async () => {
    it("should return false if not set", async () => {
      const { avatar, guard } = await setupTests();

      expect(await guard.isScoped(guard.address)).to.be.equals(false);
    });

    it("should return false if set to false", async () => {
      const { guard } = await setupTests();

      expect(guard.setScoped(guard.address, false));
      expect(await guard.isScoped(guard.address)).to.be.equals(false);
    });

    it("should return true if set to true", async () => {
      const { guard } = await setupTests();

      expect(await guard.isScoped(guard.address)).to.be.equals(false);
      expect(guard.setScoped(guard.address, true));
      expect(await guard.isScoped(guard.address)).to.be.equals(true);
    });
  });

  describe("isAllowedFunction", async () => {
    it("should return false if not set", async () => {
      const { avatar, guard } = await setupTests();

      expect(
        await guard.isAllowedFunction(avatar.address, "0x12345678")
      ).to.be.equals(false);
    });

    it("should return true if function is allowed", async () => {
      const { guard } = await setupTests();

      expect(
        await guard.isAllowedFunction(guard.address, "0x12345678")
      ).to.be.equals(false);
      expect(guard.setAllowedFunction(guard.address, "0x12345678", true))
        .to.emit(guard, "SetFunctionAllowedOnTarget")
        .withArgs(guard.address, "0x12345678", true);
      expect(
        await guard.isAllowedFunction(guard.address, "0x12345678")
      ).to.be.equals(true);
    });
  });

  describe("isAllowedToDelegateCall", async () => {
    it("should return false by default", async () => {
      const { avatar, guard } = await setupTests();

      expect(await guard.isAllowedTarget(avatar.address)).to.be.equals(false);
    });

    it("should return true if target is allowed to delegate call", async () => {
      const { avatar, guard } = await setupTests();

      expect(await guard.isAllowedToDelegateCall(avatar.address)).to.be.equals(
        false
      );
      expect(guard.setDelegateCallAllowedOnTarget(avatar.address, true));
      expect(await guard.isAllowedToDelegateCall(avatar.address)).to.be.equals(
        true
      );
    });
  });
});
