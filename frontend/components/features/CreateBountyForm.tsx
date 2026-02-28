"use client";

import { useState } from "react";
import { useBounty } from "@/context/BountyContext";
import { useWallet } from "@/context/WalletContext";
import { Category, CATEGORY_LABELS } from "@/lib/types";
import { DOT_ADDRESS } from "@/context/BountyContext";
import {
  TOKENS,
  BOUNTY_TITLE_MAX_LENGTH,
  BOUNTY_DESCRIPTION_MAX_LENGTH,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { ethers } from "ethers";
import contractAddresses from "@/lib/abis/contract-addresses.json";

// Minimal ERC20 ABI — only the functions we need
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

interface CreateBountyFormProps {
  onSuccess?: (bountyId: string) => void;
}

type TxStep = "idle" | "approving" | "creating" | "done";

export function CreateBountyForm({ onSuccess }: CreateBountyFormProps) {
  const { createBounty, isWritePending } = useBounty();
  const { connected, connect, signer } = useWallet();

  const [step, setStep] = useState(1);
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: String(Category.DEVELOPMENT),
    rewardHuman: "",
    tokenAddress: DOT_ADDRESS, // default to native PAS/DOT
  });

  const selectedToken =
    Object.values(TOKENS).find((t) => t.address === formData.tokenAddress) ??
    TOKENS.DOT;

  const isERC20 = formData.tokenAddress !== DOT_ADDRESS;
  const isPending = txStep === "approving" || txStep === "creating";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Convert human-readable amount → raw uint256 string for the contract
  const toRawReward = (): string => {
    try {
      return ethers
        .parseUnits(formData.rewardHuman || "0", selectedToken.decimals)
        .toString();
    } catch {
      return "0";
    }
  };

  /**
   * For ERC20 tokens, check the current allowance and send an approval tx
   * if needed before calling createBounty.
   */
  const ensureERC20Approval = async (rawReward: string): Promise<boolean> => {
    if (!signer) {
      toast.error("No signer available. Please reconnect your wallet.");
      return false;
    }

    try {
      const tokenContract = new ethers.Contract(
        formData.tokenAddress,
        ERC20_ABI,
        signer,
      );

      const signerAddress = await signer.getAddress();
      const spender = contractAddresses.MicroBounty;

      const currentAllowance: bigint = await tokenContract.allowance(
        signerAddress,
        spender,
      );

      if (currentAllowance >= BigInt(rawReward)) {
        // Already approved — no need to send a tx
        return true;
      }

      setTxStep("approving");
      toast.info(
        `Approving ${selectedToken.symbol} spend — confirm in your wallet…`,
      );

      const approveTx = await tokenContract.approve(spender, rawReward);
      await approveTx.wait();

      toast.success(`${selectedToken.symbol} approved ✓`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval failed";
      // User rejected the approval
      if (msg.toLowerCase().includes("user rejected") || msg.includes("4001")) {
        toast.error("Approval cancelled.");
      } else {
        toast.error(`Approval failed: ${msg}`);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected) {
      toast.error("Please connect your wallet first");
      await connect();
      return;
    }

    // --- Validation ---
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!formData.rewardHuman || parseFloat(formData.rewardHuman) <= 0) {
      toast.error("Reward must be greater than 0");
      return;
    }

    const rawReward = toRawReward();
    if (rawReward === "0") {
      toast.error("Invalid reward amount");
      return;
    }

    try {
      // Step 1 (ERC20 only): approval
      if (isERC20) {
        const approved = await ensureERC20Approval(rawReward);
        if (!approved) {
          setTxStep("idle");
          return;
        }
      }

      // Step 2: create the bounty
      setTxStep("creating");
      toast.info("Creating bounty — confirm in your wallet…");

      const bountyId = await createBounty({
        title: formData.title.trim(),
        description: formData.description.trim(),
        reward: rawReward,
        paymentToken: formData.tokenAddress,
        category: Number(formData.category) as Category,
      });

      if (bountyId) {
        setTxStep("done");
        toast.success(`Bounty #${bountyId} created on-chain! 🎉`);
        // Reset form
        setFormData({
          title: "",
          description: "",
          category: String(Category.DEVELOPMENT),
          rewardHuman: "",
          tokenAddress: DOT_ADDRESS,
        });
        setStep(1);
        onSuccess?.(bountyId);
      } else {
        toast.error(
          "Failed to create bounty. Check your wallet and try again.",
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      if (msg.toLowerCase().includes("user rejected") || msg.includes("4001")) {
        toast.error("Transaction cancelled.");
      } else {
        toast.error(`Error: ${msg}`);
      }
    } finally {
      setTxStep("idle");
    }
  };

  const canProceedStep1 =
    formData.title.trim() &&
    formData.description.trim() &&
    formData.category !== "";

  const canProceedStep2 =
    formData.rewardHuman && parseFloat(formData.rewardHuman) > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Step indicator */}
      <div className="flex gap-2 justify-center">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-2 w-12 rounded-full transition-colors ${
              step >= n ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* ── Step 1: Basic Info ── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Basic Information</h2>
            <p className="text-muted-foreground">Tell us about your bounty</p>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Smart Contract Security Audit"
                value={formData.title}
                onChange={handleChange}
                maxLength={BOUNTY_TITLE_MAX_LENGTH}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.title.length}/{BOUNTY_TITLE_MAX_LENGTH}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Detailed description of what needs to be done, acceptance criteria, deadlines…"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                maxLength={BOUNTY_DESCRIPTION_MAX_LENGTH}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.description.length}/{BOUNTY_DESCRIPTION_MAX_LENGTH}
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, category: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([index, label]) => (
                    <SelectItem key={index} value={index}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Reward ── */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Reward</h2>
            <p className="text-muted-foreground">
              Set the reward for completing this bounty
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="rewardHuman">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rewardHuman"
                  name="rewardHuman"
                  type="number"
                  placeholder={
                    selectedToken.symbol === "PAS" ? "0.0001" : "1.00"
                  }
                  value={formData.rewardHuman}
                  onChange={handleChange}
                  step="any"
                  min="0"
                />
              </div>

              {/* Token selector */}
              <div className="space-y-2">
                <Label>Token</Label>
                <Select
                  value={formData.tokenAddress}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      tokenAddress: v,
                      rewardHuman: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TOKENS).map((token) => (
                      <SelectItem key={token.id} value={token.address}>
                        {token.logo} {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Info banner — ERC20 approval notice */}
            {isERC20 && (
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <p className="font-medium">Two transactions required</p>
                    <p>
                      1. <strong>Approve</strong> — allows the contract to spend
                      your {selectedToken.symbol}.
                    </p>
                    <p>
                      2. <strong>Create</strong> — locks the reward in the
                      contract.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Info banner — native PAS */}
            {!isERC20 && (
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    The PAS reward will be sent directly from your wallet and
                    locked in the contract when you confirm.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Submit ── */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Review & Submit</h2>
            <p className="text-muted-foreground">
              Confirm details before sending the transaction
            </p>
          </div>

          <Card className="p-6 space-y-3 bg-muted/50">
            <Row label="Title" value={formData.title} />
            <Row
              label="Category"
              value={CATEGORY_LABELS[Number(formData.category) as Category]}
            />
            <Row
              label="Reward"
              value={`${formData.rewardHuman} ${selectedToken.symbol}`}
            />
            <Row
              label="Payment"
              value={
                !isERC20
                  ? "Native PAS"
                  : `ERC20 (${selectedToken.symbol}) — requires approval`
              }
            />
            <div>
              <span className="text-sm text-muted-foreground">Description</span>
              <p className="text-sm mt-1 line-clamp-4">
                {formData.description}
              </p>
            </div>
          </Card>

          {/* Live tx-step feedback */}
          {isPending && (
            <Card className="p-4 border-primary/30 bg-primary/5">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-sm font-medium">
                  {txStep === "approving"
                    ? `Waiting for ${selectedToken.symbol} approval…`
                    : "Creating bounty on-chain…"}
                </p>
              </div>
              {isERC20 && (
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground pl-7">
                  <span
                    className={
                      txStep === "creating"
                        ? "text-primary font-medium"
                        : txStep === "approving"
                          ? "text-primary font-medium"
                          : ""
                    }
                  >
                    {txStep === "creating" ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> 1.
                        Approved
                      </span>
                    ) : (
                      "1. Approve"
                    )}
                  </span>
                  <span>→</span>
                  <span
                    className={
                      txStep === "creating" ? "text-primary font-medium" : ""
                    }
                  >
                    2. Create
                  </span>
                </div>
              )}
            </Card>
          )}

          {/* Wallet not connected warning */}
          {!connected && (
            <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your wallet is not connected. Click &quot;Create Bounty&quot;
                  and you will be prompted to connect.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex gap-2 justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || isPending}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        {step < 3 ? (
          <Button
            type="button"
            onClick={() => {
              if (step === 1 && !canProceedStep1) {
                toast.error("Please fill in all required fields");
                return;
              }
              if (step === 2 && !canProceedStep2) {
                toast.error("Please enter a valid reward amount");
                return;
              }
              setStep((s) => s + 1);
            }}
            className="gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={isPending || isWritePending}
            className="gap-2 min-w-[140px]"
          >
            {isPending || isWritePending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {txStep === "approving" ? "Approving…" : "Creating…"}
              </>
            ) : (
              "Create Bounty"
            )}
          </Button>
        )}
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
