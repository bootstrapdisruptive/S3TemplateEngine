# S3TemplateEngine
S3TemplateEngine is a lightweight template engine for AWS serverless computing, helping you create AWS S3 / AWS Cloudfront hosted websites. It optionally integrates Webiny.

## Table of Contents
1. [Motivation](#Motivation)
2. [Concept](#Concept)
3. [Support](#Support)
4. [Known non-intuitive behaviour](#Known-non-intuitive-behaviour)
5. [Installation](#Installation)
6. [Useage](#Useage)
7. [Commands](#Commands)
8. [Optional - Multi language pages](#Optional---Multi-language-pages)
    1. [Concept of multi language pages](#Concept-of-multi-language-pages)
    2. [Set-Up op multi language pages](#Set-Up-of-multi-language-pages)
    3. [Commands of multi language pages](#Commands-of-multi-language-pages)
9. [Optional - Webiny integration](#Optional---Webiny-integration)
    1. [Concept of optional Webiny extension](#Concept-of-optional-Webiny-extension)
    2. [Installation of optional Webiny extension](#Installation-of-optional-Webiny-extension)
    3. [Commands of optional Webiny extension](#Commands-of-optional-Webiny-extension)
10. [Optional - Webiny multi language pages](#Optional---Webiny-multi-language-pages)
    1. [Concept of Webiny multi language pages](#Concept-of-Webiny-multi-language-pages)
    2. [Using multi language in Webiny](#Using-multi-language-in-Webiny)

## Motivation
AWS S3 and AWS Cloudfront offer a great platform to publish websites and web apps at a low cost. However, you need to create static HTML files elsewhere, and getting everything up and running can be a pain without a decent CMS.

**This project is for you, if** you want to manually create HTML and benefit from low-cost serverless computing but still want to:
 * Reuse code snippets (like header or navigation)
 * Use a CMS for updating your content
 * Automatically create pages dynamically (like an individual page for each article you put in a system, rather than an SEO unfriendly AJAX load of content on a generic page)
 * Have a pipeline that optimizes/minifies your code output

## Support
If you want to support this project by buying me a tea (I'm not into coffee ;-) ), feel free: https://ko-fi.com/hokcomics
[![61e11d430afb112ea33c3aa5_Button-1](https://user-images.githubusercontent.com/100029932/174646264-edec5c8c-420b-4e54-88a7-a8dd9871ff1e.png)](https://ko-fi.com/hokcomics)

If you need support, found a bug or want to donate a pull request, feel free to contact me via github.

## Known non-intuitive behaviour
 * When you updateyour content (by changing the temnplante files or Webiny items), **your changes will not instantly appear on your website URL**. The reason for that is, that, if you set up everything as descibed below, your Domain routes to CloudFront, and CloudFront caches files. I recommend using your S3 bucket (https://<your environment (as enetred in cloudformation)>-website-<you website name (as enetred in cloudformation)>.s3.<your region, as choosen in AWS>.amazonaws.com/index.html) for preview and using the "invalidation" feature of CloudFront (https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html) once you are happy with your changes.


## Concept
S3TemplateEngine uses serverless technologies (S3, Lambda, DynamoDB, Cloudformation) to provide a straightforward but powerful template language. 

All you have to do is follow the installation paragraph, and you can write your HTML-based templates, put them into a specific S3 bucket and see the magic happen.

![Architecture](https://user-images.githubusercontent.com/100029932/174443152-b16c98fc-f2f2-420e-9f5b-a6ea7a861acd.png)

## Installation
<details>
  <summary>Download the github repository.</summary>

Use your preferred way to pull the project, or (if you are not that experienced with git), do it manually:

   * Go to the project github page ( https://github.com/HOKComics/S3TemplateEngine )

   * Right Click on "S3TemplateEngine.json" and choose "save link as"
   * Download the file ( __Hint: this file is refered as "*S3TemaplateEngine.json*" later on__ )
   
   * Click on "S3"   
   * Right Click on the file inside and choose "save link as"
   * Download the file ( __Hint: this file is refered as "* files inside the s3 folder*" later on__ )

</details>
<details>
  <summary>Create an S3 bucket and upload the content of the folder "s3" (multiple zip files) into it.</summary>
  
   * Navigate to your S3 console. At the time this document was created, the link is https://s3.console.aws.amazon.com/s3/buckets 
   * Choose your region in the top right of the window.
   * Click on "Create bucket"
   * Enter a name for your bucket, like "mywebsite-temp" ( __Hint: this name is refered as "*S3LambdaBucket*" later on__ )
   * Click on "Create bucket"
   * Click on the "*S3LambdaBucket*" to open it
   * Click on Upload
   * Click on "Add files" and choose the files inside the "s3" folder you downloaded from GitHub earlier ( __Hint: just the files, *NOT* the folder__ )
   * Click on Upload
  
</details>
<details>
  <summary>Connect your domain in AWS Route53 and create an SSL certificate with the AWS Certificate Manager ("www." and "" ).</summary>
  
   * This part is highly individual and not directly connected to the S3TemplateEngine project. To learn about this topic, refer to the AWS documentation ( https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring.html )
   * It must cover at least no-subdomain and www-subdomain (e. g. "mydomain.com" and "www.mydomain.com")
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
  
   * Navigate to your S3 console. At the time this document was created, the link is https://s3.console.aws.amazon.com/s3/buckets 
   * Click on the radiob utton in front of the "*S3LambdaBucket*" you created in the second step of this manual, to select it
   * Click on "Empty"
   * Write "permanently delete" in the verification tetx field and click "Empty"
   * Click on "Exit"
   * Click on "Delete"
   * Write the name of your "*S3LambdaBucket*" in the verification tetx field and click "Delete bucket"
</details>

## Useage
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

## Commands
Inside the files you put into "website/" and "part/", you can use the following tags:
<details>
  <summary> &lt;part&gt; - Reusing code from other files</summary>
 
### Action
Renders a certain code only, if a condition is met. Currently the only available condition is the environment. This is handy, if you want to have different "robots" meta tags for your produciton environment, than for dev and stage.
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
<details>
  <summary> &lt;if&gt; - Only render code, if you are in a certain environment</summary>

### Action
Replaces the command with the content from another file. This is handy, if you want to reuse HTML headers or navigation.
### Syntax
```html
<part>*json*</part>
```
Whereas *json* is a is a json object with the following attributes:
```json
{
  "env": "match the current environment dev|stage|prod",
  "file": "match the rendered filename e.g. index.html",
  "not": true|false - if true invert result of other machtes,
  "template": "an HTML template, that will either appear or not appear"
}
```
Whereas *env*, *file* and *not* are optional (but the whole command only makes sense, if you use at least one of them).
### Example
```html
    <if>{
        "env": "dev",
        "template": "<meta name='robots' content='noindex'><meta name='googlebot' content='noindex'>"
      }</if>
    <if>{
        "env": "stage",
        "template": "<meta name='robots' content='noindex'><meta name='googlebot' content='noindex'>"
      }</if>      
    <if>{
      "env": "prod",
      "template": "<meta name='robots' content='all'><meta name='googlebot' content='all'>"
    }</if>
```

</details>

<details>
  <summary> &lt;fileattribute&gt; - Inserts file attributs (also Webiny items values, based on dbmultifile loop created files)</summary>
 
### Action
Replaces the \<fileattribute\>-command with the current filename. Handy for generation of canonical tags.<br><br>Also works inside a \<dbmultifile\>-command: 
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

## Optional - Multi language pages

### Concept of multi language pages
The use of multiple languages on your page is optional. However, if you want to use them, you'll need some additional preperation steps. After that you can utilize the languag specific commands, shown below. The idea of this multi language implementation is, that you'll have a different CloudFront distribution per page. This will allow you full control, what type of URL you use:  

|  | Example 1 | Example 2 | Example 3 |
| :----------- | :------------: | :------------: | ------------: |
| EN | "mydomain.com" | "en.mydomain.com" | "mydomain.com/en" |
| DE | "mydomain.de" | "de.mydomain.com" | "mydomain.com/de" |

### Set-Up of multi language pages
<details>
  <summary>Preparation</summary>
    
   * If not already done, Install S3TemplateEngine, as described in the [Installation](#Installation) paragraph.
</details>
Do the following steps once for each additional language. The base language (eg. en) is part of the normal set-up. If yoou need two more languages (e.g. de and fr), you'll need to do the stuff next steps twice to end up with three different languages.
<details>
  <summary>Execute the "S3TemaplateEngineAdditionalLanguage.json" in CloudFormation.</summary>

   * Cretae an AWS account or sign in into an existing one
   * In the AWS console, make sure you are on target region (**S3TemplateEngine is currently only working within a single region**)
   * go to "CloudFormation"
     * Click on "Create Stack"
     * Select "Template is ready" and "Upload a template file"
     * Click on "choose file" and select "S3TemaplateEngineAdditionalLanguage.json"
     * Click on "Next"
     * Fill out Stack Name and Parameters **Be aware, that the parameters Environment and WebsiteName have to be exactly the same parameters you used when installing S3TemaplateEngine - Website URL may differ**
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
The last steps have to be executed only once, at the end of your multi language preperation:
<details>
  <summary>Tell your Lambda function 'HOK_move_file' about the buckets you created.</summary>  
    
   * In the AWS console, open Lambda
   * Find "<YourEnviornment>_HOK_move_file" and click on the linked function name to open function editing
   * Navifate to "Configuration" and "Environment variables", there click on edit
   * Edit the value of the key "destination_bucket", by adding the new language buckets to the array"   
You need to create a small JSON with your data and then enter it into the "value" field without any line breaks.
```json
["<s3 bucket name>","<s3 bucket name for new lang>",...]
```
e.g.
```json
["prod-website-myurl","prod-website-myurl-de"]
```
</details>
<details>
  <summary>Tell your Lambda function 'HOK_render_html_files' about the buckets you created.</summary>  
   * In the AWS console, open Lambda
   * Find "<YourEnviornment>_HOK_render_html_files" and click on the linked function name to open function editing
   * Navifate to "Configuration" and "Environment variables", there click on edit
   * Edit the value of the key "destination_buckets_multi_lang" as described below and click on "save"

You need to create a small JSON with your data and then enter it into the "value" field without any line breaks.
```json
{
  "languages":[
    {"<countrycode>":"<s3 bucket name>"},
    ...
  ]
}
```
e.g.
```json
{
  "languages":[
    {
      "en":
      {
        "bucket":"prod-website-myurl",
        "baseurl":"mywebsite.com"
      }
    },
    {
      "de":{
        "bucket":"prod-website-myurl-de",
        "baseurl":"mywebsite.de"
      }
    }
  ]
}
```
will become
```
{"languages":[{"en":{"bucket":"prod-website-myurl","baseurl":"mywebsite.com"}},{"de":{"bucket":"prod-website-myurl-de","baseurl":"mywebsite.de"}}]}
```
</details>

### Commands-of-multi-language-pages
Inside the files you put into "website/" and "part/", you can use the following tags:
<details>
  <summary> &lt;lang&gt; - Printing the current pages language</summary>
### Action
Renders the current language. Handy for language switchers and meta data.
### Syntax
```html
<lang>*command*</lang>
```
Whereas *command* is 2 for a 2 digit lang code (like "en", "de", "fr", ...).<br>
Whereas *command* is baseurl for printing the language specific baseurl you defined in the set-up step.
### Example
```html
<html lang="<lang>2</lang>">
<head>
  <link rel='canonical' href='https://<if>{
    "env": "dev",
    "template": "dev."
  }</if><if>{
    "env": "stage",
    "template": "stage."
  }</if><lang>baseurl</lang><if>{
    "file": "index.html",
    "not": true,
    "template": "/<fileattribute>filename</fileattribute>"
  }</if>' />
  ...
</head>
```
</details>
<details>
  <summary> &lt;switchlang&gt; - Providing different content for multiple languages</summary>
### Action
Renders language specific content (e.g. hardcoded text).
### Syntax
```html
<switchlang>
  <*lang*>*content*<*/lang*>
  ...
</switchlang>
```
Whereas *lang* is the 2 digit lang code (like "en", "de", "fr", ...), and *content* is the content for this lang code.
### Example
```html
<p>
  <switchlang>
    <de>Dein ultimatives Website Werkzeug</de>
    <en>Your ultimate website tool</en>
  </switchlang>
</p>
```
</details>

## Optional - Webiny integration

### Concept of optional Webiny extension
S3TemplateEngine supports Webiny as an editors interface. Webiny ( https://www.webiny.com/ ), an open source serverless CMS ranging from a free version up to enterprise grade, also uses serverless technologies from AWS. We integrate it without any code change in Webiny, by accessing the published items on database level. So you it goes with a vanilla installation as well as with a highly cusomized one.  

All you have to do is to follow the installation paragraph, and you can use your Webiny generated content in your HTML-based templates.

![Architecture_with_Webiny](https://user-images.githubusercontent.com/100029932/174443536-7af050de-eea7-4456-81aa-a173863b6ec9.png)

### Installation of optional Webiny extension
<details>
  <summary>Intall S3TemplateEngine.</summary>

   * Install S3TemplateEngine, as described in the [Installation](#Installation) paragraph.
</details>
<details>
  <summary>Intall Webiny.</summary>

   * Install Webiny, as described in the Webiny documentation. ( https://www.webiny.com/docs/get-started/install-webiny )
</details>
<details>
  <summary>Prepare Webiny.</summary>

   * Log in and create the models you need in the Webiny backend. The names of these models will be needed for the following steps.
   * **Hint: If you want to add or remove a model after installation, you can do so by manually editing the of the "relevant_webiny_models" environment variable of the "<ENV>_HOK_transfer_published_item" lambda function.**
   * In addition, create the following two models:
     * model name "staticCodeContent", containing
       * a text field called "contentid" with the restriction "unique"
       * a long text field "content"
         * This model will be used for specific conetent you only have one instance of, that is source code, like a tracking pixel   
         * It will be available via it's "contentid", if you want to hand these over to editors, I recommend prepareing the available contentid values as predefined value
     * model name "staticContent", containing
       * a text field called "contentid" with the restriction "unique"
       * a rich text field "content"
         * This one will be used for specific conetent you only have one instance of, like the "about us" page
         * It will be available via it's "contentid", if you want to hand these over to editors, I recommend prepareing the available contentid values as predefined value
</details>
<details>
  <summary>Download the github repository.</summary>
    If you pulled the project in the S3TemplateEngine installation: fine, else do it manually:

   * Go to the project github page ( https://github.com/HOKComics/S3TemplateEngine )

   * Right Click on "S3TemplateEngineWebiny.json" and choose "save link as"
   * Download the file ( __Hint: this file is refered as "*S3TemaplateEngineWebiny.json*" later on__ )
   
   * Click on "s3Webiny"   
   * Right Click on the file inside and choose "save link as"
   * Download the file ( __Hint: this file is refered as "* files inside the s3Webiny folder*" later on__ )

</details>
<details>
  <summary>Create an S3 bucket and upload the content of the folder "s3Webiny" (multiple zip files) into it.</summary>
  
   * Navigate to your S3 console. At the time this document was created, the link is https://s3.console.aws.amazon.com/s3/buckets 
   * Choose your region in the top right of the window.
   * Click on "Create bucket"
   * Enter a name for your bucket, like "mywebsite-temp" ( __Hint: this name is refered as "*S3LambdaBucket*" later on__ )
   * Click on "Create bucket"
   * Click on the "*S3LambdaBucket*" to open it
   * Click on Upload
   * Click on "Add files" and choose the files inside the "s3Webiny" folder you downloaded from GitHub earlier ( __Hint: just the files, *NOT* the folder__ )
   * Click on Upload
  
</details>
<details>
  <summary>Execute the "S3TemaplateEngineWebiny.json" in CloudFormation.</summary>

   * Cretae an AWS account or sign in into an existing one
   * In the AWS console, make sure you are on target region (**S3TemplateEngine is currently only working within a single region**)
   * go to "CloudFormation"
     * Click on "Create Stack"
     * Select "Template is ready" and "Upload a template file"
     * Click on "choose file" and select "S3TemaplateEngineWebiny.json"
     * Click on "Next"
     * Fill out Stack Name and Parameters **Be aware, that the parameters Environment and WebsiteName have to be exactly the same parameters you used when installing S3TemaplateEngine**
     * Click "Next"
     * Check "I acknowledge that AWS CloudFormation might create IAM resources with custom names."
     * Click "Create Stack"
</details>
<details>
  <summary>Connect the DynamoDB stream of your webiny installtion with the receiving lambda function of S3TemplateEngine.</summary>
    
   * Navigate to your DynamoDB console. At the time this document was created, the link is https://console.aws.amazon.com/dynamodbv2/home
   * Make sure you are in the correct region
   * Clik on "tables" 
   * Click on your Webiny table (usually it's named "webiny-<7 diogit code>")    
   * In “Export and Streams” -> “DynamoDB stream details” click on "Enable"
   * Choose “New and old images” and click on “Enable stream”
   * In “DynamoDB stream details” click on “Create trigger”
   * Choose “PROD_HOK_transfer_published_item” (or “DEV_HOK_transfer_published_item” or similar, depending on your enviroment). Choose a Batch size of 1 and click “Create trigger”
</details>
<details>
  <summary>Connect the DynamoDB stream of your content mirror tables with the receiving lambda function of S3TemplateEngine.</summary>
    
   * Navigate to your DynamoDB console. At the time this document was created, the link is https://console.aws.amazon.com/dynamodbv2/home
   * Make sure you are in the correct region
   * Clik on "tables" 
   * Click on your Webiny table (usually it's named "<environment>_PROD_WebsiteContentFromWebiny_<your page name>")
   * In “DynamoDB stream details” click on “Create trigger”
   * Choose “PROD_HOK_render_html_files” (or “DEV_HOK_render_html_files” or similar, depending on your enviroment). Choose a Batch size of 1 and click “Create trigger”

</details>      
<details>
  <summary>Delete the S3 bucket you created in the second step.</summary>
  
   * Navigate to your S3 console. At the time this document was created, the link is https://s3.console.aws.amazon.com/s3/buckets 
   * Click on the radiob utton in front of the "*S3LambdaBucket*" you created in the second step of this manual, to select it
   * Click on "Empty"
   * Write "permanently delete" in the verification tetx field and click "Empty"
   * Click on "Exit"
   * Click on "Delete"
   * Write the name of your "*S3LambdaBucket*" in the verification tetx field and click "Delete bucket"
</details>

### Commands of optional Webiny extension
Inside the files you put into "website/" and "part/", you can use the following tags:
<details>
  <summary> &lt;dbpart&gt; - Inserting code or content maintained in Webiny</summary>
 
### Action
Replaces the command with the content from an Webiny maintained element. This is handy, if you want to give an editor access to static elements like a privacy statement or a tracking tag.
### Syntax
```html
<dbpart>*name*</dbpart>
```
Whereas *name* is the "contentid" of a Webiny "Static Contents" or "Static Code Contents" element.
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
  "filter":[
    {"AttributeName":{"DynamoDBType":"AttributeContent"}},
    ...
  ],
  "template":"an HTML template, that will probably contain <dbitem> elements"
}
```
__Hint:__ You can sort entries by adding a number field named "order" to your Webiny model. After that edit your entries: smaller numbers come first, stuff with empty "order" fields are rendered at the end.

### Example
```html
<dbmulti>{
    "filter":[{"forWebsite":{"BOOL":true}}],
    "template":"<a href='artikeldetail-<dbitem>id</dbitem>.html'><h2><dbitem>headline</dbitem></h2><div class='content'><dbitem>readingtime</dbitem>&nbsp;min</div></a>"
}</dbmulti>
```
</details>
<details>
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
  "filenamesuffix":"Dynamo DB field (muust be unique)",
  "filter":[
    {"AttributeName":{"DynamoDBType":"AttributeContent"}},
    ...
  ]
}
```
Whereas *fieldname* is the name of an attribute (column) from the DynamoDB

### Example
```html
<dbmultifile>{
    "filenamesuffix":"id",
    "filter":[
      {"__typename":{"S":"artikel"}}
    ]
  }</dbmultifile>
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

## Optional - Webiny multi language pages

### Concept of Webiny multi language pages
S3TemplateEngine differs from the standard Webiny way to implement multi language by intention. 

**Webiny usually allows you to define different data models for each language.**
This has some use cases and you can tweak S3TemplateEngine to work with this as well. (If you want to do this, please contact me: it has been done before, but it is a lillte more complicated and not part of the open source project.) But I consider these usecases as edge cases, so I decided to go a different way with S3TemplateEngine.

**S3TemplateEngine works differently**
I strongly belive, that the best user experience for content editors is having the different locales side by side. Therefore we'll use ONE Webiny locale and one data model, inserting different fields for the different languages.

### Using multi language in Webiny
<details>
  <summary>Intall S3TemplateEngine, Multi Language and Webiny.</summary>
    
   * Install S3TemplateEngine, as described in the [Installation](#Installation) paragraph.
   * Install S3TemplateEngine multi language extension, as described in the [Set-Up op multi language pages](#Set-Up-of-multi-language-pages) paragraph.
      * Install S3TemplateEngine Webiny extension, as described in the [Installation of optional Webiny extension](#Installation-of-optional-Webiny-extension) paragraph.
</details>
<details>
  <summary>Add fields for you additonal locales in all data models.</summary>
    
   * Go to your Webiny admin interface
   * Navigate to Modles -> staticContent and click the pen to edit the model
You'll see a field "contentid" that's the key for your data item. And a field "content", that is the fallback content of your item. It will be rendered every time no language specific field is part of the model. For the most of us, it will be benificial to here put the english content.
   * To add a language, add another field like "content" (in this case a "rich text input" field) and name it "content<lang>". e.g. "contentde". **I'm talking about the "Field ID" here, not the label. Exyample: You can lable the content field with English and the contentde field with German, if oyu want.**
You can add as many languages as you like, but be aware, that you'll need to fill these fields for all content elements. An empty field will result in an empty string. The fallback functionality just works, if a whole language is not set up in the model.
   * Click on "Save"   
   * Repeat this for "staticCodeContent" and all custom models you created.
</details>
