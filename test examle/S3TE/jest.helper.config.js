// jest.helper.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    "**/?(*.)+(spec|test).mjs",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
  ],
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "mjs"],
};