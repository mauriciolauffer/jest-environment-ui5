/**
 * @jest-environment ui5
 * @jest-environment-options { "path": "https://ui5.sap.com/1.84/test-resources/sap/m/demokit/orderbrowser/webapp/test/mockServer.html", "timeout": 200 }
 */

describe("Load test from URL with UI5 v1.84", () => {
  it("ui5 is loaded", () => {
    expect(window.sap).toBeTruthy();
    expect(sap).toBeTruthy();
    expect(sap.ui.getCore()).toBeTruthy();
    expect(sap.ui.version).toContain("1.84");
    expect(sap.ui.getCore().ready).toBeFalsy();
  });
});
