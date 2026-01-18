
import sys
import os
import warnings
# Suppress deprecation warnings from libraries
warnings.filterwarnings("ignore")
import json
import argparse
from audit import PharmaGuardAudit
from dotenv import load_dotenv

# Load env in case it's not present in environment variables
load_dotenv()

def main():
    parser = argparse.ArgumentParser(description='PharmaGuard Audit CLI')
    parser.add_argument('image_path', help='Path to the image file to audit')
    parser.add_argument('--api_key', help='Google API Key (optional, defaults to env)', default=None)
    
    args = parser.parse_args()
    
    # Ensure stdout uses UTF-8 buffering to prevent encoding errors
    sys.stdout.reconfigure(encoding='utf-8')
    
    try:
        auditor = PharmaGuardAudit(api_key=args.api_key)
        result = auditor.audit_image(args.image_path)
        
        # Output ONLY JSON to stdout
        print(json.dumps(result))
        
    except Exception as e:
        # Create a valid error JSON
        error_response = {
            "error": "CLI_EXECUTION_FAILED",
            "reason": str(e)
        }
        print(json.dumps(error_response))
        sys.exit(0)

if __name__ == "__main__":
    main()
