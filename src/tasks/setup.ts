import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { task, types } from "hardhat/config";

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

export {};
