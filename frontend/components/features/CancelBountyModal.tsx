"use client";

import { useState } from "react";
import { Bounty } from "@/lib/types";
import { useBounty } from "@/context/BountyContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface CancelBountyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bounty: Bounty;
}

export function CancelBountyModal({
  open,
  onOpenChange,
  bounty,
}: CancelBountyModalProps) {
  const { cancelBounty, isWritePending } = useBounty();

  const handleCancel = async () => {
    const success = await cancelBounty(bounty.id);
    if (success) {
      toast.success("Bounty cancelled. Funds refunded to your wallet.");
      onOpenChange(false);
    } else {
      toast.error("Failed to cancel bounty. Check your wallet and try again.");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <AlertDialogTitle>Cancel Bounty?</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                Cancelling "{bounty.title}" will:
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Refund the full reward to your wallet on-chain</li>
                  <li>Permanently close the bounty to new submissions</li>
                  <li>
                    Only works while the bounty is still OPEN (no submission
                    yet)
                  </li>
                </ul>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4">
          <p className="text-sm font-medium text-destructive">
            This action cannot be undone. Your wallet will prompt you to
            confirm.
          </p>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <AlertDialogCancel disabled={isWritePending}>
            Keep Bounty
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isWritePending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isWritePending ? "Cancelling..." : "Yes, Cancel Bounty"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
