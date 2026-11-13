import { test, expect } from "@playwright/test";

test.describe("ExportPilot PayFlow AI — Complete End-to-End User Journey", () => {
  test("1. Landing page loads with proper fintech branding and actions", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ExportPilot PayFlow AI/);
    await expect(page.locator("h1")).toContainText("Turn Foreign Enquiries Into Paid PayPal Orders in Minutes.");
    await expect(page.getByRole("button", { name: "Open Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Paste Buyer Enquiry" })).toBeVisible();
  });

  test("2. Dashboard displays KPIs and navigation controls", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("body")).toContainText("ExportPilot");
    await expect(page.locator("body")).toContainText("PAYPAL SANDBOX");
    await expect(page.getByRole("link", { name: /Orders Management/i })).toBeVisible();
  });

  test("3. AG Grid renders order records cleanly with zero console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/orders");
    await expect(page.locator(".ag-root-wrapper")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".ag-header-cell-text").first()).toBeVisible();
    expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
  });

  test("4. Complete UAE Leather Wallets Enquiry -> AI Extraction -> Quotation -> PayPal Checkout lifecycle", async ({ page }) => {
    test.setTimeout(120000);

    // A. Go to Enquiry page
    await page.goto("/orders/new");
    await expect(page.getByRole("heading", { name: /Raw Enquiry Intake/i })).toBeVisible();

    // B. Click "Load UAE Leather Wallets Sample"
    const sampleBtn = page.getByRole("button", { name: /Load UAE Leather Wallets/i });
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();

    // Verify textarea populated
    const textarea = page.locator("textarea");
    await expect(textarea).toHaveValue(/Tariq Al-Mansoor/);

    // C. Click "Extract Order with AI"
    const extractBtn = page.getByRole("button", { name: /Extract Order with AI/i });
    await expect(extractBtn).toBeEnabled();
    await extractBtn.click();

    // Wait for AI extraction to complete (up to 20s for Gemini API/fallback)
    await expect(page.locator("body")).toContainText("Missing Fields Flagged for Exporter Quote", { timeout: 20000 });
    await expect(page.locator("body")).toContainText("Handcrafted genuine leather wallets");
    await expect(page.locator("body")).toContainText("100 units");

    // D. Proceed to Quotation Review
    const proceedBtn = page.getByRole("button", { name: /Create Draft & Proceed to Quotation Review/i });
    await expect(proceedBtn).toBeVisible();
    await proceedBtn.click();

    // E. Verify on Quote page
    await expect(page).toHaveURL(/\/orders\/[a-z0-9-]+\/quote/);
    await expect(page.locator("body")).toContainText("Quotation Review & Pricing Editor");
    await expect(page.locator("body")).toContainText("Missing Price Detected by AI Guardrail");

    // Check that "Approve Quotation" is initially disabled
    const approveBtn = page.getByRole("button", { name: /Approve Quotation/i });
    await expect(approveBtn).toBeDisabled();

    // F. Enter approved unit price ($35.00)
    const priceInput = page.getByRole("cell", { name: /0.00 \$/ }).getByRole("textbox");
    await priceInput.fill("35.00");
    await priceInput.blur();

    // Check live recalculation: 100 * 35 = 3500 + 150 shipping = $3,650.00
    await expect(page.locator("body")).toContainText("$3,650.00");
    await expect(approveBtn).toBeEnabled();

    // G. Click "Approve Quotation"
    await approveBtn.scrollIntoViewIfNeeded();
    await approveBtn.click();

    // Check seller approval gate is complete
    await expect(page.locator("body")).toContainText("Quotation Approved & Locked!", { timeout: 10000 });
    const checkoutLink = page.getByRole("link", { name: /Proceed to PayPal Checkout/i });
    await expect(checkoutLink).toBeVisible();

    // H. Navigate to PayPal Checkout
    await checkoutLink.click();
    await expect(page).toHaveURL(/\/orders\/[a-z0-9-]+\/pay/);

    // Verify PayPal checkout UI
    await expect(page.locator("body")).toContainText("PayPal Sandbox Gateway", { timeout: 10000 });
    await expect(page.locator("body")).toContainText("4-Way Cryptographic Payment Reconciliation");

    // I. Simulate payment capture
    const simulateBtn = page.getByRole("button", { name: /Simulate Sandbox Payment & Capture/i });
    await expect(simulateBtn).toBeVisible();
    await simulateBtn.click();

    // J. Verify captured receipt
    await expect(page.locator("body")).toContainText("Payment Captured & Reconciled", { timeout: 10000 });
    await expect(page.locator("body")).toContainText("PayPal Capture ID");
    await expect(page.locator("body")).toContainText("COMPLETED (PayPal Sandbox)");
  });

  test("5. AI Trade & Finance Assistant answers questions with expert trade advice", async ({ page }) => {
    await page.goto("/assistant");
    await expect(page.locator("body")).toContainText("AI Trade & Finance Assistant");

    // Click quick prompt
    const promptBtn = page.getByRole("button", { name: /PayPal 4-Way Reconciliation/i });
    await expect(promptBtn).toBeVisible();
    await promptBtn.click();

    // Verify response rendered (wait up to 30s for AI reply)
    await expect(page.locator("body")).toContainText("PayPal Orders v2 Security Practice", { timeout: 30000 });
  });
});
