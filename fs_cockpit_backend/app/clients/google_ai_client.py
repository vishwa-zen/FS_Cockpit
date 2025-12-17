"""
Google Gemini AI Client for generating IT solutions.
Handles communication with Google's Generative AI API for creating solution recommendations.
"""

from typing import List, Optional

import google.generativeai as genai
import structlog

from app.config.settings import get_settings

logger = structlog.get_logger(__name__)


class GoogleAIClient:
    """Client for interacting with Google Gemini AI API."""

    def __init__(self):
        """Initialize the Google AI Client with API configuration."""
        self.settings = get_settings()

        if not self.settings.GOOGLE_AI_ENABLED or not self.settings.GOOGLE_AI_API_KEY:
            logger.warning("Google AI is disabled or API key not configured")
            logger.warning(
                "Google AI Configuration",
                enabled=self.settings.GOOGLE_AI_ENABLED,
                api_key_present=bool(self.settings.GOOGLE_AI_API_KEY),
                api_key_length=(
                    len(self.settings.GOOGLE_AI_API_KEY) if self.settings.GOOGLE_AI_API_KEY else 0
                ),
            )
            self.model = None
            return

        try:
            # Configure the Gemini API
            genai.configure(api_key=self.settings.GOOGLE_AI_API_KEY)

            # Construct the full model name with "models/" prefix for the SDK
            model_name_str = str(self.settings.GOOGLE_AI_MODEL_NAME)
            if not model_name_str.startswith("models/"):
                model_name_str = f"models/{model_name_str}"

            # Initialize the model
            self.model = genai.GenerativeModel(
                model_name=model_name_str,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,  # Lower temperature for more deterministic outputs
                    max_output_tokens=self.settings.GOOGLE_AI_MAX_OUTPUT_TOKENS,
                ),
            )
            logger.info(
                "Google AI Client initialized successfully",
                model=self.settings.GOOGLE_AI_MODEL_NAME,
                api_key_preview=(
                    self.settings.GOOGLE_AI_API_KEY[:10] + "..."
                    if self.settings.GOOGLE_AI_API_KEY
                    else "NONE"
                ),
            )
        except Exception as e:  # noqa: BLE001
            logger.error(
                "Failed to initialize Google AI Client",
                error=str(e),
                error_type=type(e).__name__,
            )
            self.model = None

    async def generate_solution_points(
        self,
        incident_description: str,
        category: Optional[str] = None,
        device_name: Optional[str] = None,
        error_message: Optional[str] = None,
        device_details: Optional[str] = None,
    ) -> List[str]:
        """
        Generate solution points for an incident using Gemini AI.

        Args:
            incident_description: The main issue description from the incident
            category: The issue category (e.g., "Software", "Network", "Performance")
            device_name: The device/computer name experiencing the issue
            error_message: Any specific error messages associated with the incident
            device_details: Comprehensive device information (OS, CPU, RAM, etc.)

        Returns:
            List of 6-8 actionable solution steps as strings

        Raises:
            ValueError: If API is not configured or enabled
            Exception: If API call fails
        """
        if not self.model:
            logger.error("[GOOGLE_AI] CRITICAL: Model is None - Google AI not configured or enabled")
            raise ValueError("Google AI is not configured or enabled")

        try:
            logger.info(
                "[GOOGLE_AI] Starting solution generation",
                model=self.settings.GOOGLE_AI_MODEL_NAME,
                has_incident_description=bool(incident_description),
                incident_description_length=len(incident_description) if incident_description else 0,
            )

            # Build context information with device details priority
            context_parts = []

            # Add device details first if available (most specific)
            if device_details:
                context_parts.append(f"Device Specs: {device_details}")
            elif device_name:
                context_parts.append(f"Device: {device_name}")

            if category:
                context_parts.append(f"Category: {category}")
            if error_message:
                context_parts.append(f"Error: {error_message}")

            context_str = " | ".join(context_parts) if context_parts else ""

            logger.info(
                "[GOOGLE_AI] Context prepared",
                context_length=len(context_str),
                device_details_provided=bool(device_details),
                category=category,
                context_preview=context_str[:150] if context_str else "empty",
            )

            # Build the prompt for Gemini
            prompt = self._build_solution_prompt(incident_description, context_str)

            logger.info(
                "[GOOGLE_AI] Prompt built, about to call Gemini API",
                prompt_length=len(prompt),
                prompt_preview=prompt[:200] if prompt else "empty",
            )

            # Call Gemini API
            logger.info("[GOOGLE_AI] Making API call to generate_content()")
            response = self.model.generate_content(prompt)
            logger.info("[GOOGLE_AI] API call completed, processing response")

            # Parse and validate response
            solution_text = None
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                # Log the finish reason to understand why response might be empty
                finish_reason = getattr(candidate, "finish_reason", None)
                has_parts = (
                    candidate.content and len(candidate.content.parts) > 0
                    if candidate.content
                    else False
                )

                logger.info(
                    "[GOOGLE_AI] Response processing",
                    candidates_count=len(response.candidates),
                    finish_reason=str(finish_reason),
                    has_content=bool(candidate.content),
                    has_parts=has_parts,
                    content_parts_count=len(candidate.content.parts) if candidate.content else 0,
                )

                # Only try to get response.text if we have actual parts
                if has_parts:
                    try:
                        solution_text = response.text
                        logger.info(
                            "[GOOGLE_AI] Successfully extracted response.text",
                            text_length=len(solution_text),
                            text_preview=solution_text[:200] if solution_text else "empty",
                        )
                    except Exception as e:
                        logger.warning(
                            "[GOOGLE_AI] Could not extract response.text",
                            error=str(e),
                            error_type=type(e).__name__,
                        )
                        solution_text = None

                # If no parts, the response was cut off (MAX_TOKENS) - treat as failure
                if not solution_text:
                    logger.error(
                        "[GOOGLE_AI] No valid response parts from Gemini",
                        finish_reason=str(finish_reason),
                        candidates_count=len(response.candidates),
                    )
                    raise ValueError(
                        f"No valid response parts from Gemini (finish_reason={finish_reason})"
                    )

                logger.info("[GOOGLE_AI] Parsing solution response")
                solution_points = self._parse_solution_response(solution_text)
                logger.info(
                    "[GOOGLE_AI] Solution points parsed",
                    points_count=len(solution_points) if solution_points else 0,
                    solution_points_preview=solution_points[:2] if solution_points else [],
                )

                if solution_points:  # Only return if we got actual points
                    logger.info(
                        "[GOOGLE_AI] SUCCESS - Successfully generated solution points",
                        count=len(solution_points),
                        category=category,
                    )
                    return solution_points
                else:
                    logger.error("[GOOGLE_AI] No solution points could be parsed from response")
                    raise ValueError("No solution points could be parsed from response")

            # If we reach here, response was empty or invalid
            logger.error(
                "[GOOGLE_AI] No response candidates returned from Gemini API",
                response_candidates=response.candidates if response else "no response object",
            )
            raise ValueError("No response candidates returned from Gemini API")

        except ValueError as e:
            logger.error("[GOOGLE_AI] Validation error in solution generation", error=str(e))
            raise
        except Exception as e:
            logger.error(
                "[GOOGLE_AI] Error calling Google AI API",
                error=str(e),
                error_type=type(e).__name__,
                incident_description_preview=incident_description[:100] if incident_description else "empty",
                device_details_length=len(device_details) if device_details else 0,
                model_info=str(self.model) if self.model else "Model is None",
            )
            raise

    def _build_solution_prompt(self, incident_description: str, context: str) -> str:
        """
        Build a structured prompt for Gemini to generate solutions.

        Args:
            incident_description: The incident description
            context: Context information (device, category, error)

        Returns:
            Formatted prompt string
        """
        context_line = f"\nDevice/Category: {context}" if context else ""

        base_prompt = f"""You are an IT support technician. Provide exactly 6-8 numbered troubleshooting steps.

ISSUE: {incident_description}{context_line}

RULES:
- Output ONLY numbered steps (1. 2. 3. etc.) - no intro or explanation
- Each step: 1-2 sentences, specific action
- Use imperative: "Check", "Verify", "Run", not "Your", "You", "Your device"
- Include actual commands or menu paths
- No markdown, asterisks, or bold formatting
- Progress from basic checks to advanced solutions

Steps:"""

        return base_prompt

    def _parse_solution_response(self, response_text: str) -> List[str]:
        """
        Parse the Gemini response into individual solution points.

        Args:
            response_text: The raw response text from Gemini

        Returns:
            List of solution points as strings
        """
        import re

        # Split by newlines
        lines = [line.strip() for line in response_text.split("\n") if line.strip()]

        solution_points = []
        for line in lines:
            # Skip header lines like "Here are X troubleshooting steps" or "Here are the steps"
            if any(
                header in line.lower()
                for header in [
                    "here are",
                    "here's",
                    "below are",
                    "following are",
                    "troubleshooting steps",
                    "solution steps",
                    "your vpn",
                    "your device",
                    "your issue",
                ]
            ):
                continue

            # Remove leading numbering patterns (1., 1), -, *, etc.)
            # Handle formats like "1. ", "1) ", "- ", "* ", "** ", etc.
            cleaned = re.sub(r"^[\d]+[\.\)]\s*", "", line)  # Remove "1. " or "1) "
            cleaned = re.sub(r"^\*+\s*", "", cleaned)  # Remove leading asterisks/bold markers

            # Remove markdown bold/italic markers (* and **)
            cleaned = cleaned.replace("**", "")
            cleaned = cleaned.replace("*", "")

            # Remove leading dashes/bullets
            cleaned = re.sub(r"^[-•]\s*", "", cleaned)

            cleaned = cleaned.strip()

            # Remove conversational phrases and possessive language
            conversational_phrases = [
                r"^your\s+",  # Remove "your " at start
                r"^your\s+",
            ]
            for phrase in conversational_phrases:
                cleaned = re.sub(phrase, "", cleaned, flags=re.IGNORECASE)

            # Only include non-empty lines with meaningful content (at least 10 chars)
            if cleaned and len(cleaned) >= 10:
                solution_points.append(cleaned)

        logger.debug(
            "Parsed solution points from response",
            input_lines=len(lines),
            output_points=len(solution_points),
        )

        return solution_points


# Global instance
_google_ai_client: Optional[GoogleAIClient] = None


def get_google_ai_client() -> GoogleAIClient:
    """
    Get or create the singleton Google AI Client instance.

    Returns:
        GoogleAIClient instance
    """
    global _google_ai_client
    if _google_ai_client is None:
        _google_ai_client = GoogleAIClient()
    return _google_ai_client
