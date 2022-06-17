# S3TemplateEngine
S3TemplateEngine is a lightweight template engine for AWS serverless computing, helping you create AWS S3 / AWS Cloudfront hosted websites. It optionally integrates Webiny.

## Motivation
AWS S3 and AWS Cloudfront offer a great platform to publish websites and web apps at a low cost. However, you need to create static HTML files elsewhere, and getting everything up and running can be a pain without a decent CMS.

**This project is for you, if** you want to manually create HTML and benefit from low-cost serverless computing but still want to:
 * Reuse code snippets (like header or navigation)
* Use a CMS for updating your content
* Automatically create pages dynamically (like an individual page for each article you put in a system, rather than an SEO unfriendly AJAX load of content on a generic page)
* Have a pipeline that optimizes/minifies your code output

## Concept
S3TemplateEngine uses serverless technologies (S3, Lambda, DynamoDB, Cloudformation) to provide a straightforward but powerful template language. 

All you have to do is follow the installation paragraph, and you can write your HTML-based templates, put them into a specific S3 bucket and see the magic happen.

## Installation
 * Create an S3 bucket and upload the content of the folder "s3" (multiple zip files) into it
   * ...
 * Connect your domain in AWS Route53 and create an SSL certificate with the AWS Certificate Manager.
   * ...
 * Execute the "S3TemaplateEngine.json" in CLoudFormation
   * Download the github repository. 
   * Cretae an AWS account or sign in into an existing one
   * In the AWS console, make sure you are on target region (**S3TemplateEngine is currently only working within a single region**)
   * go to "CloudFormation"
     * Click on "Create Stack"
     * Select "Template is ready" and "Upload a template file"
     * Click on "choose file" and select "S3TemaplateEngine.json"
     * Click on "Next"
     * Fill out Stakc Name and Parameters
     * Click "Next"
     * Check "I acknowledge that AWS CloudFormation might create IAM resources with custom names."
     * Click "Create Stack"
 * Delete the S3 bucket you created in the first step step

## Useage
Just put your template (usual website files, html with the additional commands shown below) in the "prod-website-code-<your page name>". The system will behave as follows:

**Content from the following folders will be synced (copied or deleted) to the output S3 bucket:**
 * files/ (usually used for downloads like pdfs)
 * gfx/ (usually used for visuals used on the website and css files)
 * js/ (used for javascript files) 

**Content from the following folders will be processed with the commands shown below:**
 * website/ (will be the root of the output folder)
   * The following files are madatory:
     * index.html (your main page)
     * 404.html (your error page)
 * part/   

**Other folders and files int the root will be ignored**


