// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { DashboardClient } from "./DashboardClient";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

expect.extend(toHaveNoViolations);

/**
 * Structural accessibility coverage for /dashboard in permanent CI —
 * the E2E a11y suite (e2e/a11y.spec.ts) can't reach this route since it
 * needs a live Supabase session. jsdom has no real layout/font engine, so
 * axe's color-contrast rule can't run here (verified separately, by hand,
 * against a real browser — see README's Testing section); this catches
 * everything else axe checks: missing accessible names, ARIA misuse,
 * heading order, landmark structure. That's exactly the class of bug this
 * caught in the E2E suite before (a <select> with no label).
 */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

afterEach(() => cleanup());

const baseProps = {
  email: "founder@runway.dev",
  cashAvailable: 12000,
  currency: "USD",
  categories: [
    { id: "c1", name: "Software" },
    { id: "c2", name: "Food & Dining" },
  ],
};

function renderDashboard(props: Partial<React.ComponentProps<typeof DashboardClient>> = {}) {
  return render(
    <LanguageProvider>
      <DashboardClient
        {...baseProps}
        hasTransactions={true}
        spendRows={[{ month: "2026-06-01", categoryName: "Software", total: -480 }]}
        transactions={[
          { merchantId: "m1", merchantName: "aws", occurredOn: "2026-05-01", amount: -120 },
          { merchantId: "m1", merchantName: "aws", occurredOn: "2026-06-01", amount: -120 },
        ]}
        categoryByMerchant={{ m1: "c1" }}
        {...props}
      />
    </LanguageProvider>,
  );
}

describe("DashboardClient accessibility", () => {
  it("has no violations in the default (populated) state", async () => {
    const { container } = renderDashboard();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations in the empty state", async () => {
    const { container } = renderDashboard({
      hasTransactions: false,
      spendRows: [],
      transactions: [],
      categoryByMerchant: {},
    });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations with the add-transaction form open", async () => {
    const { container, getByRole } = renderDashboard();
    fireEvent.click(getByRole("button", { name: /agregar transacción/i }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
