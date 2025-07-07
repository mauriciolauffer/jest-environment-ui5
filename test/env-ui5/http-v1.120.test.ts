/**
 * @jest-environment ui5
 * @jest-environment-options { "path": "https://ui5.sap.com/1.120/test-resources/sap/m/demokit/orderbrowser/webapp/test/mockServer.html", "timeout": 200 }
 */

describe("Load test from URL with UI5 v1.120", () => {
  it("ui5 is loaded", () => {
    expect(window.sap).toBeTruthy();
    expect(sap).toBeTruthy();
    expect(sap.ui.getCore()).toBeTruthy();
    expect(sap.ui.version).toContain("1.120");
    expect(sap.ui.getCore().ready).toBeTruthy();
  });
});
