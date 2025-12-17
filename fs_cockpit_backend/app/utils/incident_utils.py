from datetime import datetime
from typing import List, Optional

from app.schemas.incident import IncidentDTO


class IncidentUtils:
    """Utility helpers for operations on IncidentDTO objects.

    Includes string extraction, parsing of openedAt timestamps, and sorting dtos.
    """

    @staticmethod
    def extract_str(val) -> str:
        if isinstance(val, dict):
            return val.get("display_value") or val.get("value") or ""
        return val if val is not None else ""

    @staticmethod
    def extract_reference_field(val) -> tuple[Optional[str], Optional[str]]:
        """Extract both value (sys_id) and display_value (name) from a ServiceNow reference field.

        Returns:
            tuple: (value/sys_id, display_value/name)
        """
        if isinstance(val, dict):
            value = val.get("value") or None
            display_value = val.get("display_value") or None
            return (value, display_value)
        # If it's just a string, return it as the value with None for display
        return (val if val else None, None)

    @staticmethod
    def parse_opened_at(opened_at_str: Optional[str]) -> datetime:
        """Parse an openedAt string into a datetime. If parsing fails or input is falsy, return datetime.min.

        Accepts many ISO / space-separated formats, including 'Z'.
        """
        if not opened_at_str:
            return datetime.min
        if isinstance(opened_at_str, datetime):
            return opened_at_str
        val = opened_at_str.strip()
        try:
            if val.endswith("Z"):
                val = val[:-1] + "+00:00"
            return datetime.fromisoformat(val)
        except (ValueError, TypeError):
            pass
        for fmt in (
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
        ):
            try:
                return datetime.strptime(val, fmt)
            except (ValueError, TypeError):
                continue
        return datetime.min

    @staticmethod
    def sort_dtos_by_opened_at(dtos: List[IncidentDTO]) -> List[IncidentDTO]:
        """Sort a list of IncidentDTO by their openedAt (newest first)."""
        try:
            return sorted(
                dtos, key=lambda d: IncidentUtils.parse_opened_at(d.openedAt), reverse=True
            )
        except (ValueError, TypeError):
            return dtos
