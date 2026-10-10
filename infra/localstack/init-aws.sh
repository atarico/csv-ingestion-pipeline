#!/bin/bash
set -euo pipefail

BUCKET="document-processing"
QUEUE="file-processing"
DLQ="file-processing-dlq"
REGION="us-east-1"

awslocal s3api head-bucket --bucket "$BUCKET" 2>/dev/null || awslocal s3 mb "s3://$BUCKET" --region "$REGION"

DLQ_URL=$(awslocal sqs create-queue --queue-name "$DLQ" --region "$REGION" --query QueueUrl --output text)
DLQ_ARN=$(awslocal sqs get-queue-attributes --queue-url "$DLQ_URL" --attribute-names QueueArn --query Attributes.QueueArn --output text)

awslocal sqs create-queue --queue-name "$QUEUE" --region "$REGION" \
  --attributes "{\"VisibilityTimeout\":\"60\",\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"

awslocal sqs create-queue --queue-name "$QUEUE-test" --region "$REGION"

echo "LocalStack ready: bucket=$BUCKET queue=$QUEUE dlq=$DLQ"
