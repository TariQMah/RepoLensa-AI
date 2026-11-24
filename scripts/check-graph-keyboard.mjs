// Keyboard and mobile accessibility check for the graph explorer.
//
// Runs the app in a real browser (Playwright, installed ad hoc like
// scripts/capture-showcase.mjs) and checks the flow from issue #10:
// open file details with the keyboard only, close with Escape, and get
// focus back on the element that opened the details. Also checks that
// keyboard focus stays visible and that a small viewport keeps pinch
// zoom enabled and does not overflow horizontally.
//
// Usage:
//   npm run dev            # in one terminal (or set CHECK_URL)
//   npm run test:browser   # in another terminal
//   CHECK_URL=http://127.0.0.1:4173 npm run test:browser
//
// Exit code is 0 when every check passes and 1 otherwise.

import { chromium } from "playwright";

const target = process.env.CHECK_URL || "http://127.0.0.1:5173";
const failures = [];

function check(name, passed, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures.push(name);
}

async function activeElementDescription(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return "none";
    return el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 40) || el.tagName;
  });
}

async function waitForFocus(page, selector, timeout = 5_000) {
  try {
    await page.waitForFunction(
      (sel) => document.activeElement === document.querySelector(sel),
      selector,
      { timeout },
    );
    return true;
  } catch {
    return false;
  }
}

async function openFileDetails(page) {
  await page.getByRole("button", { name: /See demo/i }).click();
  await page.waitForFunction(
    () => document.querySelectorAll(".react-flow__node").length > 5,
    undefined,
    { timeout: 25_000 },
  );
  await page.getByRole("button", { name: "Modules" }).click();
  const fileButton = page.locator(".file-list button").first();
  await fileButton.waitFor({ state: "visible", timeout: 10_000 });
  // Focus with the keyboard, then open with Enter: this is the
  // keyboard-only path to file details.
  await fileButton.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "File details" });
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  return { dialog, fileButton };
}

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  page.on("pageerror", (error) => {
    console.error("Page error:", error);
    failures.push("no page errors");
  });
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator("#architecture").waitFor({ state: "visible", timeout: 30_000 });

  // Desktop: keyboard-only file details, focus in and focus back.
  const { dialog } = await openFileDetails(page);
  check(
    "focus moves into the file details dialog on open",
    await waitForFocus(page, 'button[aria-label="Close file details"]'),
    await activeElementDescription(page),
  );
  const focusStyle = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    return `${style.outlineStyle} ${style.outlineWidth}`;
  });
  check("keyboard focus on the dialog close button is visible", focusStyle === "solid 3px", focusStyle);
  await page.keyboard.press("Tab");
  check(
    "no keyboard trap in the file details dialog",
    (await activeElementDescription(page)) !== "Close file details",
    await activeElementDescription(page),
  );
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached", timeout: 10_000 });
  check(
    "Escape closes the dialog and focus returns to the file button",
    await waitForFocus(page, ".file-list button"),
    await activeElementDescription(page),
  );

  // A focused graph node must keep a visible outline too.
  await page.keyboard.press("Tab");
  await page.locator(".react-flow__node").first().focus();
  const nodeFocusStyle = await page.evaluate(() => {
    const node = document.querySelector(".react-flow__node");
    const style = getComputedStyle(node);
    return `${style.outlineStyle} ${style.outlineWidth}`;
  });
  check("keyboard focus on a graph node is visible", nodeFocusStyle === "solid 3px", nodeFocusStyle);

  // Mobile viewport: pinch zoom stays enabled and nothing overflows.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const viewportContent = await page.evaluate(
    () => document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? "",
  );
  check(
    "mobile viewport does not disable pinch zoom",
    !/user-scalable\s*=\s*no|maximum-scale/i.test(viewportContent),
    viewportContent,
  );
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  check("no horizontal overflow at 390px", overflow <= 1, `${overflow}px`);
  const mobile = await openFileDetails(page);
  check("file details open by keyboard at 390px", await mobile.dialog.isVisible());
  await page.keyboard.press("Escape");
  await mobile.dialog.waitFor({ state: "detached", timeout: 10_000 });
  check(
    "Escape closes the dialog at 390px",
    (await page.locator('[role="dialog"][aria-label="File details"]').count()) === 0,
  );
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll graph keyboard and mobile checks passed.");
