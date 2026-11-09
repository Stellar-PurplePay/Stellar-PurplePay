import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DisputeEvidenceUploadCard } from "../components/DisputeEvidenceUploadCard";

describe("DisputeEvidenceUploadCard", () => {
  beforeAll(() => {
    // Mock subtle crypto and File.prototype.arrayBuffer
    Object.defineProperty(global, "crypto", {
      value: {
        subtle: {
          digest: jest.fn().mockImplementation(async () => {
            return new Uint8Array(32).fill(7).buffer;
          }),
        },
      },
    });

    if (!File.prototype.arrayBuffer) {
      File.prototype.arrayBuffer = async function () {
        return new Uint8Array(16).buffer;
      };
    }
  });

  it("renders header and job information", () => {
    render(
      <DisputeEvidenceUploadCard
        jobId="job-456"
        disputeId="disp-1"
        onHashGenerated={jest.fn()}
      />
    );

    expect(screen.getByText("Dispute Evidence Digest")).toBeInTheDocument();
    expect(screen.getByText("job-456")).toBeInTheDocument();
    expect(screen.getByText(/Dispute #disp-1/)).toBeInTheDocument();
    expect(screen.getByText("SHA-256 On-Chain")).toBeInTheDocument();
  });

  it("hashes uploaded file and displays cryptographic digest", async () => {
    render(
      <DisputeEvidenceUploadCard
        jobId="job-456"
        onHashGenerated={jest.fn()}
      />
    );

    const file = new File(["audit-evidence-bytes"], "contract_audit.pdf", {
      type: "application/pdf",
    });

    const fileInput = screen.getByLabelText(/Attach Evidence Document/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/contract_audit\.pdf/)).toBeInTheDocument();
      expect(screen.getByText("Deterministic Digest:")).toBeInTheDocument();
    });
  });

  it("enforces 25MB file size limit", async () => {
    render(
      <DisputeEvidenceUploadCard
        jobId="job-456"
        onHashGenerated={jest.fn()}
      />
    );

    // Create file over 25MB
    const bigFile = new File([new ArrayBuffer(26 * 1024 * 1024)], "huge_video.mp4", {
      type: "video/mp4",
    });

    const fileInput = screen.getByLabelText(/Attach Evidence Document/i);
    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("File exceeds 25MB maximum size limit");
    });
  });

  it("triggers onHashGenerated when statement and file are submitted", async () => {
    const mockCallback = jest.fn();
    render(
      <DisputeEvidenceUploadCard
        jobId="job-456"
        onHashGenerated={mockCallback}
      />
    );

    const file = new File(["test-evidence"], "test.pdf", { type: "application/pdf" });
    const fileInput = screen.getByLabelText(/Attach Evidence Document/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Deterministic Digest:")).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText(/Evidence Statement/i);
    fireEvent.change(textarea, {
      target: { value: "Contractor failed to fulfill Milestone 3 specifications." },
    });

    const submitBtn = screen.getByRole("button", { name: /Commit Evidence Hash/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    expect(mockCallback).toHaveBeenCalledWith(
      expect.any(String),
      "Contractor failed to fulfill Milestone 3 specifications."
    );
  });
});
