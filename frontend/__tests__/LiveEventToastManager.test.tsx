import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LiveEventToastManager, LiveEventToast } from "../components/LiveEventToastManager";

describe("LiveEventToastManager", () => {
  const mockToasts: LiveEventToast[] = [
    {
      id: "toast-1",
      type: "released",
      jobId: "job-801",
      title: "Milestone #1 Released",
      message: "1,500 XLM disbursed to freelancer",
      timestamp: 1795000000000,
    },
    {
      id: "toast-2",
      type: "disputed",
      jobId: "job-802",
      title: "Dispute Opened by Client",
      message: "Evidence digest submitted on-chain",
      timestamp: 1795000005000,
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not render when toasts list is empty", () => {
    const { container } = render(<LiveEventToastManager toasts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders toast alerts with badges, title, and job ID", () => {
    render(<LiveEventToastManager toasts={mockToasts} />);

    expect(screen.getByText("Milestone Released")).toBeInTheDocument();
    expect(screen.getByText("Milestone #1 Released")).toBeInTheDocument();
    expect(screen.getByText("1,500 XLM disbursed to freelancer")).toBeInTheDocument();
    expect(screen.getByText("Job: job-801")).toBeInTheDocument();

    expect(screen.getByText("Dispute Opened")).toBeInTheDocument();
    expect(screen.getByText("Dispute Opened by Client")).toBeInTheDocument();
    expect(screen.getByText("Job: job-802")).toBeInTheDocument();
  });

  it("calls onDismissToast when dismiss button is clicked", () => {
    const mockDismiss = jest.fn();
    render(<LiveEventToastManager toasts={mockToasts} onDismissToast={mockDismiss} />);

    const dismissButtons = screen.getAllByRole("button", { name: "Dismiss notification" });
    fireEvent.click(dismissButtons[0]);

    expect(mockDismiss).toHaveBeenCalledWith("toast-1");
  });

  it("auto dismisses oldest toast after timeout", () => {
    const mockDismiss = jest.fn();
    render(
      <LiveEventToastManager
        toasts={mockToasts}
        onDismissToast={mockDismiss}
        autoDismissMs={3000}
      />
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockDismiss).toHaveBeenCalledWith("toast-1");
  });
});

