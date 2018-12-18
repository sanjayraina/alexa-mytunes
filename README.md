# Build a Music Streamer using Alexa and AWS Serverless

This is an example of how to store and stream your music using AWS, Serverless services and an Alexa Skill. It consists of:
- a Single Page Application using surge.sh to upload music and then select and play tracks
- an Alexa Skill to select and play music tracks
- AWS API Gateway to implement APIs to select tracks and get signed URLS to play and upload tracks
- AWS Lambda functions to implement the API methods
- AWS API custom authorizer using Auth0 to control access to APIs
- Serverless framework to cleate the API and lambda functions using a YAML file
- AWS S3 buckets to hold the music media
- AWS DynamoDB to hold the metadata and state for Alexa music player

## You will need...

- NodeJS and ```npm``` installed.  

- Surge installed.
```bash
$ npm install --global surge
```

- An AWS account. **CAUTION:** You will incur charges, unless you are using the free-tier.

- An AWS IAM user with appropriate roles

- An Amazon developer account

- An Auth0 account

- A surge.sh account

- AWS CLI

- ASK CLI


## How to deploy

### Set up the various CLIs 
- Install AWS CLI as outlined [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
```bash
$ pip install awscli --upgrade --user
```

- Configure AWS CLI as outlined [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)
```bash
$ aws configure 
```

- Install the ASK CLI
```bash
$ npm install -g ask-cli
```

- Install the Surge CLI
```bash
$ sudo npm install --global surge
```

- Install the Serverless CLI
```bash
$ sudo npm install -g serverless
```

### Create AWS IAM User with appropriate Role
In the AWS console create an IAM user and attach the following policy to it.
```bash
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "iam:GetPolicy",
                "iam:GetPolicyVersion",
                "iam:GetRolePolicy",
                "iam:ListAttachedRolePolicies",
                "iam:ListRolePolicies",
                "iam:ListRoles",
                "iam:PassRole",
                "iam:CreateRole",
                "iam:GetRole",
                "iam:AttachRolePolicy",
                "iam:DeleteRolePolicy"
            ],
            "Resource": "arn:aws:iam::*:role/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "lambda:*"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "cloudformation:CreateStack",
                "cloudformation:CreateChangeSet",
                "cloudformation:ListStacks",
                "cloudformation:ListStackResources",
                "cloudformation:UpdateStack",
                "cloudformation:DescribeStacks",
                "cloudformation:DescribeStackResources",
                "cloudformation:DescribeStackEvents",
                "cloudformation:ValidateTemplate",
                "cloudformation:DescribeChangeSet",
                "cloudformation:ExecuteChangeSet",
                "cloudformation:GetTemplate",
                "cloudformation:GetTemplateSummary"
            ],
            "Resource": [
                "*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:*",
                "s3:*"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:FilterLogEvents",
                "logs:getLogEvents",
                "logs:describeLogStreams"
            ],
            "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/*"
        }
    ]
}
```
Use the users Access Key Idand Secret Access Key to set the environment variables:
```bash
export AWS_ACCESS_KEY_ID=<Your key>
export AWS_SECRET_ACCESS_KEY=<Your secret key>
```

### Setup Auth0 account and client app
If you haven't already got one, create an [Auth0 account](https://auth0.com/). You should end up with a tenant domain like *mysite.eu.auth0.com*.

Create a new Application (API) with a name such as *MyTunes* and Identifier as *https://mytunes/*. 
This will be used as Audience value later. A machine to machine application will be created.

Make note of the Client Id and Client Secret. You will need these in the next step below.
On the application page, click on *Show Advanced Settings* to reveal extra options. Click on the Certificates tab link. Download the certificate to a file, e.g. *mysite.pem*.
Convert the certificate to a string:
```bash
$ awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' mysite.pem 
```

You will need the certificate string in the next step below.

### Install Serverless APIs and Lambda functions
Create a file called *secrets.json* in the Serverless directory and fill out values as follows:
```bash
{
  "AUTH0_CLIENT_ID": "<Enter the Auth0 Client Id from previous step>",
  "AUTH0_CLIENT_CERT": "<Enter the long, certificate string as obtained in the previous step>",
  "AUTH0_CLIENT_AUDIENCE": "<Enter the identifier as in previous step, e.g. https://mytunes/>",
  "DYNAMODB_TABLE": "<Enter a name for the metaDB table, e.g. my-tunes-tracks>",
  "USERS_TABLE": "<Enter a name for the users table, e.g. my-tunes-users>",
  "UPLOAD_BUCKET": "<Enter a name for the S3 bucket to hold the media, e.g. my-tunes-tracks>",
  "ACCESS_KEY": "<Enter the AWS user Access Key>",
  "SECRET_ACCESS_KEY": "<Enter the secret key for the above user>",
  "UPLOAD_URI": " <Enter the S3 URI, e.g. https://s3.eu-west-2.amazonaws.com>"
}
```

Install the NodeJS dependencies. In the Serverless directory run:
```bash
$ npm install
```

Now deploy the APIs and associated Lambda functions on AWS:
```bash
$ sls deploy
```
This will create a set of API endpoints. Make note of these as you will need them in the next step.

### Install the Single Page App on Surge.sh
Change directory to SPA and set the constants in js/mytunes.js as follows:
```bash
const AUTH0_CLIENT_ID = "<Enter the Auth0 Client Id from previous step>";
const AUTH0_DOMAIN = "<Enter the Auth0 domain from previous step>";
const AUTH0_AUDIENCE = "<Enter the identifier as in previous step, e.g. https://mytunes/>";
const METADB_ENDPOINT = "<Enter the metadb endpoint URI from the previous step>";
const SIGNED_URL_ENDPOINT = "<Enter the signedurl endpoint URI from the previous step>";
const TRACKS_ENDPOINT = "<Enter the tracklist endpoint URI from the previous step>";
```

Choose a name for your SPA, e.g my-tunes, so your surge domain will correspondingly be my-tunes.surge.sh.
Create a file called CNAME and enter this domain name in it.

Now go back to the Auth0 application page and enter the surge.sh URI in the "Allowed Callback URL" section.

Deploy the SPA to surge:
```bash
surge
```

The above will ask to create a surge.sh account on first run.

### Install the Alexa Skill

Download the skill dependencies:
```bash
$ cd Alexa/lambda/custom 
$ npm install
```

Deploy the skill and lambda function with ASK CLI:
```bash
$ cd Alexa
$ ask deploy
```
Link the skill with Auth0.  Log into [Alexa developer console] (https://developer.amazon.com/alexa/console/ask) and navigate to the skill. 
Select the Account Linking tab to fill out the Auth0 application linking details.
To obtain these details, refer to the Auth0 application created earlier. Expand the advanced settings link and and go to the *Endpoints* section.

Now go back to the Alexa Account Linking page and fill out the form as follows.

> Authorization URI: <OAuth Authorization URL from Auth0>?audience=<API Audience from Auth0>
> Access Token URI: <OAuth Token URL from Auth0>
> Client Id: <From Auth0>
> Client Secret: <From Auth0>
> Client Authentication Scheme: HTTP Basic
> Scope: openid, email, profile
> Domain List: <Name of your Tennant Domain from Auth0>

At the bottom of the Account Linking page you will find a number of *Redirect URLs*. 
Copy the first one (e.g. https://layla.amazon.com/api/skill/link/M26D1D2CM95YM6) and head over to 
the Auth0 configuration page. In the *Allowed Callback URLs, paste this URL, separated by a comma from the previous (SPA domain) entry. Save the Auth0 as well as Account Linking forms.

### Add authorized users to table
The Serverless framework service above creates a Dynamo DB table to list users that are authorised to use the Skill and app to play and upload music.
Use the following procedure.
- decide on what user account you are going to use. I.e. one of a social media accounts or a local account created on Auth0.
- Use this account to log in to the SPA page (e.g. mytunes.surge.sh)
- On successful login, click on *Logged in as..* to bring up a pop up with the User Id. Copy the value.
- Log in to the AWS console and head over to Dynamo DB. In the users table, create the following record:
> id = <The userid displayed in popup>
> name = <Your Name>
> role = User or Admin. User allows play only. Admin allow play and upload.


## Take it for a spin

First, upload some music tracks using the SPA Web app. Use the browser to launch your Streamer app, e.g. *mytunes.surge.sh*. 
- Log in with one of your social media accounts or a user account you have created in your Auth0 Tenant. Once successful, you should see the *Upload* and *Play* tabs. 
- Before you progress further, make sure that the account you log in with has been added to the authorised users table (see above).
- Go to the Upload tab and click on *Choose file* to select an audio file on your local device. 
- Fill in the name of the *Album*, *Artist* and *Genre*. 
- Click on the *Upload* link at the bottom and wait for the file to be uploaded.

If you haven't already done so, install the Alexa app on your mobile device and make sure it is linked to your Amazon account and any Echo devices you want to use are registered with it. You should be able to see the newly installed Alexa skil in the Alexa app.

> You:  "Alexa, open ServiceNow"
> Alexa: "Welcome to the ServiceNow skill. How can I help?"
> You: "Tell me the recent incidents"
> Alexa: "Here are the 5 most recent incidents..."

## Tidy up

It's a good idea to clean up once you are done and do not want to incur any further AWS charges.

- delete the serverless service and resources 
```bash
$ cd Serverless
$ sls remove
```
- delete the skill from the Amazon developer console
