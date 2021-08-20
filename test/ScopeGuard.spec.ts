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
    const executorFactory = await hre.ethers.getContractFactory("TestExecutor");
    const safe = await executorFactory.deploy();
    const guardFactory = await hre.ethers.getContractFactory("ScopeGuard");
    const guard = await guardFactory.deploy(AddressZero);
    await guard.setUp(initializeParams);
    await safe.enableModule(user1.address);
    await safe.setGuard(guard.address);
    const tx = {
      to: safe.address,
      value: 0,
      data: "0x",
      operation: 0,
      safeTxGas: 0,
      baseGas: 0,
      gasPrice: 0,
      gasToken: AddressZero,
      refundReceiver: AddressZero,
      signatures: "0x",
    };
    return {
      safe,
      guard,
      tx,
    };
  });

  describe("setUp", async () => {
    it("throws if guard has already been initialized", async () => {
      const { guard } = await setupTests();
      await expect(guard.setUp(initializeParams)).to.be.revertedWith(
        "Guard is already initialized"
      );
    });

    it("should emit event because of successful set up", async () => {
      const Guard = await hre.ethers.getContractFactory("ScopeGuard");
      const guard = await Guard.deploy(AddressZero);
      const setupTx = await guard.setUp(initializeParams);
      const transaction = await setupTx.wait();

      const [initiator, owner] = transaction.events[2].args;

      expect(owner).to.be.equal(user1.address);
      expect(initiator).to.be.equal(user1.address);
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

  describe("checkTransaction", async () => {
    it("should revert if target is not allowed", async () => {
      const { guard, tx } = await setupTests();
      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.safeTxGas,
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
          tx.safeTxGas,
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
      const { guard, safe, tx } = await setupTests();

      await guard.allowTarget(safe.address);
      await guard.allowDelegateCall(safe.address);
      tx.operation = 1;

      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.safeTxGas,
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
      const { safe, guard, tx } = await setupTests();
      await guard.allowTarget(safe.address);
      await guard.toggleScoped(safe.address);
      tx.data = "0x12345678";
      tx.operation = 0;

      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.safeTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user1.address
        )
      ).to.be.revertedWith("Target function is not allowed");
    });

    it("should revert if scoped and no transaction data is disallowed", async () => {
      const { safe, guard, tx } = await setupTests();
      await guard.allowTarget(safe.address);
      await guard.toggleScoped(safe.address);
      tx.data = "0x";
      tx.value = 1;
      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.safeTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user1.address
        )
      ).to.be.revertedWith("Cannot send to this address");
    });

    it("it should be callable by a safe", async () => {
      const { safe, guard, tx } = await setupTests();
      await guard.allowTarget(guard.address);
      tx.operation = 0;
      tx.to = guard.address;
      tx.value = 0;
      await expect(
        safe.execTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.safeTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures
        )
      );
    });
  });

  describe("allowTarget", async () => {
    it("should revert if caller is not owner", async () => {
      const { guard } = await setupTests();
      await expect(
        guard.connect(user2).allowTarget(guard.address)
      ).to.be.revertedWith("caller is not the owner");
    });

    it("should allowe a target", async () => {
      const { safe, guard } = await setupTests();
      await expect(await guard.isAllowedTarget(guard.address)).to.be.equals(
        false
      );
      await expect(guard.allowTarget(guard.address));
      await expect(await guard.isAllowedTarget(guard.address)).to.be.equals(
        true
      );
    });

    it("should emit TargetAllowed(target)", async () => {
      const { safe, guard } = await setupTests();
      await expect(guard.allowTarget(safe.address))
        .to.emit(guard, "TargetAllowed")
        .withArgs(safe.address);
    });
  });

  describe("disalowTarget", async () => {
    it("should revert if caller is not owner", async () => {
      const { guard } = await setupTests();
      await expect(
        guard.connect(user2).disallowTarget(guard.address)
      ).to.be.revertedWith("caller is not the owner");
    });

    it("should disallow a target", async () => {
      const { guard } = await setupTests();

      await expect(guard.allowTarget(guard.address));
      await expect(await guard.isAllowedTarget(guard.address)).to.be.equals(
        true
      );
      await expect(guard.disallowTarget(guard.address));
      await expect(await guard.isAllowedTarget(guard.address)).to.be.equals(
        false
      );
    });

    it("should emit TargetDisallowed(target)", async () => {
      const { safe, guard } = await setupTests();
      await expect(guard.disallowTarget(safe.address))
        .to.emit(guard, "TargetDisallowed")
        .withArgs(safe.address);
    });
  });

  describe("allowDelegateCall", async () => {
    it("should revert if caller is not owner", async () => {
      const { guard } = await setupTests();
      await expect(
        guard.connect(user2).allowDelegateCall(guard.address)
      ).to.be.revertedWith("caller is not the owner");
    });

    it("should allow delegate calls for a target", async () => {
      const { safe, guard } = await setupTests();
      await expect(
        await guard.isAllowedToDelegateCall(guard.address)
      ).to.be.equals(false);
      await expect(guard.allowDelegateCall(guard.address));
      await expect(
        await guard.isAllowedToDelegateCall(guard.address)
      ).to.be.equals(true);
    });

    it("should emit DelegateCallsAllowedOnTarget(target)", async () => {
      const { safe, guard } = await setupTests();
      await expect(guard.allowDelegateCall(safe.address))
        .to.emit(guard, "DelegateCallsAllowedOnTarget")
        .withArgs(safe.address);
    });
  });

  describe("disallowDelegateCall", async () => {
    it("should revert if caller is not owner", async () => {
      const { guard } = await setupTests();
      await expect(
        guard.connect(user2).disallowTarget(guard.address)
      ).to.be.revertedWith("caller is not the owner");
    });

    it("should disallow delegate calls for a target", async () => {
      const { guard } = await setupTests();
      await guard.allowDelegateCall(guard.address);
      await expect(
        await guard.isAllowedToDelegateCall(guard.address)
      ).to.be.equals(true);
      await expect(guard.disallowDelegateCall(guard.address));
      await expect(
        await guard.isAllowedToDelegateCall(guard.address)
      ).to.be.equals(false);
    });

    it("should emit DelegateCallsDisllowedOnTarget(target)", async () => {
      const { safe, guard } = await setupTests();
      await guard.allowDelegateCall(safe.address);
      await expect(guard.disallowDelegateCall(safe.address))
        .to.emit(guard, "DelegateCallsDisallowedOnTarget")
        .withArgs(safe.address);
    });
  });

  describe("allowFunction", async () => {
    it("should revert if caller is not owner", async () => {
      const { guard } = await setupTests();
      await expect(
        guard.connect(user2).allowFunction(guard.address, "0x12345678")
      ).to.be.revertedWith("caller is not the owner");
    });

    it("should allow function for a target", async () => {
      const { guard } = await setupTests();
      await expect(
        await guard.isAllowedFunction(guard.address, "0x12345678")
      ).to.be.equals(false);
      await expect(guard.allowFunction(guard.address, "0x12345678"));
      await expect(
        await guard.isAllowedFunction(guard.address, "0x12345678")
      ).to.be.equals(true);
    });

    it("should emit FunctionAllowedOnTargetarget(address, sig)", async () => {
      const { safe, guard } = await setupTests();
      await expect(guard.allowFunction(safe.address, "0x12345678"))
        .to.emit(guard, "FunctionAllowedOnTarget")
        .withArgs(safe.address, "0x12345678");
    });
  });

  describe("disallowFunction", async () => {
    it("should revert if caller is not owner", async () => {
      const { guard } = await setupTests();
      await expect(
        guard.connect(user2).disallowFunction(guard.address, "0x12345678")
      ).to.be.revertedWith("caller is not the owner");
    });

    it("should disallow function for a target", async () => {
      const { guard } = await setupTests();
      await guard.allowFunction(guard.address, "0x12345678");
      await expect(
        await guard.isAllowedFunction(guard.address, "0x12345678")
      ).to.be.equals(true);
      await expect(guard.disallowFunction(guard.address, "0x12345678"));
      await expect(
        await guard.isAllowedFunction(guard.address, "0x12345678")
      ).to.be.equals(false);
    });

    it("should emit FunctionDisallowedOnTarget(target, sig)", async () => {
      const { safe, guard } = await setupTests();
      await guard.allowFunction(safe.address, "0x12345678");
      await expect(guard.disallowFunction(safe.address, "0x12345678"))
        .to.emit(guard, "FunctionDisallowedOnTarget")
        .withArgs(safe.address, "0x12345678");
    });
  });

  describe("setScope", async () => {
    it("should revert if caller is not owner", async () => {
      const { guard } = await setupTests();
      await expect(
        guard.connect(user2).toggleScoped(guard.address)
      ).to.be.revertedWith("caller is not the owner");
    });

    it("should set scoped for a target", async () => {
      const { guard } = await setupTests();

      await expect(await guard.isScoped(guard.address)).to.be.equals(false);
      await expect(await guard.toggleScoped(guard.address));
      await expect(await guard.isScoped(guard.address)).to.be.equals(true);
    });

    it("should emit TargetScoped(target, scoped)", async () => {
      const { safe, guard } = await setupTests();

      await expect(guard.toggleScoped(safe.address))
        .to.emit(guard, "TargetScoped")
        .withArgs(safe.address, true);
    });
  });

  describe("isAllowedTarget", async () => {
    it("should return false if not set", async () => {
      const { safe, guard } = await setupTests();

      await expect(await guard.isAllowedTarget(safe.address)).to.be.equals(
        false
      );
    });

    it("should return true if target is allowed", async () => {
      const { safe, guard } = await setupTests();

      await expect(await guard.isAllowedTarget(safe.address)).to.be.equals(
        false
      );
      await expect(guard.allowTarget(safe.address));
      await expect(await guard.isAllowedTarget(safe.address)).to.be.equals(
        true
      );
    });
  });

  describe("isScoped", async () => {
    it("should return false if not set", async () => {
      const { safe, guard } = await setupTests();

      await expect(await guard.isScoped(guard.address)).to.be.equals(false);
    });

    it("should return false if set to false", async () => {
      const { guard } = await setupTests();

      await expect(await guard.isScoped(guard.address)).to.be.equals(false);
      await expect(guard.toggleScoped(guard.address));
      await expect(await guard.isScoped(guard.address)).to.be.equals(true);
    });

    it("should return true if set to true", async () => {
      const { guard } = await setupTests();

      await expect(await guard.isScoped(guard.address)).to.be.equals(false);
      await expect(guard.toggleScoped(guard.address));
      await expect(await guard.isScoped(guard.address)).to.be.equals(true);
    });
  });

  describe("isAllowedFunction", async () => {
    it("should return false if not set", async () => {
      const { safe, guard } = await setupTests();

      await expect(
        await guard.isAllowedFunction(safe.address, "0x12345678")
      ).to.be.equals(false);
    });

    it("should return true if function is allowed", async () => {
      const { safe, guard } = await setupTests();

      await expect(
        await guard.isAllowedFunction(safe.address, "0x12345678")
      ).to.be.equals(false);
      await expect(guard.allowFunction(safe.address, "0x12345678"));
      await expect(
        await guard.isAllowedFunction(safe.address, "0x12345678")
      ).to.be.equals(true);
    });
  });

  describe("isAllowedToDelegateCall", async () => {
    it("should return false by default", async () => {
      const { safe, guard } = await setupTests();

      await expect(await guard.isAllowedTarget(safe.address)).to.be.equals(
        false
      );
    });

    it("should return true if target is allowed to delegate call", async () => {
      const { safe, guard } = await setupTests();

      await expect(
        await guard.isAllowedToDelegateCall(safe.address)
      ).to.be.equals(false);
      await expect(guard.allowDelegateCall(safe.address));
      await expect(
        await guard.isAllowedToDelegateCall(safe.address)
      ).to.be.equals(true);
    });
  });
});
