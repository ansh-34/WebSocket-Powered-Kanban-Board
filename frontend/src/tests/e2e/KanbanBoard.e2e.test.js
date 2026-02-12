import { test, expect } from "@playwright/test";

test("User can manage tasks on the board", async ({ page }) => {
  await page.goto("http://localhost:3000");

  await expect(page.getByText("Real-time Kanban Board")).toBeVisible();
  await expect(page.getByText("Kanban Board")).toBeVisible();
  await expect(page.getByTestId("tasks-chart")).toBeVisible();
  await expect(page.getByText("Tasks per Column")).toBeVisible();
  await expect(page.getByText("Completion Split")).toBeVisible();

  await page.getByLabel("Task title").fill("Ship release");
  await page.getByRole("button", { name: "Add Task" }).click();

  await expect(page.getByDisplayValue("Ship release")).toBeVisible();

  await page
    .getByLabel("Priority Ship release")
    .selectOption({ label: "High" });
  await page
    .getByLabel("Category Ship release")
    .selectOption({ label: "Bug" });

  await page.dragAndDrop(
    '[data-testid^="task-"]',
    '[data-testid="column-in-progress"]'
  );

  await expect(
    page.getByText("In Progress:").locator("..")
  ).toContainText("1");

  await page.dragAndDrop(
    '[data-testid^="task-"]',
    '[data-testid="column-done"]'
  );

  await expect(page.getByText(/100% complete/)).toBeVisible();

  const fileInput = page.getByLabel("Upload Ship release");
  await fileInput.setInputFiles({
    name: "spec.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%Test PDF"),
  });

  await expect(page.getByText("spec.pdf")).toBeVisible();

  await page.getByLabel("Upload Ship release").setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("invalid"),
  });

  await expect(
    page.getByText("Unsupported file type. Upload images or PDFs only.")
  ).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByDisplayValue("Ship release")).toHaveCount(0);
});

test("Real-time updates sync across clients", async ({ browser }) => {
  const pageA = await browser.newPage();
  const pageB = await browser.newPage();

  await pageA.goto("http://localhost:3000");
  await pageB.goto("http://localhost:3000");

  await expect(pageA.getByText("Kanban Board")).toBeVisible();
  await expect(pageB.getByText("Kanban Board")).toBeVisible();

  await pageA.getByLabel("Task title").fill("Sync check");
  await pageA.getByRole("button", { name: "Add Task" }).click();

  await expect(pageA.getByDisplayValue("Sync check")).toBeVisible();
  await expect(pageB.getByDisplayValue("Sync check")).toBeVisible();

  await pageB
    .getByLabel("Priority Sync check")
    .selectOption({ label: "High" });

  await expect(pageA.getByLabel("Priority Sync check")).toHaveValue("High");

  await pageA.close();
  await pageB.close();
});
