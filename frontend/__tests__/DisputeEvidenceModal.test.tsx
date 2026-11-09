import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DisputeEvidenceModal } from "../components/DisputeEvidenceModal";

describe("DisputeEvidenceModal component", () => {
  beforeAll(() => {
    if (!global.crypto.subtle) {
      // @ts-ignore
      global.crypto.subtle = {
        digest: jest.fn().mockResolvedValue(new Uint8Array(32).fill(0xee).buffer),
      };
    }
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <DisputeEvidenceModal
        isOpen={false}
        onClose={jest.fn()}
        onSubmitEvidence={jest.fn()}
        jobId="job-101"
        userRole="client"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when isOpen is true with user role and job ID", () => {
    render(
      <DisputeEvidenceModal
        isOpen={true}
        onClose={jest.fn()}
        onSubmitEvidence={jest.fn()}
        jobId="job-101"
        userRole="freelancer"
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Submit Dispute Evidence (FREELANCER)")).toBeInTheDocument();
    expect(screen.getByText("job-101")).toBeInTheDocument();
  });

  it("computes evidence hash on input change and submits", async () => {
    const handleSubmit = jest.fn().mockResolvedValue(undefined);
    const handleClose = jest.fn();

    render(
      <DisputeEvidenceModal
        isOpen={true}
        onClose={handleClose}
        onSubmitEvidence={handleSubmit}
        jobId="job-101"
        userRole="client"
      />
    );

    const textarea = screen.getByLabelText("Evidence Statement / Deliverable Audit Log");
    fireEvent.change(textarea, { target: { value: "Work failed acceptance criteria" } });

    await waitFor(() => {
      expect(screen.getByText("Cryptographic Evidence Hash (SHA-256)")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: "Record Evidence On-Chain" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(expect.any(String), "Work failed acceptance criteria");
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
