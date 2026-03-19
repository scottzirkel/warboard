import { test, expect, type Page } from '@playwright/test';
import { TEST_LIST, EXPECTED_PLAY_UNITS, buildLocalStorageState } from './fixtures';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Seed localStorage with the test list and Zustand state, then navigate. */
async function seedAndNavigate(page: Page) {
  await page.goto('/');
  const state = buildLocalStorageState(TEST_LIST);
  for (const [key, value] of Object.entries(state)) {
    await page.evaluate(
      ([k, v]) => localStorage.setItem(k, v),
      [key, value],
    );
  }
  await page.reload();
  await page.waitForFunction(
    () => !document.querySelector('.animate-spin'),
    { timeout: 15_000 },
  );
}

/**
 * Switch to Play mode and dismiss any modal that appears (Mission Twist, etc).
 */
async function switchToPlay(page: Page) {
  const playButton = page.locator('button[title="Switch to Play Mode"]');
  await expect(playButton).toBeVisible({ timeout: 10_000 });
  await playButton.click();

  // Wait a moment for any modal to appear
  await page.waitForTimeout(1_000);

  // Dismiss any open modal by pressing Escape repeatedly until no dialog exists
  for (let i = 0; i < 5; i++) {
    const dialog = page.locator('[role="dialog"]');
    if ((await dialog.count()) === 0) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Verify we're in play mode
  await expect(
    page.locator('button[title="Switch to Build Mode"]'),
  ).toBeVisible({ timeout: 10_000 });
}

/** Click a unit card in the Play mode army overview to select it. */
async function selectPlayUnit(page: Page, unitName: string) {
  // Use a more specific locator to find the unit card, not option elements
  const card = page.locator('.rounded-xl').filter({ hasText: unitName }).first();
  await expect(card).toBeVisible({ timeout: 5_000 });
  await card.click();
  await page.waitForTimeout(500);
}

/** Open the hamburger nav menu. */
async function openMenu(page: Page) {
  await page.locator('button[title="Menu"]').click();
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Load list and verify Play mode display', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndNavigate(page);
  });

  test('seeded state loads build mode with all units', async ({ page }) => {
    // Check for visible unit names in the army list panel (not hidden option elements)
    await expect(page.getByText('Shield-Captain').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Custodian Guard').first()).toBeVisible();
    await expect(page.getByText('Vertus Praetors').first()).toBeVisible();
    // Blade Champion may be scrolled — check it exists at all
    const bladeChampion = page.locator('.rounded-xl, .rounded-lg').filter({ hasText: 'Blade Champion' });
    await expect(bladeChampion.first()).toBeAttached({ timeout: 5_000 });
  });

  test('switches to play mode from seeded build state', async ({ page }) => {
    await switchToPlay(page);
    // The mode toggle changes to "Switch to Build Mode" in play mode
    await expect(
      page.locator('button[title="Switch to Build Mode"]'),
    ).toBeVisible();
  });

  test('all expected units appear in play mode', async ({ page }) => {
    await switchToPlay(page);

    for (const unit of EXPECTED_PLAY_UNITS) {
      await expect(
        page.getByText(unit.displayName, { exact: false }).first(),
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('unit stats display on PlayUnitCards', async ({ page }) => {
    await switchToPlay(page);

    // PlayUnitCard renders stat labels in rounded-md divs
    const statLabels = ['M', 'T', 'SV', 'W', 'LD', 'OC'];
    for (const label of statLabels) {
      await expect(
        page.locator('.rounded-md').filter({ hasText: label }).first(),
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('model counts display correctly for each unit', async ({ page }) => {
    await switchToPlay(page);

    for (const unit of EXPECTED_PLAY_UNITS) {
      const modelsText = `${unit.totalModels}/${unit.totalModels} models`;
      await expect(
        page.getByText(modelsText, { exact: false }).first(),
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('enhancement badge displays on unit with enhancement', async ({ page }) => {
    await switchToPlay(page);

    await expect(
      page.getByText('Auric Mantle').first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('warlord indicator displays on correct unit', async ({ page }) => {
    await switchToPlay(page);

    const warlordIcon = page.locator(
      '[title="Warlord"], [title="Attached leader is Warlord"]',
    );
    await expect(warlordIcon.first()).toBeVisible({ timeout: 5_000 });
  });

  test('selecting Custodian Guard shows mixed weapon loadout', async ({ page }) => {
    await switchToPlay(page);
    await selectPlayUnit(page, 'Custodian Guard');

    // Weapons header
    await expect(page.getByText('Weapons').first()).toBeVisible({ timeout: 5_000 });

    // Guardian Spear profile
    await expect(
      page.getByText('Guardian Spear', { exact: false }).first(),
    ).toBeVisible({ timeout: 5_000 });

    // Sentinel Blade profile
    await expect(
      page.getByText('Sentinel Blade', { exact: false }).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Vertus Praetors show hurricane bolter weapons', async ({ page }) => {
    await switchToPlay(page);
    await selectPlayUnit(page, 'Vertus Praetors');

    await expect(
      page.getByText('hurricane bolter', { exact: false }).first(),
    ).toBeVisible({ timeout: 5_000 });

    await expect(
      page.getByText('Interceptor lance', { exact: false }).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Blade Champion shows all three Vaultsword profiles', async ({ page }) => {
    await switchToPlay(page);
    await selectPlayUnit(page, 'Blade Champion');

    await expect(
      page.getByText('Behemor', { exact: false }).first(),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText('Hurricanis', { exact: false }).first(),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText('Victus', { exact: false }).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('wound tracking controls are present', async ({ page }) => {
    await switchToPlay(page);

    const woundDisplays = page.locator('text=/\\d+\\/\\d+ W/');
    await expect(woundDisplays.first()).toBeVisible({ timeout: 5_000 });
    const count = await woundDisplays.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('selecting unit shows correct stats in detail panel', async ({ page }) => {
    await switchToPlay(page);
    await selectPlayUnit(page, 'Vertus Praetors');

    // Detail panel has stat-cell elements
    const statGrid = page.locator('.stat-cell');
    await expect(statGrid.first()).toBeVisible({ timeout: 5_000 });

    // Vertus Praetors have T7 — check stat cell has "7"
    await expect(
      page.locator('.stat-cell').filter({ hasText: '7' }).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('abilities section appears for selected unit', async ({ page }) => {
    await switchToPlay(page);
    await selectPlayUnit(page, 'Blade Champion');

    await expect(page.getByText('Abilities').first()).toBeVisible({ timeout: 5_000 });
  });

  test('invulnerable save displays on unit cards', async ({ page }) => {
    await switchToPlay(page);

    // PlayUnitCard renders invuln as "4⧺"
    const invulnDisplay = page.locator('text=/4⧺/');
    await expect(invulnDisplay.first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Load list via Load modal flow', () => {
  test('load saved list from modal and verify in play', async ({ page }) => {
    // Seed localStorage with saved list + UI state (but no army state)
    await page.goto('/');
    const state = buildLocalStorageState(TEST_LIST);
    await page.evaluate(
      ([savedListsKey, savedListsVal, uiKey, uiVal]) => {
        localStorage.setItem(savedListsKey, savedListsVal);
        localStorage.setItem(uiKey, uiVal);
      },
      [
        'army-tracker-saved-lists',
        state['army-tracker-saved-lists'],
        'army-tracker-ui',
        state['army-tracker-ui'],
      ],
    );
    await page.reload();
    await page.waitForFunction(
      () => !document.querySelector('.animate-spin'),
      { timeout: 15_000 },
    );
    await page.waitForTimeout(2000);

    // Open hamburger menu → Load
    await openMenu(page);
    await page.getByText('Load List', { exact: true }).click();

    // Load modal
    await expect(page.getByText('Load Saved List')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('E2E Test Custodes')).toBeVisible({ timeout: 5_000 });

    // Select and load
    await page.getByText('E2E Test Custodes').click();
    await page.getByRole('button', { name: 'Load List' }).click();

    // Modal closes
    await expect(page.getByText('Load Saved List')).not.toBeVisible({ timeout: 5_000 });

    // Units loaded in build mode
    await expect(page.getByText('Shield-Captain').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Custodian Guard').first()).toBeVisible();
    await expect(page.getByText('Vertus Praetors').first()).toBeVisible();

    // Switch to play
    await switchToPlay(page);

    // Units visible in play mode
    await expect(
      page.getByText('Custodian Guard', { exact: false }).first(),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText('Vertus Praetors', { exact: false }).first(),
    ).toBeVisible({ timeout: 5_000 });
  });
});
