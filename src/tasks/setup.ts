import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { task, types } from "hardhat/config";
import { Contract } from "ethers";

const FIRST_ADDRESS = "0x0000000000000000000000000000000000000001";

task("setup", "Deploys a ScopeGuard").setAction(
  async (taskArgs, hardhatRuntime) => {
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);
    const Guard = await hardhatRuntime.ethers.getContractFactory("ScopeGuard");
    const guard = await Guard.deploy();

    console.log("ScopeGuard deployed to:", guard.address);
  }
);

task("verifyEtherscan", "Verifies the contract on etherscan")
  .addParam("scopeguard", "Address of the ScopeGuard", undefined, types.string)
  .setAction(async (taskArgs, hardhatRuntime) => {
    await hardhatRuntime.run("verify", {
      address: taskArgs.scopeguard,
    });
  });

task("allowTarget", "Allows a target address.")
  .addParam(
    "guard",
    "The address of the guard that you are seting up.",
    undefined,
    types.string
  )
  .addParam(
    "target",
    "The target address to be allowed.",
    undefined,
    types.string
  )
  .setAction(async (taskArgs, hardhatRuntime) => {
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);
    const guard = await hardhatRuntime.ethers.getContractAt(
      "ScopeGuard",
      taskArgs.guard
    );
    await guard.allowTarget(taskArgs.target);

    console.log("Target allowed: ", guard.address);
  });

task("disallowTarget", "Disallows a target address.")
  .addParam(
    "guard",
    "The address of the guard that you are seting up.",
    undefined,
    types.string
  )
  .addParam(
    "target",
    "The target address to be disallowed.",
    undefined,
    types.string
  )
  .setAction(async (taskArgs, hardhatRuntime) => {
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);
    const guard = await hardhatRuntime.ethers.getContractAt(
      "ScopeGuard",
      taskArgs.guard
    );
    await guard.disallowTarget(taskArgs.target);

    console.log("Target disallowed: ", guard.address);
  });

task("allowDelegateCall", "Allows delegate calls to an allowed target address.")
  .addParam(
    "guard",
    "The address of the guard that you are seting up.",
    undefined,
    types.string
  )
  .addParam(
    "target",
    "The target address on which delegate calls should be allowed.",
    undefined,
    types.string
  )
  .setAction(async (taskArgs, hardhatRuntime) => {
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);
    const guard = await hardhatRuntime.ethers.getContractAt(
      "ScopeGuard",
      taskArgs.guard
    );
    await guard.allowDelegateCall(taskArgs.target);

    console.log("Delegate calls allowed to: ", guard.address);
  });

task(
  "disallowDelegateCall",
  "Allows delegate calls to an disallowed target address."
)
  .addParam(
    "guard",
    "The address of the guard that you are seting up.",
    undefined,
    types.string
  )
  .addParam(
    "target",
    "The target address on which delegate calls should be disallowed.",
    undefined,
    types.string
  )
  .setAction(async (taskArgs, hardhatRuntime) => {
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);
    const guard = await hardhatRuntime.ethers.getContractAt(
      "ScopeGuard",
      taskArgs.guard
    );
    await guard.disallowDelegateCall(taskArgs.target);

    console.log("Delegate calls disallowed to: ", guard.address);
  });

task(
  "toggleScoped",
  "Toggles whether a target address is scoped to specific functions."
)
  .addParam(
    "guard",
    "The address of the guard that you are seting up.",
    undefined,
    types.string
  )
  .addParam(
    "target",
    "The target address to be (un)scoped.",
    undefined,
    types.string
  )
  .setAction(async (taskArgs, hardhatRuntime) => {
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);
    const guard = await hardhatRuntime.ethers.getContractAt(
      "ScopeGuard",
      taskArgs.guard
    );
    await guard.toggleScoped(taskArgs.target);

    console.log(
      "Scoped set to ",
      await guard.isScoped(),
      " for target address ",
      guard.address
    );
  });

task(
  "allowFunction",
  "Allows a function signagure to be called to an allowed target address."
)
  .addParam(
    "guard",
    "The address of the guard that you are seting up.",
    undefined,
    types.string
  )
  .addParam(
    "target",
    "The target address on which a function signature should be allowed.",
    undefined,
    types.string
  )
  .addParam(
    "sig",
    "Function signature of to be allowed on the target address.",
    undefined,
    types.string
  )
  .setAction(async (taskArgs, hardhatRuntime) => {
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);
    const guard = await hardhatRuntime.ethers.getContractAt(
      "ScopeGuard",
      taskArgs.guard
    );
    await guard.allowFunction(taskArgs.target, taskArgs.sig);

    console.log(
      "Function signature ",
      taskArgs.sig,
      " allowed for ",
      guard.address
    );
  });

task(
  "disallowFunction",
  "Allows a function signagure to be called to an disallowed target address."
)
  .addParam(
    "guard",
    "The address of the guard that you are seting up.",
    undefined,
    types.string
  )
  .addParam(
    "target",
    "The target address on which a function signature should be disallowed.",
    undefined,
    types.string
  )
  .addParam(
    "sig",
    "Function signature of to be allowed on the target address.",
    undefined,
    types.string
  )
  .setAction(async (taskArgs, hardhatRuntime) => {
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);
    const guard = await hardhatRuntime.ethers.getContractAt(
      "ScopeGuard",
      taskArgs.guard
    );
    await guard.allowFunction(taskArgs.target, taskArgs.sig);

    console.log(
      "Function signature ",
      taskArgs.sig,
      " disallowed for ",
      guard.address
    );
  });

task(
  "transferOwnership",
  "Toggles whether a target address is scoped to specific functions."
)
  .addParam(
    "guard",
    "The address of the guard that you are seting up.",
    undefined,
    types.string
  )
  .addParam(
    "newOwner",
    "The address that will be the new owner of the gaurd.",
    undefined,
    types.string
  )
  .setAction(async (taskArgs, hardhatRuntime) => {
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);
    const guard = await hardhatRuntime.ethers.getContractAt(
      "ScopeGuard",
      taskArgs.guard
    );
    await guard.transferOwnership(taskArgs.target);

    console.log("ScopeGuard now owned by: ", await guard.owner());
  });

export {};
