resource "aws_sns_topic" "dead_letter_queue" {
  name = local.prefix
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.dead_letter_queue.arn
  protocol  = "email"
  endpoint  = var.email_for_notifications
}