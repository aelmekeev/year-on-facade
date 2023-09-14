locals {
  backend_config = file("${path.module}/backend.tfvars")

  aws_region   = one(regex("region\\s+=\\s+\"(\\S+)\"", local.backend_config))
  bucket_name  = one(regex("bucket\\s+=\\s+\"(\\S+)\"", local.backend_config))
  aws_role_arn = one(regex("role_arn\\s+=\\s+\"(\\S+)\"", local.backend_config))

  prefix = "year-on-facade"
}
