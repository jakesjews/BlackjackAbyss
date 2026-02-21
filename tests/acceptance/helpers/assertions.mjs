import { expect } from "vitest";

export function expectMethodContract(actualMethods, requiredMethods, label) {
  expect(Array.isArray(actualMethods), `${label} methods should be enumerable`).toBe(true);
  for (const method of requiredMethods) {
    expect(actualMethods.includes(method), `${label} missing ${method}`).toBe(true);
  }
}

export function expectNoRuntimeErrors(session) {
  const consoleErrors = Array.isArray(session?.consoleErrors) ? session.consoleErrors : [];
  const pageErrors = Array.isArray(session?.pageErrors) ? session.pageErrors : [];
  expect(consoleErrors, `Console errors detected:\n${consoleErrors.join("\n")}`).toEqual([]);
  expect(pageErrors, `Page errors detected:\n${pageErrors.join("\n")}`).toEqual([]);
}

export function expectModeIn(mode, expectedModes, label = "mode") {
  expect(expectedModes.includes(mode), `${label} expected one of ${expectedModes.join(", ")}, got ${String(mode)}`).toBe(true);
}

export function expectTruthySnapshot(snapshot, label) {
  expect(snapshot, `${label} snapshot should be populated`).toBeTruthy();
}
