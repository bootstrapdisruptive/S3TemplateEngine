/**
 * @jest-environment jsdom
 */

/**
 * * =========== Libraries ===========
 */
const { axe, toHaveNoViolations } = require('jest-axe');
expect.extend(toHaveNoViolations);
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
* * ========= Configuration =========
*/
/**
 * @constant
 * @name sBaseFile
 * @description Base file / HTML page you want to test, relative sBasePath folder
 * Absolute path to the source file that's the base of S3TE Render Helper file with "/" (not "\")
 * @default
 * @global
 * @type {string}
 */

const sBaseFile = 'index.html';

/**
 * @constant
 * @name sBaseFile
 * @description Location of your local 'part/' folder - usually 'website/' or 'app/'
 * @default
 * @global
 * @type {string}
 */
const sBasePath = 'app/';

/**
* * =========== Constants ===========
*/

/**
 * @constant
 * @name sScriptPath
 * @description Path with "/" (not "\") to the S3TE Render Helper file
 * @default
 * @global
 * @type {string}
 */
const sScriptPath = path.join(__dirname, 'S3TE', 'S3TErenderHelper.test.mjs').replace(/\\/g, '/');

/**
 * @constant
 * @name sConfigPath
 * @description Path with "/" (not "\") to the S3TE Render Helper Config file
 * @default
 * @global
 * @type {string}
 */
const sConfigPath = path.join(__dirname, 'S3TE', 'jest.helper.config.js').replace(/\\/g, '/');

/**
 * @constant
 * @name sHandoverFile
 * @description Path with "/" (not "\") to the temporary file S3TE Render Helper uses to hand over data
 * @default
 * @global
 * @type {string}
 */
const sHandoverFile = path.join(__dirname, 'S3TE', 'S3TE-test-output.txt').replace(/\\/g, '/');

/**
* * ============ Globals ============
*/

/**
* @name sHTML
* @description This the variable for the string that's returend by the S3TE redner process (usually html)
* @global
* @type {string}
*/
let sHTML;

/**
* * ===== One Time Preparation ======
*/
beforeAll(async () => {
try { fs.unlinkSync(sHandoverFile); } catch (e) {} // Delete the handover file before the execution of the S3TE script if it exists
const { stdout, stderr } = await execPromise(
  `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config=${sConfigPath} ${sScriptPath}`,
  { env: { ...process.env, BASE_FILE: sBaseFile, BASE_PATH: sBasePath, HANDOVER_FILE: sHandoverFile } }
); // Execute a seperate test engine (in our case in node environment, not JS DOM) that gets the input with environment variabels and populates a new handover file

if (!fs.existsSync(sHandoverFile)) {
  throw new Error('Die Ausgabedatei wurde nicht gefunden.');
} // Check, if Handover file was written

sHTML = fs.readFileSync(sHandoverFile, 'utf8'); // Read file content into global

return;
}, 20000);


/**
* * ===== Tests ======
*/
describe('Tests of HTML Code', () => {
/**
 * Accessibility Check on String (rendered HTML from S3TE)
 */
test('jsdom Test: Verwendet Ergebnis aus Node Test', async () => {
  expect(await axe(sHTML)).toHaveNoViolations();
});
});
