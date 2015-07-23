# interactive-table-builder 
Guardian interactive project.

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

