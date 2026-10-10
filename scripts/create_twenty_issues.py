#!/usr/bin/env python3
"""
Sequential issue creator for Stellar-PurplePay/Stellar-PurplePay.
Creates 20 well-defined, actionable issues with deliberate delay between requests
to respect GitHub rate limits and avoid account flagging.
"""

import subprocess
import time
import sys

REPO = "Stellar-PurplePay/Stellar-PurplePay"

ISSUES = [
    {
        "title": "[Docs] Add comprehensive troubleshooting FAQ for Freighter wallet connection failures",
        "labels": ["documentation", "good first issue"],
        "body": """### Summary
Contributors and users occasionally face connection errors when connecting the Freighter wallet extension to the Stellar PurplePay frontend.

### Problem
Common failure states include:
- Network mismatch (user is on Stellar Public/Mainnet instead of Testnet).
- Freighter pop-up blocked or extension locked.
- Missing testnet funds (unfunded account on Horizon).

### Proposed Solution
1. Create `docs/freighter-troubleshooting.md` documenting step-by-step resolution for each common error.
2. Link the guide in `README.md` and in `frontend/components/WalletConnect.tsx` when a connection error is caught.

### Acceptance Criteria
- [ ] `docs/freighter-troubleshooting.md` created with clear screenshots/instructions.
- [ ] Wallet connect error states link directly to troubleshooting guide.
"""
    },
    {
        "title": "[Frontend] Add ARIA live regions for escrow transaction status updates",
        "labels": ["accessibility", "enhancement", "good first issue"],
        "body": """### Summary
Improve screen reader accessibility during blockchain transaction lifecycle changes.

### Problem
When an escrow status transitions from `pending` to `confirmed` or `released`, screen reader users are not automatically informed of the state change.

### Proposed Solution
Add `aria-live="polite"` and `role="status"` attributes to the transaction status banner in `frontend/components/EscrowStatusBanner.tsx`.

### Acceptance Criteria
- [ ] Status updates trigger screen reader announcements via ARIA live region.
- [ ] Color contrast for status states meets WCAG 2.1 AA standards.
"""
    },
    {
        "title": "[Frontend] Add clipboard copy confirmation toast to wallet address display",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Provide immediate visual and tactile feedback when a user copies their public key address.

### Problem
Clicking on the truncated Stellar address currently copies to clipboard silently without a clear indicator that the copy succeeded.

### Proposed Solution
Update the address click handler in `frontend/components/Navbar.tsx` to display a temporary (2-second) tooltip or toast message: "Address copied to clipboard!".

### Acceptance Criteria
- [ ] Clicking the wallet address copies the full Stellar G... address.
- [ ] A brief "Copied!" notification or badge state appears.
- [ ] State resets automatically after 2 seconds.
"""
    },
    {
        "title": "[Backend] Add input length validation to job title and description endpoints",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Enforce reasonable length boundaries on user-submitted job postings to prevent database bloat and UI overflow.

### Problem
The job creation endpoint accepts arbitrary length strings without strict upper bounds on title and description.

### Proposed Solution
In `backend/src/validators/jobValidator.js`:
- Limit `title` to between 5 and 120 characters.
- Limit `description` to between 20 and 10,000 characters.
- Ensure clear, localized error messages are returned on validation failure.

### Acceptance Criteria
- [ ] Zod schema rejects titles > 120 chars with status 400.
- [ ] Zod schema rejects descriptions > 10,000 chars with status 400.
- [ ] Unit tests added in `backend/src/validators/jobValidator.test.js`.
"""
    },
    {
        "title": "[Frontend] Implement skeleton loaders for job card list while querying backend",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Improve user experience during initial data fetching on the marketplace browse page.

### Problem
The job marketplace displays a generic spinner or blank space while the jobs list is loading from the API.

### Proposed Solution
Integrate `frontend/components/JobCardSkeleton.tsx` during the `isLoading` state in `frontend/pages/jobs/index.tsx`. Display 3-5 skeleton cards matching the layout of real job cards.

### Acceptance Criteria
- [ ] Skeleton cards render while jobs are loading.
- [ ] Transitions smoothly to loaded job items without layout shift.
"""
    },
    {
        "title": "[Docs] Document environment variable defaults and validation matrix in docs/environment-variables.md",
        "labels": ["documentation", "good first issue"],
        "body": """### Summary
Keep environment variable documentation up to date with the latest security and mock configuration flags.

### Problem
Recent additions such as `CSRF_SECRET`, `NEXT_PUBLIC_USE_CONTRACT_MOCK`, and `DATABASE_ENCRYPTION_KEY` need detailed documentation explaining their purpose, default values, and production recommendations.

### Proposed Solution
Update `docs/environment-variables.md` to list all current variables with:
- Purpose & security implications
- Expected type/format
- Local dev default vs production requirement

### Acceptance Criteria
- [ ] Every key in `backend/.env.example` and `frontend/.env.local.example` has a matching section in `docs/environment-variables.md`.
"""
    },
    {
        "title": "[Backend] Add HTTP response headers for security (X-Content-Type-Options, Referrer-Policy)",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Ensure standard OWASP-recommended security headers are consistently returned on all API endpoints.

### Problem
While basic middleware is mounted in Express, we should verify that `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` are explicitly set across all responses.

### Proposed Solution
Review and configure Helmet middleware in `backend/src/server.js` to ensure:
- `xContentTypeOptions: true`
- `referrerPolicy: { policy: "strict-origin-when-cross-origin" }`

### Acceptance Criteria
- [ ] Automated check verifies headers are present on `GET /health` and `GET /api/jobs`.
- [ ] Test added in `backend/tests/securityHeaders.test.js`.
"""
    },
    {
        "title": "[Frontend] Validate milestone percentage totals equal 100% before contract submission",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Prevent client-side submission of invalid milestone escrow splits.

### Problem
When creating a multi-milestone contract, submitting before milestone allocations total 100% causes on-chain transaction reverts or contract errors.

### Proposed Solution
In `frontend/components/MilestoneForm.tsx`:
- Compute real-time sum of milestone allocation percentages or amounts.
- Disable the "Submit Contract" button if the total is not equal to 100% (or total project budget).
- Display a helpful visual indicator showing remaining or excess percentage.

### Acceptance Criteria
- [ ] Form prevents submission if sum != 100%.
- [ ] User receives clear feedback indicating current total.
"""
    },
    {
        "title": "[Contracts] Add unit tests for zero-amount escrow deposit rejection in Soroban contract",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Expand test coverage for Soroban escrow contract input validation.

### Problem
We should verify via explicit Rust unit tests that calling `deposit_escrow` with an amount of `0` or negative values panics or returns an expected error code.

### Proposed Solution
Add a test function `test_zero_amount_deposit_fails` in `contracts/marketpay-contract/src/test.rs` that attempts to initialize an escrow with `amount: 0` and asserts the error.

### Acceptance Criteria
- [ ] Test passes when running `cargo test` in `contracts/marketpay-contract`.
- [ ] Validates contract invariant that escrow amount must be positive.
"""
    },
    {
        "title": "[Backend] Add /health/ready probe with database connection latency check",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Provide a dedicated readiness probe endpoint for container orchestration systems (Kubernetes/Docker Compose).

### Problem
The current `/health` endpoint checks if Express is running, but orchestrators need to distinguish between basic liveness and full database readiness.

### Proposed Solution
Add `GET /health/ready` in `backend/src/routes/health.js` that:
- Executes `SELECT 1` via `pool.query()`.
- Returns `{ status: "ready", dbLatencyMs: number }` with HTTP 200 on success.
- Returns `{ status: "unhealthy", error: string }` with HTTP 503 on database disconnection.

### Acceptance Criteria
- [ ] `GET /health/ready` returns 200 when database is healthy.
- [ ] Returns 503 if database pool fails.
- [ ] Route covered by unit/integration tests.
"""
    },
    {
        "title": "[Frontend] Add keyboard navigation shortcuts (Esc to close) to Job Proposal modal",
        "labels": ["accessibility", "enhancement", "good first issue"],
        "body": """### Summary
Improve keyboard accessibility and modal user experience across the application.

### Problem
Users cannot dismiss open proposal modals or bid dialogues by pressing the `Escape` key, requiring manual mouse clicks on the close button.

### Proposed Solution
In `frontend/components/ProposalModal.tsx` and related modal components:
- Add a global `keydown` listener that closes the modal on `event.key === 'Escape'`.
- Clean up the event listener on component unmount.
- Ensure focus returns to the triggering button upon close.

### Acceptance Criteria
- [ ] Pressing `Esc` closes the modal immediately.
- [ ] Modal can still be closed via overlay click and close button.
- [ ] No memory leaks from dangling event listeners.
"""
    },
    {
        "title": "[Backend] Standardize error response JSON shape for rate limiting rejections",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Ensure uniform API response formats across all HTTP status codes, including 429 Too Many Requests.

### Problem
When the rate limiter middleware triggers, it should return the standard project error format rather than plain text or non-standard JSON.

### Proposed Solution
Configure `express-rate-limit` handlers in `backend/src/middleware/rateLimiter.js`:
```json
{
  \"success\": false,
  \"error\": {
    \"code\": \"RATE_LIMIT_EXCEEDED\",
    \"message\": \"Too many requests from this IP, please try again later.\"
  }
}
```

### Acceptance Criteria
- [ ] Exceeding rate limit returns JSON with status 429.
- [ ] Response structure conforms to standard API contract.
"""
    },
    {
        "title": "[Frontend] Add empty state illustration and message for search results with 0 matches",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Provide a friendly, helpful UI state when job searches or tag filters return zero results.

### Problem
Searching for non-existent keywords currently leaves an empty white container, which looks like a broken page.

### Proposed Solution
Create a reusable `frontend/components/EmptyState.tsx` component with:
- An icon or SVG illustration.
- Headline: "No jobs found matching your criteria".
- Subtitle: "Try adjusting your search terms or clearing your filters."
- A "Clear Filters" action button that resets search parameters.

### Acceptance Criteria
- [ ] Empty state appears when filtered job array is empty.
- [ ] "Clear Filters" button resets search input and tags.
"""
    },
    {
        "title": "[Docs] Add Soroban contract local testing walkthrough in docs/contract-deployment.md",
        "labels": ["documentation", "good first issue"],
        "body": """### Summary
Clarify the steps for developers wishing to compile and test Soroban smart contracts locally.

### Problem
New contributors to the contracts workspace need a clear explanation of how to test contracts using Cargo without requiring an active Stellar testnet connection.

### Proposed Solution
Update `docs/contract-deployment.md` with a "Local Testing (No Network Required)" section outlining:
- Target installation: `rustup target add wasm32-unknown-unknown`
- Running unit tests: `cargo test`
- Building release WASM: `cargo build --target wasm32v1-none --release`

### Acceptance Criteria
- [ ] Documentation updated with copy-pasteable commands.
- [ ] Explains how mock testing interacts with contract verification.
"""
    },
    {
        "title": "[Frontend] Sanitize and format token amount inputs to prevent floating point inaccuracies",
        "labels": ["bug", "good first issue"],
        "body": """### Summary
Ensure token inputs (XLM/USDC) do not exceed Stellar precision limits (7 decimal places).

### Problem
Stellar operates on stroops (1 XLM = 10^7 stroops). Users entering numbers with more than 7 decimal places can cause rounding errors or contract panics.

### Proposed Solution
Add a utility function `formatStellarAmount` in `frontend/utils/formatters.ts` that:
- Truncates inputs to maximum 7 decimal digits.
- Removes invalid characters (non-digits and extra decimal points).
- Prevents leading zeros unless formatted as `0.xxx`.

### Acceptance Criteria
- [ ] Amount inputs reject more than 7 decimal digits.
- [ ] Unit tests in `frontend/__tests__/formatters.test.ts` verify rounding and truncation edge cases.
"""
    },
    {
        "title": "[Backend] Add structured logging for failed CSRF validation attempts",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Enhance security observability by logging CSRF validation failures with context.

### Problem
CSRF failures currently return 403 Forbidden without logging contextual details for security auditing and debugging test suites.

### Proposed Solution
In `backend/src/middleware/csrf.js`:
- Intercept CSRF errors and log a warning containing request method, path, and sanitized user IP.
- Ensure sensitive headers and cookies are not included in log payloads.

### Acceptance Criteria
- [ ] CSRF failure triggers `logger.warn` with structured metadata.
- [ ] No secrets or tokens are leaked in logs.
"""
    },
    {
        "title": "[Frontend] Add visual badge for Freelancer verification tiers in proposal list",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Help clients evaluate job applicants quickly by displaying freelancer tier badges on proposals.

### Problem
Proposal cards currently show the freelancer's wallet address and proposal text, but do not display their verification badge or completed project tier.

### Proposed Solution
Incorporate `frontend/components/FreelancerTierBadge.tsx` into `frontend/components/ProposalCard.tsx` to display:
- Bronze / Silver / Gold tier based on past on-chain escrow completions.
- Tooltip explaining tier criteria.

### Acceptance Criteria
- [ ] Freelancer tier badge renders on proposal cards.
- [ ] Fallback state handles newly registered accounts without past history gracefully.
"""
    },
    {
        "title": "[Backend] Validate UUID format on job ID route parameters across all /api/jobs/:id subroutes",
        "labels": ["bug", "good first issue"],
        "body": """### Summary
Prevent uncaught PostgreSQL cast errors when invalid non-UUID parameters are passed in URLs.

### Problem
Requesting `/api/jobs/invalid-id` can trigger a database error: `invalid input syntax for type uuid: "invalid-id"`, resulting in a 500 error instead of a 400 Bad Request.

### Proposed Solution
Create a reusable route parameter validator middleware `validateUuidParam("id")` in `backend/src/middleware/validateParams.js` and mount it on routes accepting UUID path parameters.

### Acceptance Criteria
- [ ] Invalid UUID in `/api/jobs/:id` returns 400 Bad Request with code `INVALID_PARAMETER`.
- [ ] Valid UUID passes through to controller normally.
- [ ] Unit tests cover both valid and invalid UUID parameter scenarios.
"""
    },
    {
        "title": "[Frontend] Implement dark mode toggle persistence with localStorage",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Preserve user theme preference across browser sessions.

### Problem
If a user switches themes between dark and light mode, refreshing the page or navigating between tabs resets the theme back to the system default.

### Proposed Solution
Update `frontend/components/ThemeProvider.tsx` to:
- Store selected theme (`light` or `dark`) in `localStorage`.
- Read stored theme on initial render, falling back to `window.matchMedia('(prefers-color-scheme: dark)')`.
- Apply appropriate classes to `<html>` root.

### Acceptance Criteria
- [ ] Switching theme saves setting to `localStorage`.
- [ ] Reloading page preserves selected theme without visual flicker.
"""
    },
    {
        "title": "[CI/DevOps] Add automatic PR labeler workflow for frontend, backend, and contracts",
        "labels": ["enhancement", "good first issue"],
        "body": """### Summary
Automatically categorize incoming pull requests with relevant component labels.

### Problem
Maintainers currently have to manually label pull requests as `frontend`, `backend`, or `smart-contract`.

### Proposed Solution
Add `.github/workflows/labeler.yml` and `.github/labeler.yml` using `actions/labeler@v5`:
- `frontend`: files in `frontend/**`
- `backend`: files in `backend/**`
- `contracts`: files in `contracts/**`
- `documentation`: files in `docs/**` or `*.md`

### Acceptance Criteria
- [ ] Pull requests automatically receive appropriate labels based on touched paths.
- [ ] Workflow runs quickly and does not block PR merging.
"""
    }
]

