"""
Shared enterprise domain events.

Naming convention: <Subject><PastTense>Event
Every event is an immutable dataclass with a stable event_id and occurred_at.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass(frozen=True)
class DomainEvent:
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_at: datetime = field(default_factory=datetime.utcnow)
    aggregate_type: str = ""
    aggregate_id: str = ""
    tenant_id: str = ""
    branch_id: Optional[str] = None
