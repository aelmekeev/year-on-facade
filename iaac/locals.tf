locals {
  backend_config = file("${path.module}/../config.properties")

  aws_region     = one(regex("region\\s+=\\s+\"(\\S+)\"", local.backend_config))
  bucket_name    = one(regex("bucket\\s+=\\s+\"(\\S+)\"", local.backend_config))
  aws_account_id = one(regex("account_id\\s+=\\s+\"(\\S+)\"", local.backend_config))

  prefix = "year-on-facade"
}
