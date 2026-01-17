#!/usr/bin/env bash

set -e

# Edit these in a separate, untracked secrets file or export as env vars for safety!
AWS_USER="${AWS_USER:-your-aws-username}"
AWS_HOST="${AWS_HOST:-your-aws-host}"
AWS_KEY_PATH="${AWS_KEY_PATH:-/path/to/your/key.pem}"
AWS_DESTINATION_PATH="${AWS_DESTINATION_PATH:-/home/ubuntu/pharmahack}"

# Load local secrets if present
if [ -f "$(dirname "${BASH_SOURCE[0]}")/deploy.env" ]; then
  source "$(dirname "${BASH_SOURCE[0]}")/deploy.env"
fi

FRONTEND_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../frontend" && pwd)"
BACKEND_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../backend" && pwd)"
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Deploying to AWS..."
echo "AWS User: $AWS_USER"
echo "AWS Host: $AWS_HOST"
echo "AWS Key Path: $AWS_KEY_PATH"

if [[ "$AWS_USER" == "" || "$AWS_HOST" == "" || "$AWS_KEY_PATH" == "" || "$AWS_DESTINATION_PATH" == "" ]]; then
  echo "ERROR: One or more AWS_* vars are not set. Please create a 'deploy.env' file or set env vars before running."
  exit 1
fi

# Build the frontend
echo -e "\n\nBuilding the frontend..."
cd "$FRONTEND_PATH"
npm run build

# Copy frontend dist to AWS
echo -e "\n\nCopying frontend build to AWS..."
scp -i "$AWS_KEY_PATH" -r -v "$FRONTEND_PATH/dist" "$AWS_USER@$AWS_HOST:$AWS_DESTINATION_PATH"

# Copy backend to AWS (excluding node_modules)
echo -e "\n\nCopying backend to AWS..."
rsync -avz --exclude 'node_modules' -e "ssh -i $AWS_KEY_PATH" "$BACKEND_PATH" "$AWS_USER@$AWS_HOST:$AWS_DESTINATION_PATH"

# Install backend dependencies on AWS server
echo -e "\n\nInstalling backend dependencies..."
ssh -i "$AWS_KEY_PATH" "$AWS_USER@$AWS_HOST" "cd $AWS_DESTINATION_PATH/backend && npm install --production"

# Start backend using pm2 (restart if already running)
echo -e "\n\nStarting backend..."
ssh -i "$AWS_KEY_PATH" "$AWS_USER@$AWS_HOST" "cd $AWS_DESTINATION_PATH/backend && (pm2 describe pharmahack-api > /dev/null && pm2 restart pharmahack-api || pm2 start npm --name pharmahack-api -- run start)"

# Replace the nginx config safely
echo -e "\n\nReplacing the nginx config for frontend..."
scp -i "$AWS_KEY_PATH" -v "$SCRIPT_PATH/pharmahack.macad.dev" "$AWS_USER@$AWS_HOST:/home/ubuntu/"

# Move nginx config into place with sudo
ssh -i "$AWS_KEY_PATH" "$AWS_USER@$AWS_HOST" "sudo mv /home/ubuntu/pharmahack.macad.dev /etc/nginx/sites-available/pharmahack.macad.dev"

# Enable the nginx config
ssh -i "$AWS_KEY_PATH" "$AWS_USER@$AWS_HOST" "sudo ln -sf /etc/nginx/sites-available/pharmahack.macad.dev /etc/nginx/sites-enabled/pharmahack.macad.dev"

# Reload nginx
ssh -i "$AWS_KEY_PATH" "$AWS_USER@$AWS_HOST" "sudo nginx -t"

# Restart nginx
ssh -i "$AWS_KEY_PATH" "$AWS_USER@$AWS_HOST" "sudo systemctl reload nginx"

# Restart pm2 just to be sure
ssh -i "$AWS_KEY_PATH" "$AWS_USER@$AWS_HOST" "pm2 restart pharmahack-api"

