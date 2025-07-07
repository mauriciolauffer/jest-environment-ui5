/**
 * @ jest-environment ui5
 * @jest-environment-options { "path": "http://localhost:8080/test/test-ui5-local.html", "timeout": 10 }
 */

// import { expect, describe, it } from "jest";

describe.skip("Load test from URL", () => {
  it("ui5 env is defined", () => {
    expect(expect.getState().environment).toBe("ui5");
    expect(globalThis?.environment?.options).toMatchObject({
      ui5: { path: "http://localhost:8080/test/test-ui5-local.html" },
    });
  });

  it("jsdom is initiated", () => {
    expect(window).toBeTruthy();
    expect(document).toBeTruthy();
  });

  it("ui5 is loaded", () => {
    expect(window.sap).toBeTruthy();
    expect(sap).toBeTruthy();
    expect(sap.ui.getCore()).toBeTruthy();
    expect(sap.ui.getVersionInfo()).toBeTruthy();
  });
});
