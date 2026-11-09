import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PreflightFeeModal from "../components/PreflightFeeModal";

describe("PreflightFeeModal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <PreflightFeeModal isOpen={false} onConfirm={jest.fn()} onCancel={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders fee breakdown correctly when cost is provided", () => {
    const cost = {
      cpuInstructions: 1500000,
      memoryBytes: 204800,
      minResourceFeeStroops: 25000,
      minResourceFeeXlm: "0.0025000",
    };

    render(
      <PreflightFeeModal
        isOpen={true}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        cost={cost}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("0.0025000 XLM")).toBeInTheDocument();
    expect(screen.getByText("25,000 stroops")).toBeInTheDocument();
    expect(screen.getByText("1,500,000")).toBeInTheDocument();
    expect(screen.getByText("200.0 KB")).toBeInTheDocument();
  });

  it("renders alert when error is provided and disables sign button", () => {
    render(
      <PreflightFeeModal
        isOpen={true}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        error="Contract execution reverted"
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Contract execution reverted");
    const confirmBtn = screen.getByRole("button", { name: /sign & submit/i });
    expect(confirmBtn).toBeDisabled();
  });

  it("triggers callbacks on cancel and confirm", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      <PreflightFeeModal
        isOpen={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        cost={{
          cpuInstructions: 100,
          memoryBytes: 100,
          minResourceFeeStroops: 100,
          minResourceFeeXlm: "0.0000100",
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /sign & submit/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
