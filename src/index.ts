import type { DOMWindow, FileOptions } from "jsdom";
import type {
  EnvironmentContext,
  JestEnvironmentConfig,
} from "@jest/environment";
import type { Global } from "@jest/types";
import type { UI5Options } from "../types/globals.js";
import { setTimeout } from "node:timers/promises";
import { installCommonGlobals } from "jest-util";
import { JSDOM } from "jsdom";
import { TestEnvironment } from "jest-environment-jsdom";

// The `Window` interface does not have an `Error.stackTraceLimit` property, but `JSDOMEnvironment` assumes it is there.
type Win = Window &
  Global.Global & {
    Error: {
      stackTraceLimit: number;
    };
  };

const UI5_BOOTSTRAP_ID = "sap-ui-bootstrap"; // UI5 script tag ID
let UI5_TIMEOUT = 100; // UI5 load timeout in ms

/**
 * Await for next tick
 */
function waitNextTick(): Promise<void> {
  return setTimeout(25);
}

/**
 * Catch jsdom window errors
 */
function catchWindowErrors(window: DOMWindow): () => void {
  let userErrorListenerCount = 0;
  /**
   * Throw UnhandlerError for window error events
   */
  function throwUnhandlerError(e: ErrorEvent) {
    if (userErrorListenerCount === 0 && e.error != null) {
      process.emit("uncaughtException", e.error);
    }
  }
  const addEventListener = window.addEventListener.bind(window);
  const removeEventListener = window.removeEventListener.bind(window);
  window.addEventListener("error", throwUnhandlerError);
  window.addEventListener = function (
    ...args: Parameters<typeof addEventListener>
  ) {
    if (args[0] === "error") {
      userErrorListenerCount++;
    }
    return addEventListener.apply(this, args);
  };
  window.removeEventListener = function (
    ...args: Parameters<typeof removeEventListener>
  ) {
    if (args[0] === "error" && userErrorListenerCount) {
      userErrorListenerCount--;
    }
    return removeEventListener.apply(this, args);
  };
  return function clearErrorHandlers() {
    window.removeEventListener("error", throwUnhandlerError);
  };
}

/**
 * Get jsdom configuration to build JSDOM from HTML file containing UI5 bootstrap configuration
 */
function getConfiguration(): FileOptions {
  return {
    resources: "usable",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse: (jsdomWindow) => {
      // @ts-expect-error: Add performance.timing for old UI5 versions
      jsdomWindow.performance.timing = {
        fetchStart: Date.now(),
        navigationStart: Date.now(),
      };

      /* userAgent: window.navigator.userAgent,
			userAgentData: window.navigator.userAgentData,
			platform: window.navigator.platform */

      // Patch window.matchMedia because it doesn't exist in JSDOM
      Object.defineProperty(jsdomWindow, "matchMedia", {
        writable: true,
        configurable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      });
    },
  };
}

/**
 * Build JSDOM from a local HTML file
 */
function buildFromFile(ui5: UI5Options): Promise<JSDOM> {
  const options: FileOptions = {
    ...getConfiguration(),
    referrer: "https://ui5.sap.com/",
  };
  return JSDOM.fromFile(ui5.path, options);
}

/**
 * Build JSDOM from an URL
 */
function buildFromUrl(ui5: UI5Options): Promise<JSDOM> {
  return JSDOM.fromURL(ui5.path, getConfiguration());
}

/**
 * Add load and error events to UI5 bootstrap script tag to handle its status
 */
function ui5BootstrapListener(window: DOMWindow): Promise<void> {
  return new Promise((resolve, reject) => {
    const ui5Script = window.document.getElementById(UI5_BOOTSTRAP_ID);
    if (ui5Script) {
      ui5Script.addEventListener("load", () => {
        resolve();
      });
      ui5Script.addEventListener("error", () => {
        reject(new Error(`Error loading ${UI5_BOOTSTRAP_ID}!`));
      });
    } else {
      reject(new Error(`Script tag ${UI5_BOOTSTRAP_ID} not found!`));
    }
  });
}

