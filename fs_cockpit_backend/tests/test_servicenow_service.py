from app.services.servicenow_service import ServiceNowService
from app.utils.incident_utils import IncidentUtils


def test_sort_dtos_by_opened_at_descending():
    service = ServiceNowService()

    # older cleation
    rec_old = {"sys_id": "1", "number": "INC001", "opened_at": "2021-05-01 12:00:00"}
    # newer creation
    rec_new = {"sys_id": "2", "number": "INC002", "opened_at": "2021-06-01 12:00:00"}
    # empty opened_at
    rec_none = {"sys_id": "3", "number": "INC003", "opened_at": ""}

    dtos = [service._map_incident_to_dto(r) for r in [rec_old, rec_new, rec_none]]
    # ensure initial order
    assert dtos[0].incidentNumber == "INC001"
    assert dtos[1].incidentNumber == "INC002"
    assert dtos[2].incidentNumber == "INC003"

    sorted_dtos = IncidentUtils.sort_dtos_by_opened_at(dtos)

    # After sorting, newest (INC002) should be first, oldest (INC001) next, and empty last
    assert sorted_dtos[0].incidentNumber == "INC002"
    assert sorted_dtos[1].incidentNumber == "INC001"
    assert sorted_dtos[2].incidentNumber == "INC003"


def test_parse_opened_at_various_formats():
    service = ServiceNowService()

    # ISO with Z
    s1 = "2021-05-01T12:00:00Z"
    # ISO with offset
    s2 = "2021-05-01T12:00:00+00:00"
    # space separated
    s3 = "2021-05-01 12:00:00"

    dt1 = IncidentUtils.parse_opened_at(s1)
    dt2 = IncidentUtils.parse_opened_at(s2)
    dt3 = IncidentUtils.parse_opened_at(s3)

    assert dt1.year == 2021
    assert dt2.year == 2021
    assert dt3.year == 2021

    # invalid or empty strings should return datetime.min
    dtnone = IncidentUtils.parse_opened_at("")
    assert dtnone.year == 1
