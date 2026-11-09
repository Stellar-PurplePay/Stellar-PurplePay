import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EscrowDeliverableModal } from "../components/EscrowDeliverableModal";

describe("EscrowDeliverableModal component", () => {
  beforeAll(() => {
    // Ensure Web Crypto API mock is present in jsdom
    if (!global.crypto.subtle) {
      const cryptoMock = {
        digest: jest.fn().mockImplementation((algorithm, data) => {
          return Promise.resolve(new Uint8Array(32).fill(0xab).buffer);
        }),
      };
      // @ts-ignore
      global.crypto.subtle = cryptoMock;
    }
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <EscrowDeliverableModal
        isOpen={false}
        onClose={jest.fn()}
        onSubmitDeliverable={jest.fn()}
        jobId="job-101"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when isOpen is true with job ID and milestones", () => {
    const milestones = [
      { id: 1, description: "Milestone 1 - Initial UI" },
      { id: 2, description: "Milestone 2 - Backend Integration" },
    ];

    render(
      <EscrowDeliverableModal
        isOpen={true}
        onClose={jest.fn()}
        onSubmitDeliverable={jest.fn()}
        jobId="job-101"
        milestones={milestones}
      />
    );

    expect(screen.getByText("Submit Deliverable Proof")).toBeInTheDocument();
    expect(screen.getByText("job-101")).toBeInTheDocument();
    expect(screen.getByLabelText("Target Milestone")).toBeInTheDocument();
  });

  it("computes proof hash on text change and allows submission", async () => {
    const handleSubmit = jest.fn().mockResolvedValue(undefined);
    const handleClose = jest.fn();

    render(
      <EscrowDeliverableModal
        isOpen={true}
        onClose={handleClose}
        onSubmitDeliverable={handleSubmit}
        jobId="job-101"
        milestones={[{ id: 1, description: "Deliverable 1" }]}
      />
    );

    const textarea = screen.getByLabelText("Or Enter Deliverable Content / IPFS URL");
    fireEvent.change(textarea, { target: { value: "https://github.com/my-repo/commit/123" } });

    await waitFor(() => {
      expect(screen.getByText("Cryptographic Proof Hash (SHA-256)")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: "Submit Proof On-Chain" });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(expect.any(String), 1);
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
