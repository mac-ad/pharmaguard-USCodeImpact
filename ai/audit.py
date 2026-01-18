
import os
import typing
import json
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image

# Load environment variables
load_dotenv()

try:
    from typing import NotRequired, TypedDict
except ImportError:
    from typing_extensions import NotRequired, TypedDict
# Pydantic/Gemini often requires typing_extensions.TypedDict on older Python
from typing_extensions import TypedDict

class AuditResults(TypedDict):
    indicator_serial: str
    temp_threshold: str
    is_active: bool
    breach_detected: bool
    max_exposure_hours: float | None
    safety_verdict: str

class ConfidenceMetrics(TypedDict):
    ai_confidence_score: float
    glare_detected: bool

class AuditResponse(TypedDict):
    audit_results: AuditResults
    confidence_metrics: ConfidenceMetrics
    error: NotRequired[str]
    reason: NotRequired[str]

class PharmaGuardAudit:
    def __init__(self, api_key: str | None = None, model_name: str = "gemini-pro-latest"):
        """
        Initialize the PharmaGuard Audit system.
        
        Args:
            api_key: XML API key for Gemini. If None, tries to read from GOOGLE_API_KEY env var.
            model_name: The model version to use. Defaults to "gemini-1.5-pro" for best reasoning.
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("API Key is required. Set GOOGLE_API_KEY environment variable or pass it to the constructor.")
        
        genai.configure(api_key=self.api_key)
        
        # Configure the model with specific generation config for reliability
        self.model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "audit_results": {
                            "type": "OBJECT",
                            "properties": {
                                "indicator_serial": {"type": "STRING"},
                                "temp_threshold": {"type": "STRING"},
                                "is_active": {"type": "BOOLEAN"},
                                "breach_detected": {"type": "BOOLEAN"},
                                "max_exposure_hours": {"type": "NUMBER"},
                                "safety_verdict": {"type": "STRING"}
                            },
                            "required": ["indicator_serial", "is_active", "breach_detected", "safety_verdict"]
                        },
                        "confidence_metrics": {
                            "type": "OBJECT",
                            "properties": {
                                "ai_confidence_score": {"type": "NUMBER"},
                                "glare_detected": {"type": "BOOLEAN"}
                            },
                            "required": ["ai_confidence_score", "glare_detected"]
                        }
                    },
                    "required": ["audit_results", "confidence_metrics"]
                },
                temperature=0.0, # Deterministic output
            )
        )
        
        self.system_instruction = """
        Persona: You are a Senior Pharmaceutical Compliance Auditor for the Nepal Department of Drug Administration (DDA). Your task is to perform a high-precision digital audit of a Timestrip PLUS temperature indicator to identify substandard medication batches.

        Step 1: Visual Integrity Check (Edge Case Handling)

        Resolution & Clarity: Evaluate if the Serial Number (S/N) and the Time Markers (1/2, 1, 2, 4, 8) are legible. If they are blurred or obscured by glare, return ONLY: {"error": "IMAGE_UNREADABLE", "reason": "Glare or blur on critical markers"}.

        Completeness: Ensure both the circular activation window and the rectangular breach window are fully visible.

        Step 2: Technical Extraction (Chain-of-Thought Reasoning)

        Identity & Traceability: Locate and transcribe the Unique Serial Number (S/N) found at the base of the label. Read the printed Temperature Threshold (e.g., 10°C, 20°C, 25°C).

        Activation Audit (Window 1): Analyze the left circular window.
        -   Condition: If ANY blue dye is visible in this circle (indicating activation), set `is_active=true`.
        -   Condition: If it is completely white/blank, set `is_active=false`.
        -   **CRITICAL**: This field must NEVER be null. If unsure, assume `true` (Precautionary Principle).

        Breach Measurement (Window 2): Analyze the rectangular window on the right.
        -   Zero-Breach: If the entire rectangular window is white, set `breach_detected=false`.
        -   Active Breach: If ANY blue dye is present in this window, set `breach_detected=true` and identify the furthest time marker it has reached.
        -   **CRITICAL**: This field must NEVER be null. If unsure, assume `true` (Precautionary Principle).

        Safety Principle: If the dye-front is between two markers (e.g., past 1 but before 2), you MUST round up to the higher marker (e.g., 2 hours) to ensure a conservative safety margin.

        Step 3: JSON Output Generation (Strict Schema) Return a single, valid JSON object with the following structure:

        JSON

        {
          "audit_results": {
            "indicator_serial": "string",
            "temp_threshold": "string",
            "is_active": boolean,
            "breach_detected": boolean,
            "max_exposure_hours": number | null,
            "safety_verdict": "SAFE | CAUTION | DISCARD"
          },
          "confidence_metrics": {
            "ai_confidence_score": 0.0-1.0,
            "glare_detected": boolean
          }
        }
        
        Constraint 1: Do not include any conversational text, markdown headers, or explanations. Output JSON only.
        Constraint 2: `is_active` and `breach_detected` must be booleans (true/false). DO NOT RETURN NULL.
        
        Why this works for your MVP
        Liability Protection: By forcing the transcription of the Serial Number, you ensure that a distributor cannot reuse the same "Safe" photo for different shipments.

        The "Precautionary Principle": The instruction to round up exposure time is a professional medical standard. It ensures that if there is any doubt, the DDA and the Pharmacist err on the side of patient safety.

        Error Prevention: The IMAGE_UNREADABLE trigger prevents the system from "hallucinating" a reading when the photo quality is poor, which is a common occurrence in warehouse environments.
        """

    def audit_image(self, image_path: str) -> AuditResponse:
        """
        Performs a complaiance audit on the given image path.
        
        Args:
            image_path: Absolute path to the image file.
            
        Returns:
            AuditResponse: Structured dictionary containing audit results.
        """
        if not os.path.exists(image_path):
            return {"error": "FILE_NOT_FOUND", "reason": f"Image not found at {image_path}"} # type: ignore
        
        try:
            # Open the image using PIL
            image = Image.open(image_path)
            
            # Generate content
            response = self.model.generate_content(
                [self.system_instruction, image]
            )
            
            # Parse response
            # Since we enforced JSON mime type and schema, response.text should be valid JSON
            result = json.loads(response.text)
            return result
            
        except Exception as e:
            return {"error": "AUDIT_FAILED", "reason": str(e)} # type: ignore
