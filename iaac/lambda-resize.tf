locals {
  resize_lambda_name = "${local.prefix}-resize"
  resize_lambda_dir  = "lambda-resize"
  resize_lambda_src  = "${local.resize_lambda_dir}/resize.py"
  source_code_hash   = base64sha256(file(local.resize_lambda_src))

  architecture = {
    aws_arch     = "arm64"
    pip_platform = "manylinux2014_aarch64"
    pip_impl     = "cp"
  }
  python_version = "3.11"
  pillow_version = "10.0.0"
}

resource "terraform_data" "install_pillow" {
  provisioner "local-exec" {
    command = "rm -rf ${local.resize_lambda_dir}/*/ && pip3 install --target ${local.resize_lambda_dir} --platform ${local.architecture.pip_platform} --implementation ${local.architecture.pip_impl} --python-version ${local.python_version} --only-binary=:all: Pillow==${local.pillow_version}"
  }

  triggers_replace = [local.source_code_hash, local.pillow_version, local.python_version]
}

data "archive_file" "resize" {
  type        = "zip"
  source_dir  = local.resize_lambda_dir
  output_path = "lambda-resize.zip"

  depends_on = [
    terraform_data.install_pillow
  ]
}

resource "aws_lambda_function" "resize" {
  filename      = data.archive_file.resize.output_path
  function_name = local.resize_lambda_name
  role          = aws_iam_role.iam_for_lambda.arn
  handler       = "resize.lambda_handler"
  architectures = [local.architecture.aws_arch]
  runtime       = "python${local.python_version}"

  source_code_hash = data.archive_file.resize.output_base64sha256
  
  timeout = 30

  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cloudwatch_log_group.resize,
  ]
}

resource "aws_lambda_function_event_invoke_config" "resize" {
  function_name                = aws_lambda_function.resize.function_name
  maximum_event_age_in_seconds = 300
  maximum_retry_attempts       = 0
}

resource "aws_lambda_permission" "allow_bucket" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.resize.arn
  principal     = "s3.amazonaws.com"
  source_arn    = data.aws_s3_bucket.lambda.arn
}

resource "aws_cloudwatch_log_group" "resize" {
  name              = "/aws/lambda/${local.resize_lambda_name}"
  retention_in_days = 7
}
