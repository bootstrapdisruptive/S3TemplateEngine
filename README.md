# S3TemplateEngine
S3TemplateEngine is a lightweight template engine for AWS serverless computing, helping you create AWS S3 / AWS Cloudfront hosted websites. It optionally integrates Webiny.

## Table of Contents
1. [Motivation](#Motivation)
2. [Concept](#Concept)
3. [Installation](#Installation)
4. [Useage](#Useage)
5. [Commands](#Commands)
6. [Optional: Webiny extension](#Webiny)
  a. [Concept of Webiny extension](#ConceptWebiny)
  b. [Installation of optional Webiny extension](#InstallationWebiny)
  c. [Commands of optional Webiny extension](#CommandsWebiny)

## Motivation<a name="Motivation"></a>
AWS S3 and AWS Cloudfront offer a great platform to publish websites and web apps at a low cost. However, you need to create static HTML files elsewhere, and getting everything up and running can be a pain without a decent CMS.

**This project is for you, if** you want to manually create HTML and benefit from low-cost serverless computing but still want to:
 * Reuse code snippets (like header or navigation)
* Use a CMS for updating your content
* Automatically create pages dynamically (like an individual page for each article you put in a system, rather than an SEO unfriendly AJAX load of content on a generic page)
* Have a pipeline that optimizes/minifies your code output

## Concept<a name="Concept"></a>
S3TemplateEngine uses serverless technologies (S3, Lambda, DynamoDB, Cloudformation) to provide a straightforward but powerful template language. 

All you have to do is follow the installation paragraph, and you can write your HTML-based templates, put them into a specific S3 bucket and see the magic happen.

## Installation<a name="Installation"></a>
<details>
  <summary>Download the github repository.</summary>
  
   * ...
</details>
<details>
  <summary>Create an S3 bucket and upload the content of the folder "s3" (multiple zip files) into it.</summary>
  
   * ...
</details>
<details>
  <summary>Connect your domain in AWS Route53 and create an SSL certificate with the AWS Certificate Manager.</summary>
  
   * ...
</details>
<details>
  <summary>Execute the "S3TemaplateEngine.json" in CloudFormation.</summary>

   * Cretae an AWS account or sign in into an existing one
   * In the AWS console, make sure you are on target region (**S3TemplateEngine is currently only working within a single region**)
   * go to "CloudFormation"
     * Click on "Create Stack"
     * Select "Template is ready" and "Upload a template file"
     * Click on "choose file" and select "S3TemaplateEngine.json"
     * Click on "Next"
     * Fill out Stack Name and Parameters
     * Click "Next"
     * Check "I acknowledge that AWS CloudFormation might create IAM resources with custom names."
     * Click "Create Stack"
</details>
<details>
  <summary>Connect your Route53 domain to the CloundFront that was created.</summary>
  
   * In the AWS console, open Route53
   * Navigate to your hosted zone
   * Generate record "empty" "A"
     * Click on "Create record"
     * leave the box before your doamin name empty
     * choose "A" as record type 
     * Check "Alias" and choose "Alias to CloudFront distribution"
     * Choose the distribution that was created earlier (by CloudFormation)
   * Click "Add another record" and repeat the same for "empty" "AAAA"
   * Click "Add another record" and repeat the same for "www" "A"
   * Click "Add another record" and repeat the same for "www" "AAAA"
   * Click on Create records
</details>
<details>
  <summary>Delete the S3 bucket you created in the second step.</summary>
  
   * ...
</details>

## Useage<a name="Useage"></a>
Just put your template (usual website files, html with the additional commands shown below) in the "prod-website-code-\<your page name\>" s3 bucket. The system will behave as follows:

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

## Commands<a name="Commands"></a>
Inside the files you put into "website/" and "part/", you can use the following tags:
<details>
  <summary> &lt;part&gt; - Reusing code from other files</summary>
 
### Action
Replaces the command with the content from another file. This is handy, if you want to reuse HTML headers or navigation.
### Syntax
```html
<part>*name*</part>
```
Whereas *name* is a filename or path/filename inside the "part/" directory.
### Example
```html
    <head>
        <part>head.part</part>
    </head>
```
</details>

## Optional: Webiny integration<a name="Webiny"></a>

### Concept of Webiny extension<a name="ConceptWebiny"></a>
...

### Installation of optional Webiny extension<a name="InstallationWebiny"></a>
...

### Commands of optional Webiny extension<a name="CommandsWebiny"></a>
Inside the files you put into "website/" and "part/", you can use the following tags:
<details>
  <summary> &lt;dbpart&gt; - Inserting code or content maintained in Webiny</summary>
 
### Action
Replaces the command with the content from an Webiny maintained element. This is handy, if you want to give an editor access to static elements like a privacy statement or a tracking tag.
### Syntax
```html
<dbpart>*name*</dbpart>
```
Whereas *name* is the "content_id" of a Webiny "Static Contents" or "Static Code Contents" element.
### Example
```html
    <body>
        <dbpart>impressum</dbpart>
    </body>
```
</details>
<details>
  <summary> &lt;dbmulti&gt; - Inserting multiple Webiny items in one file</summary>
 
### Action
Replaces the command with a defined HTML template multiple times. Exactly once for each entry in the published Webiny content, matching the filter criteria. Handy for cretaing an overview page of articles.
### Syntax
```html
<dbmulti>*json*</dbmulti>
```
Whereas *json* is a json object with the following attributes:
```json
{
  "table":"Name Of Dynamo DB table",
  "filter":[
    {"AttributeName":{"DynamoDBType":"AttributeContent"}},
    ...
  ],
  "template":"an HTML template, that will probably contain <dbitem> elements"
}
```
### Example
```html
<dbmulti>{"table":"PROD_Articles","filter":[{"forWebsite":{"BOOL":true}}],"template":"<a href='artikeldetail-<dbitem>id</dbitem>.html'><h2><dbitem>headline</dbitem></h2><div class='content'><dbitem>readingtime</dbitem>&nbsp;min</div></a>"}</dbmulti>
```
</details>
  <summary> &lt;dbmultifile&gt; - Create a file for each Webiny item matching a filter</summary>

### Action
Creates multiple files out of one template file, by using one unqiue database attribute as suffix to the created filenames. Handy for generating individual pages for articles.
### Syntax
Must be first line of the tmeplate frile (even before \<!Doctype html\>)
```html
<dbmultifile>*json*</dbmultifile>
```
Whereas *json* is a json object with the following attributes:
```json
{
  "table":"Name Of Dynamo DB table",
  "filenamesuffix":"Dynamo DB field (muust be unique)",
  "filter":[
    {"AttributeName":{"DynamoDBType":"AttributeContent"}},
    ...
  ]
}
```
Whereas *fieldname* is the name of an attribute (column) from the DynamoDB.
### Example
```html
<dbmultifile>{"table":"PROD_Articles","filenamesuffix":"id","filter":[{"forWebsite":{"BOOL":true}}]}</dbmultifile>
```
</details>
<details>
  <summary> &lt;dbitem&gt; - Inserts Webiny items values (used inside a dbmulti or dbmultifile loop)</summary>
 
### Action
Inside a \<dbmulti\>-command or \<dbmultifile\>-command: Replaces the \<dbitem\>-command with the content of a Webiny field of the current element.
### Syntax
```html
<dbitem>*fieldname*</dbitem>
```
Whereas *fieldname* is the name of an attribute (column) from the DynamoDB.
### Example
```html
<dbitem>headline</dbitem>
```
</details>
<details>
<details>
  <summary> &lt;fileattribute&gt; - Inserts Webiny items values, based on dbmultifile loop created files</summary>
 
### Action
Inside a \<dbmultifile\>-command: Replaces the \<fileattribute\>-command with the current filename. Handy for generation of canonical tags.
### Syntax
```html
<fileattribute>filename</fileattribute>
```
Currently filename is the only command available.
### Example
```html
<fileattribute>filename</fileattribute>
```
</details>