/**
 * Add load and error events to UI5 bootstrap script tag to handle its status
 */
async function ui5CoreLibraryListener(
  window: DOMWindow,
  startTime: number,
): Promise<void> {
  await waitNextTick();
  return new Promise((resolve, reject) => {
    const elapsedTime = performance.now() - startTime;
    if (elapsedTime > UI5_TIMEOUT) {
      reject(new Error(`UI5 load timeout: ${UI5_TIMEOUT}ms!`));
    } else if (window.sap?.ui?.getCore?.()) {
      resolve();
    } else {
      ui5CoreLibraryListener(window, startTime).then(resolve).catch(reject);
    }
  });
}

/**
 * Await UI5 to be loaded: onInit event
 */
function ui5Ready(window: DOMWindow): Promise<void> {
  return new Promise((resolve, reject) => {
    const core = window?.sap.ui.getCore();
    if (core) {
      core.ready ? core.ready(resolve) : core.attachInit(resolve); // eslint-disable-line @typescript-eslint/no-unused-expressions
    } else {
      reject(new Error("UI5 core not loaded!"));
    }
  });
}

/**
 * Returns whether the path is a valid URL or not
 */
function isValidUrl(path: string): boolean {
  try {
    return !!new URL(path);
  } catch (err: unknown | Error) {
    // eslint-disable-next-line no-console
    console.error("Invalid URL:", path, ". Error:", (err as Error)?.message);
    return false;
  }
}

export default class UI5Environment extends TestEnvironment {
  private projectConfig: JestEnvironmentConfig["projectConfig"];
  private ui5Options: UI5Options;
  private clearWindowErrors?: () => void;

  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context);
    this.projectConfig = config.projectConfig;
    this.ui5Options = config.projectConfig.testEnvironmentOptions as UI5Options;
    UI5_TIMEOUT = this.ui5Options?.timeout ?? UI5_TIMEOUT;
  }

  async setup() {
    await super.setup();
    const isUrl = isValidUrl(this.ui5Options?.path);
    try {
      if (!this.ui5Options?.path) {
        throw new Error(
          "The path to the HTML file/page containing the UI5 bootstrap setup must be set!",
        );
      }
      this.dom = isUrl
        ? await buildFromUrl(this.ui5Options)
        : await buildFromFile(this.ui5Options);
      this.setGlobals();
      this.clearWindowErrors = catchWindowErrors(this.dom.window);
      await ui5BootstrapListener(this.dom.window);
      await ui5CoreLibraryListener(this.dom.window, performance.now());
      await ui5Ready(this.dom.window);
    } catch (err) {
      console.error(err); // eslint-disable-line no-console
      throw new Error("Starting JSDOM for UI5 has failed", { cause: err });
    }
    const hrefFile = this.dom.window.location.href;
    if (!isUrl) {
      // Workaround to avoid > SecurityError: localStorage is not available for opaque origins
      this.dom.reconfigure({ url: "http://localhost/" });
    }
    if (!isUrl) {
      // Comeback to original settings
      this.dom.reconfigure({ url: hrefFile });
    }
  }

  async teardown(): Promise<void> {
    this.clearWindowErrors?.();
    this.dom?.window.close();
    await super.teardown();
  }

  setGlobals() {
    const global = (this.global = this?.dom?.window as unknown as Win);
    if (global == null) {
      throw new Error("JSDOM did not return a Window object");
    }
    // @ts-expect-error: ype 'Win' is not assignable to type 'typeof globalThis'.
    global.global = global;
    this.global.Error.stackTraceLimit = 100;
    // @ts-expect-error: Argument of type 'Win' is not assignable to parameter of type 'typeof globalThis'.
    installCommonGlobals(global, this.projectConfig.globals);
    global.Buffer = Buffer;
  }
}
