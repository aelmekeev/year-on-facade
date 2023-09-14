data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "iam_for_lambda" {
  name               = "${local.prefix}-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy" "lambda_logging" {
  arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.iam_for_lambda.name
  policy_arn = data.aws_iam_policy.lambda_logging.arn
}

data "aws_iam_policy_document" "bucket_access" {
  statement {
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject"
    ]

    resources = ["${aws_s3_bucket.photos.arn}/*"]
  }
}

resource "aws_iam_policy" "bucket_access" {
  name        = "photos-bucket-access"
  path        = "/year-on-facade/"
  description = "IAM policy for getting access to year-on-facade photos bucket"
  policy      = data.aws_iam_policy_document.bucket_access.json
}

resource "aws_iam_role_policy_attachment" "bucket_access" {
  role       = aws_iam_role.iam_for_lambda.name
  policy_arn = aws_iam_policy.bucket_access.arn
}