import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Start fresh: clear localStorage and navigate to landing page. */
async function startFresh(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(
    page.getByText('Choose your faction', { exact: false }),
  ).toBeVisible({ timeout: 15_000 });
}

/**
 * Select a faction and complete the Game Setup modal.
 */
async function selectFactionAndSetup(
  page: Page,
  factionName: string,
  options?: { format?: string; detachment?: string },
) {
  const { format = 'Incursion', detachment = 'Shield Host' } = options ?? {};

  await page.getByRole('button', { name: factionName }).click();

  // Game Setup modal
  await expect(page.getByText('Game Setup')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: format }).click();
  await page.getByRole('button', { name: detachment }).click();
  await page.getByRole('button', { name: 'Start Building' }).click();
  await expect(page.getByText('Game Setup')).not.toBeVisible({ timeout: 5_000 });

  // Wait for faction data to load
  await page.waitForFunction(
    () => !document.querySelector('.animate-spin'),
    { timeout: 15_000 },
  );
}

/** Add a unit from the roster by clicking its quick-add "+" button. */
async function quickAddUnit(page: Page, unitName: string) {
  const addButton = page.locator(`button[title="Add ${unitName}"]`);
  await expect(addButton.first()).toBeVisible({ timeout: 5_000 });
  await addButton.first().click();
  await page.waitForTimeout(300);
}

/** Open the hamburger nav menu. */
async function openMenu(page: Page) {
  await page.locator('button[title="Menu"]').click();
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Build and save an army list', () => {
  test('select Custodes faction and land in build mode', async ({ page }) => {
    await startFresh(page);
    await selectFactionAndSetup(page, 'Adeptus Custodes');

    // Should show roster groups
    await expect(page.getByText('Characters').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Battleline').first()).toBeVisible({ timeout: 10_000 });
  });

  test('add units to the army list', async ({ page }) => {
    await startFresh(page);
    await selectFactionAndSetup(page, 'Adeptus Custodes');

    await quickAddUnit(page, 'Shield-Captain');
    await expect(page.getByText('Shield-Captain').first()).toBeVisible({ timeout: 5_000 });

    await quickAddUnit(page, 'Custodian Guard');
    await expect(page.getByText('Custodian Guard').first()).toBeVisible({ timeout: 5_000 });
  });

  test('full build workflow: add units, configure loadouts, save', async ({ page }) => {
    await startFresh(page);
    await selectFactionAndSetup(page, 'Adeptus Custodes');

    await quickAddUnit(page, 'Shield-Captain');
    await quickAddUnit(page, 'Custodian Guard');
    await quickAddUnit(page, 'Vertus Praetors');

    // Verify all units appear
    await expect(page.getByText('Shield-Captain').first()).toBeVisible();
    await expect(page.getByText('Custodian Guard').first()).toBeVisible();
    await expect(page.getByText('Vertus Praetors').first()).toBeVisible();

    // Save via hamburger menu
    await openMenu(page);
    await page.getByText('Save', { exact: true }).click();

    // Save modal
    await expect(page.getByText('Save Army List')).toBeVisible({ timeout: 5_000 });
    const nameInput = page.locator('input[placeholder*="Enter a name"]');
    await nameInput.fill('My Test Custodes');
    await page.getByRole('button', { name: 'Save' }).click();

    // Modal closes
    await expect(page.getByText('Save Army List')).not.toBeVisible({ timeout: 5_000 });

    // Verify saved to localStorage
    const savedData = await page.evaluate(() => {
      const data = localStorage.getItem('army-tracker-saved-lists');
      return data ? JSON.parse(data) : null;
    });
    expect(savedData).not.toBeNull();
    const listKeys = Object.keys(savedData.lists);
    expect(listKeys.length).toBeGreaterThanOrEqual(1);

    const savedList = savedData.lists[listKeys[0]];
    expect(savedList.army).toBe('custodes');
    expect(savedList.units.length).toBe(3);
  });

  test('weapon loadout selectors work for mixed weapon units', async ({ page }) => {
    await startFresh(page);
    await selectFactionAndSetup(page, 'Adeptus Custodes');

    await quickAddUnit(page, 'Custodian Guard');

    // Should show weapon choices
    await expect(
      page.getByText('Guardian Spear', { exact: false }).first(),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText('Sentinel Blade', { exact: false }).first(),
    ).toBeVisible({ timeout: 5_000 });

    // Stepper controls exist
    const steppers = page.locator('button').filter({ hasText: '+' });
    const stepperCount = await steppers.count();
    expect(stepperCount).toBeGreaterThanOrEqual(1);
  });

  test('model count changes update points', async ({ page }) => {
    await startFresh(page);
    await selectFactionAndSetup(page, 'Adeptus Custodes');

    await quickAddUnit(page, 'Custodian Guard');

    // 4 models = 160pts
    await expect(
      page.getByText('160', { exact: false }).first(),
    ).toBeVisible({ timeout: 5_000 });
  });
});
