# Interactive Table Builder  
Create sortable, searchable tables from Google Sheets.

# Creating your table

1. Duplicate this example Google Sheet: https://docs.google.com/spreadsheets/d/13LO5K6LWSQvHAD83fOeDO7pSKGKD-tKEgeb0qhgggys/edit#gid=0
2. Input your data and edit options (see below for explanation of the options)
3. Go to http://visuals.gutools.co.uk/docs and share your Google Sheet with the address at the top
4. You should see your Google Sheet appear in the list. Click publish to push your current data live. 
5. Click the 'table url' button to get a link to the interactive table for your data.
6. Embed this url into a Composer article

## What are the options?

### Set a title and subtitle
These are both set in the 'tableMeta' sheet of your duplicated Google Sheet. 

### Highlight rows
To specific rows, add an extra column to the end of your dataset in the tableDataSheet sheet with the header 'Highlight'. Write yes for each row you wish to highlight.

### Bold columns
To make a column's text bold, just prefix the column's header name with [bold]
For example, if you want to bold a column titled 'Scores', you would rename it to '[bold]Scores'.
Note that [bold] will not display on the rendered table.

### Truncate the number of rows
For long tables, it's sometimes preferable to initially show only a limited number of rows.
In the 'tableMeta' sheet you can set a 'rowLimit' and a 'mobileRowLimit' independently. This limits the number of rows shown on desktop and mobile respectively. If you do not wish to truncate the table, set these values to FALSE.

### Toggle whether a table is searchable
You can turn off the search field by setting the 'searchable' value to FALSE in the 'tableMeta' sheet of your Google Sheet.

### Sparklines
Any table cell can contain a sparkline. Sparkline data is automatically converted into a sparkline if entered in the following format: 
```
[sparkline=100,101,102,110,122,145,155,150,192,153,140,141,140]
```

You can normalise the scale for all the sparklines on the sheet by setting the 'normaliseSparklines' setting in the 'tableMeta' sheet to TRUE

# Development
## Getting started
If you haven't already installed [nodejs](http://nodejs.org/download/),
[grunt-cli](http://gruntjs.com/getting-started) and [bower](http://bower.io/)
then go do that first.

Next, install all the dependency packages and start the app:
```bash
> npm install
> bower install
> grunt
```

You can now view the example project running at http://localhost:9000/

## Pathing to assets
When you want to path to an asset, eg `imgs/cat.gif` you will need to prefix
the path with `@@assetPath@@`, this will be replaced with the absolute path.

An absolute path is required because interactives running via `boot.js` 
are on the guardian.com domain. Therefore, any relative URLs will resolve to
guardian.com instead of interactive.guim.co.uk or localhost.

## Installing additional libraries
If you need to use any additional libraries such as D3 or jquery then use:

`bower install d3 --save`

That will update the `bower.json` dependency file and allow requirejs to bundle
the library into the main js.

You can then require the library directly into your code via the define function:

```javascript
define(['d3', function(d3) {
  var chart = d3.box();
});
```

## Deploying to S3
Once you ready to deploy to S3 you can use grunt to upload your files.

First you'll need to specify where the files are to be uploaded, this
is done in the `package.json` file. This path should have been specified
during the project setup but it can be changed at any time.

In the `package.json` there is a section for `config` which contains
the path to the S3 folder that the deploy task will upload to.

```json
  "config": {
    "s3_folder": "embed/testing/path/"
  },
```

You will also need to export your AWS credentials into your ENV variables.
Add the following to your `~/.bashrc` or `~/.bash_profile`:

```bash
export AWS_ACCESS_KEY_ID=xxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxx
```

Next you'll want to simulate the upload to ensure it's going to do what
you think it will.
```bash
> grunt deploy --test
```

Once you're happy everything looks good, deploy for real.
```bash
> grunt deploy
```

