/**
 * frontend/hooks/useEscrowDeliverable.ts
 *
 * React hook to manage deliverable proof modal state and submission lifecycle.
 */

import { useState, useCallback } from "react";

export interface UseEscrowDeliverableState {
  isModalOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
  deliverableHash: string | null;
  targetMilestoneId: number | null;
  openModal: (milestoneId?: number) => void;
  closeModal: () => void;
  submit: (
    submitFn: (hash: string, milestoneId?: number) => Promise<any>,
    hash: string,
    milestoneId?: number
  ) => Promise<boolean>;
  reset: () => void;
}

export function useEscrowDeliverable(): UseEscrowDeliverableState {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliverableHash, setDeliverableHash] = useState<string | null>(null);
  const [targetMilestoneId, setTargetMilestoneId] = useState<number | null>(null);

  const openModal = useCallback((milestoneId?: number) => {
    setError(null);
    if (milestoneId !== undefined) {
      setTargetMilestoneId(milestoneId);
    }
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const reset = useCallback(() => {
    setIsModalOpen(false);
    setIsSubmitting(false);
    setError(null);
    setDeliverableHash(null);
    setTargetMilestoneId(null);
  }, []);

  const submit = useCallback(
    async (
      submitFn: (hash: string, milestoneId?: number) => Promise<any>,
      hash: string,
      milestoneId?: number
    ): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        await submitFn(hash, milestoneId);
        setDeliverableHash(hash);
        setIsModalOpen(false);
        return true;
      } catch (err: any) {
        setError(err?.message || "Deliverable submission failed");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return {
    isModalOpen,
    isSubmitting,
    error,
    deliverableHash,
    targetMilestoneId,
    openModal,
    closeModal,
    submit,
    reset,
  };
}
