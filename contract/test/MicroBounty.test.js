const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// ─── Constants (mirror the contract) ─────────────────────────────────────────

const MIN_DOT    = ethers.parseUnits("100", 10); // 100 DOT  (10 decimals)
const MIN_STABLE = ethers.parseUnits("100", 6);  // 100 USDC (6 decimals)
const ZERO_ADDR  = ethers.ZeroAddress;

// ─── Fixture ──────────────────────────────────────────────────────────────────

async function deployFixture() {
  const [owner, creator, hunter, other] = await ethers.getSigners();

  const ERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await ERC20.deploy("USD Coin", "USDC", 6);
  const usdt = await ERC20.deploy("Tether",   "USDT", 6);

  const Factory = await ethers.getContractFactory("MicroBounty");
  const bounty  = await Factory.deploy([
    await usdc.getAddress(),
    await usdt.getAddress(),
  ]);

  const contractAddr = await bounty.getAddress();

  // Give creator plenty of stablecoins and pre-approve the contract
  await usdc.mint(creator.address, ethers.parseUnits("10000", 6));
  await usdt.mint(creator.address, ethers.parseUnits("10000", 6));
  await usdc.connect(creator).approve(contractAddr, ethers.MaxUint256);
  await usdt.connect(creator).approve(contractAddr, ethers.MaxUint256);

  return { bounty, usdc, usdt, owner, creator, hunter, other, contractAddr };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createDotBounty(bounty, signer, reward = MIN_DOT) {
  return bounty.connect(signer).createBounty(
    "Test Bounty",
    "A description for the test bounty that is long enough",
    reward,
    ZERO_ADDR,
    0, // DEVELOPMENT
    { value: reward },
  );
}

async function createStableBounty(bounty, signer, tokenAddr, reward = MIN_STABLE) {
  return bounty.connect(signer).createBounty(
    "Stable Bounty",
    "A description for the stable bounty that is long enough",
    reward,
    tokenAddr,
    1, // DESIGN
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MicroBounty", function () {

  // ── Deployment ──────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("whitelists the initial tokens", async function () {
      const { bounty, usdc, usdt } = await loadFixture(deployFixture);
      expect(await bounty.isTokenSupported(await usdc.getAddress())).to.be.true;
      expect(await bounty.isTokenSupported(await usdt.getAddress())).to.be.true;
    });

    it("rejects address(0) as an initial token", async function () {
      const Factory = await ethers.getContractFactory("MicroBounty");
      await expect(Factory.deploy([ZERO_ADDR])).to.be.revertedWith(
        "Token cannot be zero address",
      );
    });

    it("starts with zeroed platform stats", async function () {
      const { bounty } = await loadFixture(deployFixture);
      const stats = await bounty.getPlatformStats();
      expect(stats.totalBounties).to.equal(0);
      expect(stats.activeBounties).to.equal(0);
      expect(stats.totalValueLockedDOT).to.equal(0);
    });
  });

  // ── createBounty ────────────────────────────────────────────────────────────

  describe("createBounty", function () {
    describe("Native DOT", function () {
      it("creates a DOT bounty and emits BountyCreated", async function () {
        const { bounty, creator } = await loadFixture(deployFixture);
        await expect(createDotBounty(bounty, creator))
          .to.emit(bounty, "BountyCreated")
          .withArgs(1, creator.address, MIN_DOT, ZERO_ADDR, 0);
      });

      it("stores the bounty correctly", async function () {
        const { bounty, creator } = await loadFixture(deployFixture);
        await createDotBounty(bounty, creator);
        const b = await bounty.getBounty(1);
        expect(b.id).to.equal(1);
        expect(b.creator).to.equal(creator.address);
        expect(b.reward).to.equal(MIN_DOT);
        expect(b.paymentToken).to.equal(ZERO_ADDR);
        expect(b.status).to.equal(0); // OPEN
      });

      it("increments platform stats", async function () {
        const { bounty, creator } = await loadFixture(deployFixture);
        await createDotBounty(bounty, creator);
        const stats = await bounty.getPlatformStats();
        expect(stats.totalBounties).to.equal(1);
        expect(stats.activeBounties).to.equal(1);
        expect(stats.totalValueLockedDOT).to.equal(MIN_DOT);
      });

      it("rejects msg.value != reward", async function () {
        const { bounty, creator } = await loadFixture(deployFixture);
        await expect(
          bounty.connect(creator).createBounty(
            "Title", "Description that is long enough for the contract",
            MIN_DOT, ZERO_ADDR, 0,
            { value: MIN_DOT - 1n },
          ),
        ).to.be.revertedWith("msg.value must equal reward amount");
      });

      it("rejects reward below minimum", async function () {
        const { bounty, creator } = await loadFixture(deployFixture);
        const tooLow = MIN_DOT - 1n;
        await expect(
          bounty.connect(creator).createBounty(
            "Title", "Description that is long enough for the contract",
            tooLow, ZERO_ADDR, 0,
            { value: tooLow },
          ),
        ).to.be.revertedWith("Reward below minimum (100 DOT)");
      });

      it("rejects empty title", async function () {
        const { bounty, creator } = await loadFixture(deployFixture);
        await expect(
          bounty.connect(creator).createBounty(
            "", "Description", MIN_DOT, ZERO_ADDR, 0, { value: MIN_DOT },
          ),
        ).to.be.revertedWith("Title must be 1-100 characters");
      });

      it("rejects title over 100 chars", async function () {
        const { bounty, creator } = await loadFixture(deployFixture);
        await expect(
          bounty.connect(creator).createBounty(
            "a".repeat(101), "Description", MIN_DOT, ZERO_ADDR, 0, { value: MIN_DOT },
          ),
        ).to.be.revertedWith("Title must be 1-100 characters");
      });

      it("rejects invalid category", async function () {
        const { bounty, creator } = await loadFixture(deployFixture);
        await expect(
          bounty.connect(creator).createBounty(
            "Title", "Description", MIN_DOT, ZERO_ADDR, 5, { value: MIN_DOT },
          ),
        ).to.be.revertedWith("Invalid category");
      });
    });

    describe("ERC20 (stablecoin)", function () {
      it("pulls tokens from creator into the contract", async function () {
        const { bounty, usdc, creator, contractAddr } = await loadFixture(deployFixture);
        const before = await usdc.balanceOf(creator.address);
        await createStableBounty(bounty, creator, await usdc.getAddress());
        expect(await usdc.balanceOf(creator.address)).to.equal(before - MIN_STABLE);
        expect(await usdc.balanceOf(contractAddr)).to.equal(MIN_STABLE);
      });

      it("increments totalValueLockedStable", async function () {
        const { bounty, usdc, creator } = await loadFixture(deployFixture);
        await createStableBounty(bounty, creator, await usdc.getAddress());
        const stats = await bounty.getPlatformStats();
        expect(stats.totalValueLockedStable).to.equal(MIN_STABLE);
      });

      it("rejects unsupported token", async function () {
        const { bounty, creator } = await loadFixture(deployFixture);
        const rando = ethers.Wallet.createRandom().address;
        await expect(
          bounty.connect(creator).createBounty(
            "Title", "Description", MIN_STABLE, rando, 0,
          ),
        ).to.be.revertedWith("Token is not supported");
      });

      it("rejects msg.value > 0 alongside ERC20", async function () {
        const { bounty, usdc, creator } = await loadFixture(deployFixture);
        await expect(
          bounty.connect(creator).createBounty(
            "Title", "Description", MIN_STABLE, await usdc.getAddress(), 0,
            { value: 1n },
          ),
        ).to.be.revertedWith("Do not send DOT when using an ERC20 token");
      });
    });
  });

  // ── submitWork ──────────────────────────────────────────────────────────────

  describe("submitWork", function () {
    it("moves bounty to IN_PROGRESS and sets hunter", async function () {
      const { bounty, creator, hunter } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await bounty.connect(hunter).submitWork(1, "https://github.com/pr/1", "Done");
      const b = await bounty.getBounty(1);
      expect(b.status).to.equal(1); // IN_PROGRESS
      expect(b.hunter).to.equal(hunter.address);
      expect(b.proofUrl).to.equal("https://github.com/pr/1");
    });

    it("emits WorkSubmitted", async function () {
      const { bounty, creator, hunter } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await expect(
        bounty.connect(hunter).submitWork(1, "https://proof.url", ""),
      ).to.emit(bounty, "WorkSubmitted");
    });

    it("rejects creator submitting to own bounty", async function () {
      const { bounty, creator } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await expect(
        bounty.connect(creator).submitWork(1, "https://proof.url", ""),
      ).to.be.revertedWith("Creator cannot submit to their own bounty");
    });

    it("rejects submission on non-OPEN bounty", async function () {
      const { bounty, creator, hunter, other } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await bounty.connect(hunter).submitWork(1, "https://proof.url", "");
      await expect(
        bounty.connect(other).submitWork(1, "https://other.url", ""),
      ).to.be.revertedWith("Bounty is not open");
    });

    it("rejects empty proof URL", async function () {
      const { bounty, creator, hunter } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await expect(
        bounty.connect(hunter).submitWork(1, "", ""),
      ).to.be.revertedWith("Proof URL is required");
    });

    it("rejects notes over 200 chars", async function () {
      const { bounty, creator, hunter } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await expect(
        bounty.connect(hunter).submitWork(1, "https://proof.url", "n".repeat(201)),
      ).to.be.revertedWith("Notes exceed 200 character limit");
    });

    it("rejects non-existent bounty", async function () {
      const { bounty, hunter } = await loadFixture(deployFixture);
      await expect(
        bounty.connect(hunter).submitWork(999, "https://proof.url", ""),
      ).to.be.revertedWith("Bounty does not exist");
    });
  });

  // ── approveBounty ───────────────────────────────────────────────────────────

  describe("approveBounty", function () {
    describe("Native DOT", function () {
      it("transfers reward to hunter and marks COMPLETED", async function () {
        const { bounty, creator, hunter } = await loadFixture(deployFixture);
        await createDotBounty(bounty, creator);
        await bounty.connect(hunter).submitWork(1, "https://proof.url", "");

        const before = await ethers.provider.getBalance(hunter.address);
        await bounty.connect(creator).approveBounty(1);
        const after = await ethers.provider.getBalance(hunter.address);

        expect(after - before).to.equal(MIN_DOT);
        expect((await bounty.getBounty(1)).status).to.equal(2); // COMPLETED
      });

      it("decrements totalValueLockedDOT and increments totalPaidOutDOT", async function () {
        const { bounty, creator, hunter } = await loadFixture(deployFixture);
        await createDotBounty(bounty, creator);
        await bounty.connect(hunter).submitWork(1, "https://proof.url", "");
        await bounty.connect(creator).approveBounty(1);

        const stats = await bounty.getPlatformStats();
        expect(stats.totalValueLockedDOT).to.equal(0);
        expect(stats.totalPaidOutDOT).to.equal(MIN_DOT);
        expect(stats.activeBounties).to.equal(0);
        expect(stats.completedBounties).to.equal(1);
      });

      it("emits BountyCompleted", async function () {
        const { bounty, creator, hunter } = await loadFixture(deployFixture);
        await createDotBounty(bounty, creator);
        await bounty.connect(hunter).submitWork(1, "https://proof.url", "");
        await expect(bounty.connect(creator).approveBounty(1))
          .to.emit(bounty, "BountyCompleted");
      });
    });

    describe("ERC20 (USDC)", function () {
      it("transfers USDC to hunter and decrements locked stable", async function () {
        const { bounty, usdc, creator, hunter } = await loadFixture(deployFixture);
        await createStableBounty(bounty, creator, await usdc.getAddress());
        await bounty.connect(hunter).submitWork(1, "https://proof.url", "");

        const before = await usdc.balanceOf(hunter.address);
        await bounty.connect(creator).approveBounty(1);
        expect(await usdc.balanceOf(hunter.address)).to.equal(before + MIN_STABLE);

        const stats = await bounty.getPlatformStats();
        expect(stats.totalValueLockedStable).to.equal(0);
        expect(stats.totalPaidOutStable).to.equal(MIN_STABLE);
      });
    });

    it("rejects non-creator calling approve", async function () {
      const { bounty, creator, hunter, other } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await bounty.connect(hunter).submitWork(1, "https://proof.url", "");
      await expect(bounty.connect(other).approveBounty(1)).to.be.revertedWith(
        "Only creator can perform this action",
      );
    });

    it("rejects approve on OPEN bounty", async function () {
      const { bounty, creator } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await expect(bounty.connect(creator).approveBounty(1)).to.be.revertedWith(
        "Bounty must be IN_PROGRESS to approve",
      );
    });

    it("rejects double-approve", async function () {
      const { bounty, creator, hunter } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await bounty.connect(hunter).submitWork(1, "https://proof.url", "");
      await bounty.connect(creator).approveBounty(1);
      await expect(bounty.connect(creator).approveBounty(1)).to.be.revertedWith(
        "Bounty must be IN_PROGRESS to approve",
      );
    });
  });

  // ── cancelBounty ────────────────────────────────────────────────────────────

  describe("cancelBounty", function () {
    describe("Native DOT", function () {
      it("refunds reward to creator and marks CANCELLED", async function () {
        const { bounty, creator } = await loadFixture(deployFixture);
        await createDotBounty(bounty, creator);

        const before = await ethers.provider.getBalance(creator.address);
        const tx      = await bounty.connect(creator).cancelBounty(1);
        const receipt = await tx.wait();
        const gasCost = receipt.gasUsed * receipt.gasPrice;
        const after   = await ethers.provider.getBalance(creator.address);

        expect(after - before + gasCost).to.equal(MIN_DOT);
        expect((await bounty.getBounty(1)).status).to.equal(3); // CANCELLED
      });

      it("decrements totalValueLockedDOT", async function () {
        const { bounty, creator } = await loadFixture(deployFixture);
        await createDotBounty(bounty, creator);
        await bounty.connect(creator).cancelBounty(1);

        const stats = await bounty.getPlatformStats();
        expect(stats.totalValueLockedDOT).to.equal(0);
        expect(stats.activeBounties).to.equal(0);
        expect(stats.cancelledBounties).to.equal(1);
      });

      it("emits BountyCancelled", async function () {
        const { bounty, creator } = await loadFixture(deployFixture);
        await createDotBounty(bounty, creator);
        await expect(bounty.connect(creator).cancelBounty(1))
          .to.emit(bounty, "BountyCancelled");
      });
    });

    describe("ERC20 (USDC)", function () {
      it("refunds USDC to creator and does NOT increment totalPaidOut", async function () {
        const { bounty, usdc, creator } = await loadFixture(deployFixture);
        const before = await usdc.balanceOf(creator.address);
        await createStableBounty(bounty, creator, await usdc.getAddress());
        await bounty.connect(creator).cancelBounty(1);

        expect(await usdc.balanceOf(creator.address)).to.equal(before);

        const stats = await bounty.getPlatformStats();
        expect(stats.totalValueLockedStable).to.equal(0);
        expect(stats.totalPaidOutStable).to.equal(0); // refund ≠ payout
      });
    });

    it("rejects cancel on IN_PROGRESS bounty", async function () {
      const { bounty, creator, hunter } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await bounty.connect(hunter).submitWork(1, "https://proof.url", "");
      await expect(bounty.connect(creator).cancelBounty(1)).to.be.revertedWith(
        "Only OPEN bounties can be cancelled",
      );
    });

    it("rejects non-creator calling cancel", async function () {
      const { bounty, creator, other } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await expect(bounty.connect(other).cancelBounty(1)).to.be.revertedWith(
        "Only creator can perform this action",
      );
    });

    it("rejects double-cancel", async function () {
      const { bounty, creator } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await bounty.connect(creator).cancelBounty(1);
      await expect(bounty.connect(creator).cancelBounty(1)).to.be.revertedWith(
        "Only OPEN bounties can be cancelled",
      );
    });
  });

  // ── Platform stats integrity ─────────────────────────────────────────────────

  describe("Platform stats integrity", function () {
    it("tracks multiple bounties across the full lifecycle", async function () {
      const { bounty, usdc, creator, hunter } = await loadFixture(deployFixture);
      const usdcAddr = await usdc.getAddress();

      // Create 2 DOT + 1 USDC bounty
      await createDotBounty(bounty, creator, MIN_DOT);
      await createDotBounty(bounty, creator, MIN_DOT);
      await createStableBounty(bounty, creator, usdcAddr, MIN_STABLE);

      let stats = await bounty.getPlatformStats();
      expect(stats.totalBounties).to.equal(3);
      expect(stats.activeBounties).to.equal(3);
      expect(stats.totalValueLockedDOT).to.equal(MIN_DOT * 2n);
      expect(stats.totalValueLockedStable).to.equal(MIN_STABLE);

      // Approve #1 (DOT)
      await bounty.connect(hunter).submitWork(1, "https://proof.url", "");
      await bounty.connect(creator).approveBounty(1);

      // Cancel #2 (DOT)
      await bounty.connect(creator).cancelBounty(2);

      // Approve #3 (USDC)
      await bounty.connect(hunter).submitWork(3, "https://proof.url", "");
      await bounty.connect(creator).approveBounty(3);

      stats = await bounty.getPlatformStats();
      expect(stats.activeBounties).to.equal(0);
      expect(stats.completedBounties).to.equal(2);
      expect(stats.cancelledBounties).to.equal(1);
      expect(stats.totalValueLockedDOT).to.equal(0);
      expect(stats.totalValueLockedStable).to.equal(0);
      expect(stats.totalPaidOutDOT).to.equal(MIN_DOT);       // only #1
      expect(stats.totalPaidOutStable).to.equal(MIN_STABLE); // only #3
    });
  });

  // ── View functions ───────────────────────────────────────────────────────────

  describe("View functions", function () {
    it("getBountiesByStatus returns correct IDs", async function () {
      const { bounty, creator, hunter } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator); // #1
      await createDotBounty(bounty, creator); // #2
      await bounty.connect(hunter).submitWork(1, "https://proof.url", ""); // #1 → IN_PROGRESS

      const open       = await bounty.getBountiesByStatus(0);
      const inProgress = await bounty.getBountiesByStatus(1);
      expect(open.map(Number)).to.deep.equal([2]);
      expect(inProgress.map(Number)).to.deep.equal([1]);
    });

    it("getUserBounties and getUserSubmissions track correctly", async function () {
      const { bounty, creator, hunter } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await createDotBounty(bounty, creator);
      await bounty.connect(hunter).submitWork(1, "https://proof.url", "");
      await bounty.connect(hunter).submitWork(2, "https://proof2.url", "");

      expect((await bounty.getUserBounties(creator.address)).map(Number)).to.deep.equal([1, 2]);
      expect((await bounty.getUserSubmissions(hunter.address)).map(Number)).to.deep.equal([1, 2]);
    });

    it("getBountiesByToken returns correct IDs", async function () {
      const { bounty, usdc, creator } = await loadFixture(deployFixture);
      await createDotBounty(bounty, creator);
      await createStableBounty(bounty, creator, await usdc.getAddress());

      expect((await bounty.getBountiesByToken(ZERO_ADDR)).map(Number)).to.deep.equal([1]);
      expect((await bounty.getBountiesByToken(await usdc.getAddress())).map(Number)).to.deep.equal([2]);
    });

    it("getBountyCount increments correctly", async function () {
      const { bounty, creator } = await loadFixture(deployFixture);
      expect(await bounty.getBountyCount()).to.equal(0);
      await createDotBounty(bounty, creator);
      expect(await bounty.getBountyCount()).to.equal(1);
      await createDotBounty(bounty, creator);
      expect(await bounty.getBountyCount()).to.equal(2);
    });
  });

  // ── receive() fallback ───────────────────────────────────────────────────────

  describe("receive()", function () {
    it("rejects plain ETH/DOT transfers", async function () {
      const { creator, contractAddr } = await loadFixture(deployFixture);
      await expect(
        creator.sendTransaction({ to: contractAddr, value: ethers.parseEther("1") }),
      ).to.be.revertedWith("Use createBounty to fund bounties");
    });
  });
});