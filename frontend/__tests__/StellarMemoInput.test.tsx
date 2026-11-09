import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StellarMemoInput } from "../components/StellarMemoInput";

describe("StellarMemoInput component", () => {
  it("renders with memo type selector and hides value input when none", () => {
    render(<StellarMemoInput memoType="none" memoValue="" onChange={jest.fn()} />);

    expect(screen.getByRole("group", { name: "Stellar Transaction Memo" })).toBeInTheDocument();
    expect(screen.getByLabelText("Memo Type")).toHaveValue("none");
    expect(screen.queryByPlaceholderText(/Max 28 bytes/)).toBeNull();
  });

  it("shows byte counter and input field when type is text", () => {
    render(<StellarMemoInput memoType="text" memoValue="invoice-101" onChange={jest.fn()} />);

    expect(screen.getByText("11 / 28 bytes")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("Max 28 bytes text...");
    expect(input).toHaveValue("invoice-101");
  });

  it("shows error alert when MEMO_TEXT exceeds 28 bytes", () => {
    const longText = "a".repeat(29);
    render(<StellarMemoInput memoType="text" memoValue={longText} onChange={jest.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("exceeds 28 bytes maximum");
  });

  it("calls onChange callback with updated memo type and validation state", () => {
    const handleChange = jest.fn();
    render(<StellarMemoInput memoType="text" memoValue="" onChange={handleChange} />);

    const select = screen.getByLabelText("Memo Type");
    fireEvent.change(select, { target: { value: "id" } });

    expect(handleChange).toHaveBeenCalledWith("id", "", false);
  });
});
