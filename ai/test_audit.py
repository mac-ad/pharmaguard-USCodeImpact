
import os
import io
import glob
from audit import PharmaGuardAudit
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def measure_audit_performance():
    # Initialize the auditor
    try:
        auditor = PharmaGuardAudit()
        print("✅ PharmaGuard Auditor initialized successfully.")
    except Exception as e:
        print(f"❌ Failed to initialize auditor: {e}")
        return

    # Get all images in the ai/images directory
    image_dir = os.path.join(os.path.dirname(__file__), 'images')
    # Support multiple extensions
    image_patterns = ['*.jpg', '*.jpeg', '*.png', '*.webp']
    image_paths = []
    
    for pattern in image_patterns:
        image_paths.extend(glob.glob(os.path.join(image_dir, pattern)))
    
    if not image_paths:
        print(f"⚠️ No images found in {image_dir}")
        return

    print(f"🔍 Found {len(image_paths)} images to audit.")

    for image_path in image_paths:
        print(f"\n--------------------------------------------------")
        print(f"📸 Auditing: {os.path.basename(image_path)}")
        
        try:
            result = auditor.audit_image(image_path)
            
            # Check for error
            if "error" in result:
                print(f"❌ Error: {result['error']}")
                if "reason" in result:
                    print(f"   Reason: {result['reason']}")
            else:
                # Pretty print some key results
                audit = result.get('audit_results', {})
                confidence = result.get('confidence_metrics', {})
                
                print(f"✅ Audit Successful")
                print(f"   Serial: {audit.get('indicator_serial', 'N/A')}")
                print(f"   Active: {audit.get('is_active')}")
                print(f"   Breach: {audit.get('breach_detected')}")
                if audit.get('breach_detected'):
                    print(f"   Exposure: {audit.get('max_exposure_hours')} hours")
                print(f"   Verdict: {audit.get('safety_verdict')}")
                print(f"   Confidence: {confidence.get('ai_confidence_score')}")
                
                # Print full JSON for verification if needed
                import json
                print(json.dumps(result, indent=2))
                
        except Exception as e:
            print(f"❌ Exception during audit: {e}")

if __name__ == "__main__":
    measure_audit_performance()
