from pydantic import BaseModel
from typing import List


class SolutionSummaryResponse(BaseModel):
    """Response model for solution summary from KB articles or Google search."""
    incident_number: str
    summary_points: List[str]
    source: str  # 'kb_articles' or 'google_search'
    kb_articles_count: int
    total_kb_articles_used: int
    confidence: str  # 'high' for KB articles, 'medium' for Google search
    message: str
