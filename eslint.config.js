import config from "eslint-config-mlauffer-nodejs";
import tseslint from "typescript-eslint";
import jest from "eslint-plugin-jest";

export default tseslint.config(
  {
    ignores: ["dist/", "test/env-ui5/", "**/coverage/"],
  },
  {
    extends: [config, tseslint.configs.strict],
    rules: {
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
    },
  },
  {
    files: ["test/**"],
    extends: [jest.configs["flat/recommended"]],
  },
);