def main():
    print(f"Creating {len(ISSUES)} issues sequentially on {REPO}...")
    print("Enforcing a 5-second delay between issues to prevent account rate-limiting or flagging.\n")

    # Query existing issues to avoid duplicating
    try:
        check = subprocess.run(
            ["gh", "issue", "list", "--repo", REPO, "--json", "title", "--jq", ".[].title"],
            capture_output=True, text=True, check=True
        )
        existing_titles = set(line.strip() for line in check.stdout.splitlines() if line.strip())
    except Exception:
        existing_titles = set()

    created = 0
    for idx, item in enumerate(ISSUES, 1):
        title = item["title"]
        body = item["body"].strip()
        labels = item["labels"]

        if title in existing_titles:
            print(f"[{idx}/{len(ISSUES)}] Skipping existing: {title}")
            created += 1
            continue

        print(f"[{idx}/{len(ISSUES)}] Creating: {title}")

        cmd = [
            "gh", "issue", "create",
            "--repo", REPO,
            "--title", title,
            "--body", body
        ]
        for l in labels:
            cmd.extend(["--label", l])

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            url = res.stdout.strip()
            print(f"    [OK] Created: {url}")
            created += 1
            existing_titles.add(title)
        except subprocess.CalledProcessError as err:
            print(f"    [FAIL] Error: {err.stderr.strip()}", file=sys.stderr)
            if "rate limit" in err.stderr.lower():
                print("Hit rate limit! Sleeping 60s...", file=sys.stderr)
                time.sleep(60)

        # Polite 5-second spacing to avoid bot detection or flagging
        if idx < len(ISSUES):
            time.sleep(5)

    print(f"\nFinished: Successfully processed {created}/{len(ISSUES)} issues on {REPO}.")

if __name__ == "__main__":
    main()
