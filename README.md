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
 * Execute the "S3TemaplateEngine." in CLoudFormation
   * Download the github repository. 
   * Cretae an AWS account or sign in into an existing one
   * In the AWS console, make sure you are on target region (**S3TemplateEngine is currently only working within a single region**)
   * go to "CloudFormation"
     * Click on "Create Stack"
     * Select "Template is ready" and "Upload a template file"
     * Click on "choose file" and select "S3TemaplateEngine."
     * ...

## Useage
