#!/usr/bin/env bash

set -e 

AWS_USER='ubuntu'
AWS_HOST='13.204.249.226'

AWS_KEY_PATH='~/aws/macad-machine-key.pem'
AWS_DESTINATION_PATH='/home/ubuntu/pharmahack/'

echo "Deploying to AWS..."
echo "AWS User: $AWS_USER"
echo "AWS Host: $AWS_HOST"
echo "AWS Key Path: $AWS_KEY_PATH"

echo "Building the project..."
pnpm run build

echo "Deploying the project..."
scp -i $AWS_KEY_PATH -r -v dist $AWS_USER@$AWS_HOST:$AWS_DESTINATION_PATH