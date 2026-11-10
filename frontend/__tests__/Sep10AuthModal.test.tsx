import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Sep10AuthModal } from "../components/Sep10AuthModal";

describe("Sep10AuthModal", () => {
  const publicKey = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
  const fakeChallengeXdr = "AAAA...fake...challenge";
  const fakeSignedXdr = "AAAA...fake...signed";
  const fakeToken = "eyJhbGciOiJIUzI1NiJ9.fake.token";

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <Sep10AuthModal
        isOpen={false}
        onClose={jest.fn()}
        publicKey={publicKey}
        onSuccess={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal dialog and connected wallet address when open", () => {
    render(
      <Sep10AuthModal
        isOpen={true}
        onClose={jest.fn()}
        publicKey={publicKey}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Stellar Web Authentication")).toBeInTheDocument();
    expect(screen.getByTestId("auth-wallet-address")).toHaveTextContent("GAAAAA...AAAWHF");
    expect(screen.getByTestId("start-auth-button")).toBeInTheDocument();
  });

  it("completes full auth flow with onSignChallenge callback", async () => {
    const onSuccess = jest.fn();
    const onSignChallenge = jest.fn().mockResolvedValue(fakeSignedXdr);

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transaction: fakeChallengeXdr }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: fakeToken }),
      }) as any;

    render(
      <Sep10AuthModal
        isOpen={true}
        onClose={jest.fn()}
        publicKey={publicKey}
        onSuccess={onSuccess}
        onSignChallenge={onSignChallenge}
      />
    );

    fireEvent.click(screen.getByTestId("start-auth-button"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-success-state")).toBeInTheDocument();
    });

    expect(onSignChallenge).toHaveBeenCalledWith(fakeChallengeXdr);
    expect(onSuccess).toHaveBeenCalledWith(fakeToken);
  });

  it("displays error message and allows retry on failure", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      text: async () => "Challenge expired",
    }) as any;

    render(
      <Sep10AuthModal
        isOpen={true}
        onClose={jest.fn()}
        publicKey={publicKey}
        onSuccess={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("start-auth-button"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-error-state")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("Challenge expired");
    });

    expect(screen.getByTestId("retry-auth-button")).toBeInTheDocument();
  });
});
