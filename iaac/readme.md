# Infrastructure

# Toolset

* [`aws-vault`](https://github.com/99designs/aws-vault) (e.g. `brew install --cask aws-vault`)
* [`terraform`](https://developer.hashicorp.com/terraform/downloads) (e.g. `brew tap hashicorp/tap && brew install hashicorp/tap/terraform` or use [`asdf`](https://github.com/asdf-vm/asdf))
* [`python`](https://www.python.org/) (version specified in the [`asdf`](https://github.com/asdf-vm/asdf)-friendly `.tool-versions`)

# ClickOps

## AWS

**Note:** estimated cost for ~1000 items in the collection is < 1$ per month.

1. You would need [an AWS account](https://aws.amazon.com/free/).
2. [Create an S3 Bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html)
   * Name of the bucket needs to be unique for the region so you most likely won't be able to use `year-on-facade`
3. [Create an IAM User](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html#id_users_create_console)
  * Name - `year-on-facade`
  * `Attach policies directly` but don't attach any policies
4. [Create Access Key](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_CreateAccessKey) for the `year-on-facade` user
  * You can save it locally or just use it in the next step
5. `aws-vault add year-on-facade` and enter access key id and secret
6. [Create an IAM role](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user.html#roles-creatingrole-user-console)
  * AWS Account
  * This account
  * Role name - `year-on-facade`
  * Once role is created Create a JSON inline policy `year-on-facade` under Permissions for terraform to manage the required resources:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::year-on-facade*",
                "arn:aws:s3:::year-on-facade*/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": "lambda:*",
            "Resource": "arn:aws:lambda:*:*:function:year-on-facade-*"
        },
        {
            "Effect": "Allow",
            "Action": "logs:*",
            "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/year-on-facade-*"
        },
        {
            "Effect": "Allow",
            "Action": "logs:DescribeLogGroups",
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": "sns:*",
            "Resource": "arn:aws:sns:*:*:year-on-facade*"
        },
        {
            "Effect": "Allow",
            "Action": "iam:*",
            "Resource": [
                "arn:aws:iam::*:role/year-on-facade-*",
                "arn:aws:iam::*:policy/year-on-facade/*"
            ]
        }
    ]
}
```
  * Update `Principal.AWS` under Trust relationships to the ARN of `year-on-facade` IAM User
7. Update `config.properties` with information specific to your setup
8. Add the following to `~/.aws/config`
```
[profile year-on-facade]
[default]
region = <region you use, e.g. eu-west-2>
role_arn = <arn of the role you have created, e.g. "arn:aws:iam::000000000000:role/year-on-facade">
```
9. Run `make t-init`. You should be prompted for your system password and then see the message:
```
Terraform has been successfully initialized!
```
10. Run `make t-apply` to create the resources.
  * Note that you will be asked for an email address to send notifications to. You would get an email to Confirm subscription once it is created.