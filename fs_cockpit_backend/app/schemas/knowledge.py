from pydantic import BaseModel
from typing import Optional, List


class KnowledgeArticleDTO(BaseModel):
    """Data Transfer Object representing a ServiceNow Knowledge Article."""
    sysId: str
    number: str
    title: str  # Article title (same as shortDescription)
    shortDescription: str
    link: Optional[str]  # URL/link to the article
    knowledgeBase: Optional[str]
    viewCount: Optional[int]
    score: Optional[float]  # Relevance score from search API
    workflow: Optional[str]
    author: Optional[str]
    publishedDate: Optional[str]


class KnowledgeSearchResponse(BaseModel):
    """Response model for knowledge article search."""
    articles: List[KnowledgeArticleDTO]
    count: int
    query: str
