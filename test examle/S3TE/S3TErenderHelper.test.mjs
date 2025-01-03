/**
 * @jest-environment node
 */

/**
 * * =========== Libraries ===========
 */
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand, DeleteItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

import fs from 'fs';
import { PassThrough } from 'stream';

/**
 * * =========== Constants ===========
*/
  /**
   * @constant
   * @name sBaseFile
   * @description Base file / HTML page you want to test, relative sBaseFile folder
   * @default
   * @global
   * @type {string}
   */
  //const sBaseFile = process.env.BASE_FILE;
  const sBaseFile = process.env.BASE_FILE || 'index.html';

  /**
   * @constant
   * @name sBaseFile
   * @description Location of your local 'part/' folder - usually 'website/' or 'app/'
   * @default
   * @global
   * @type {string}
   */
//  const sBasePath = process.env.BASE_PATH;
  const sBasePath = process.env.BASE_PATH || 'app/';

  /**
   * @constant
   * @name sHandoverFile
   * @description Path with "/" (not "\") to the temporary file S3TE Render Helper uses to hand over data
   * @default
   * @global
   * @type {string}
   */
// const sHandoverFile = process.env.HANDOVER_FILE;
  const sHandoverFile = process.env.HANDOVER_FILE || 'd:/git/projectdoc/offline/test/S3TE/S3TE-test-output.txt';

  /**
   * @constant
   * @name sUrlOfLambda
   * @description Path to the ESM Lambda file
   * @default
   * @global
   * @type {string}
   */
  const sUrlOfLambda = './HOK_render_html_files/index.mjs';

/**
 * * ======= Helper Functions ========
 */  

/**
 * @description Function that calls the S3TE renderer to simulate the HTML that will be created on the live system
 * @returns Generated HTML
 */
async function generateHTML() {
  let handler;

  // Prepare Env
    process.env.AWS_REGION = 'eu-west-1';
    process.env.env = 'DEV';
    process.env.html_part_element_table = 'fakeTable';
    process.env.config = JSON.stringify({ "website":[ { "en":{ "bucket":"prod-website-fake", "baseurl":"fake.com" } } ] });    
  // Import unprocessed html    
    const mod = await import(sUrlOfLambda);
    handler = mod.handler;
  // Mock an AWS S3 call
    const s3Mock = mockClient(S3Client);
    s3Mock.reset(); 
    const oFakeEvent = {
      "Records": [
          {
              "eventSource": "aws:s3",
              "eventName": "ObjectCreated:Put",
              "s3": {
                  "bucket": {
                      "name": "prod-website-code-fake",
                  },
                  "object": {
                      "key": sBaseFile,
                  }
              }
          }
      ]
    };

  // Prepare S3 Answers
  s3Mock.on(GetObjectCommand).callsFake((input) => {
    const fileContent = fs.readFileSync(sBasePath+input.Key, 'utf8');

    // 2) Create a PassThrough stream and write the file content
    const pass = new PassThrough();
    pass.end(fileContent);
    return {
      ContentType: 'text/html',
      Body: pass,
    };   
  });

  s3Mock.on(PutObjectCommand).resolves({});  

  // Mock an AWS DDB call
    const ddbMock = mockClient(DynamoDBClient);
    ddbMock.reset();
    ddbMock.on(PutItemCommand).resolves({ Items: [] });
    ddbMock.on(DeleteItemCommand).resolves({ Items: [] });  
    ddbMock.on(QueryCommand).resolves({ Items: [] });    
    ddbMock.on(ScanCommand).resolves({ Items: [] });

  await handler(oFakeEvent);  

  // After it finishes, see what was Put to S3:
  const putCalls = s3Mock.commandCalls(PutObjectCommand);
  if (putCalls.length === 0) {
    return '';
  }

  // Suppose the last PutObject is the final HTML
  const lastPutCall = putCalls[putCalls.length - 1];
  const sFinalHTML = lastPutCall.args[0].input.Body; // the 'Body' that was uploaded

  return sFinalHTML; 
}

/**
 * * ============= Tests ============= 
 */
test('Render HTML with S3TE', async () => {

  // Generate HTML and write in handover file
  const sFinalHTML = await generateHTML();
  fs.writeFileSync(sHandoverFile, sFinalHTML, 'utf8');

  // Simple Test to confirm execution
  expect(1).toBe(1);
});
