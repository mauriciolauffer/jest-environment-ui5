/**
 * @jest-environment ui5
 * @jest-environment-options { "path": "https://ui5.sap.com/test-resources/sap/m/demokit/orderbrowser/webapp/test/mockServer.html", "timeout": 200 }
 */

describe("Load test from URL", () => {
  it.skip("ui5 env is defined", () => {
    const environmentOptions = globalThis?.environment?.options;
    const ui5Options = {
      ui5: {
        path: "https://ui5.sap.com/test-resources/sap/m/demokit/orderbrowser/webapp/test/mockServer.html",
      },
    };
    expect(expect.getState().environment).toBe("ui5");
    expect(environmentOptions).toMatchObject(ui5Options);
  });

  it("jsdom is initiated", () => {
    expect(window).toBeTruthy();
    expect(document).toBeTruthy();
  });

  it("ui5 is loaded", () => {
    expect(window.sap).toBeTruthy();
    expect(sap).toBeTruthy();
    expect(sap.ui.getCore()).toBeTruthy();
    expect(sap.ui.version).toBeTruthy();
    expect(sap.ui.getCore().ready).toBeTruthy();
  });
});
