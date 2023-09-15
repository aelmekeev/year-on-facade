locals {
  backend_config = file("${path.module}/../config.properties")

  aws_region   = one(regex("region\\s+=\\s+\"(\\S+)\"", local.backend_config))
  bucket_name  = one(regex("bucket\\s+=\\s+\"(\\S+)\"", local.backend_config))

  prefix = "year-on-facade"
}
