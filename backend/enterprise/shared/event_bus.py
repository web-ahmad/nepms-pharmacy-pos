"""
Phase 5.3 — Enterprise Event Bus

In-process, asyncio-native event bus.
Features:
  - Async handlers
  - Sync-to-async bridge (for legacy sync callers)
  - Dead-letter queue for failed handlers
  - Handler priority ordering
  - Wildcard subscriptions via base class matching
"""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from datetime import datetime
from typing import Any, Callable, Coroutine, Type

from enterprise.shared.domain_events import DomainEvent

logger = logging.getLogger(__name__)

AsyncHandler = Callable[[DomainEvent], Coroutine[Any, Any, None]]


class _DeadLetterEntry:
    __slots__ = ("event", "handler_name", "error", "failed_at")

    def __init__(self, event: DomainEvent, handler_name: str, error: Exception) -> None:
        self.event = event
        self.handler_name = handler_name
        self.error = error
        self.failed_at = datetime.utcnow()


class EnterpriseEventBus:
    """
    Singleton in-process event bus.
    Usage:
        bus = EnterpriseEventBus.get_instance()
        bus.subscribe(MyEvent, my_async_handler)
        await bus.publish(MyEvent(...))
    """

    _instance: "EnterpriseEventBus | None" = None

    def __init__(self) -> None:
        # event_type → list of (priority, handler)
        self._handlers: dict[Type[DomainEvent], list[tuple[int, AsyncHandler]]] = defaultdict(list)
        self._dead_letter: list[_DeadLetterEntry] = []
        self._lock = asyncio.Lock()

    @classmethod
    def get_instance(cls) -> "EnterpriseEventBus":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset(cls) -> None:
        """Test helper — clears the singleton."""
        cls._instance = None

    # ─────────────────────────────────────────────────────
    # Subscription
    # ─────────────────────────────────────────────────────

    def subscribe(
        self,
        event_type: Type[DomainEvent],
        handler: AsyncHandler,
        priority: int = 100,
    ) -> None:
        """
        Register an async handler for a specific event type.
        Lower priority number = higher execution order.
        """
        handlers = self._handlers[event_type]
        handlers.append((priority, handler))
        handlers.sort(key=lambda x: x[0])
        logger.debug("Subscribed %s to %s (priority=%d)", handler.__name__, event_type.__name__, priority)

    def subscribe_many(
        self,
        event_type: Type[DomainEvent],
        handlers: list[AsyncHandler],
        priority: int = 100,
    ) -> None:
        for h in handlers:
            self.subscribe(event_type, h, priority)

    def unsubscribe(self, event_type: Type[DomainEvent], handler: AsyncHandler) -> None:
        self._handlers[event_type] = [
            (p, h) for p, h in self._handlers[event_type] if h is not handler
        ]

    # ─────────────────────────────────────────────────────
    # Publishing
    # ─────────────────────────────────────────────────────

    async def publish(self, event: DomainEvent) -> None:
        """
        Publish an event to all registered handlers.
        Handlers run sequentially in priority order.
        Failures are captured in the dead-letter queue without stopping
        subsequent handlers.
        """
        event_type = type(event)
        handlers = self._handlers.get(event_type, [])

        # Also run handlers registered for base class (wildcard pattern)
        for registered_type, registered_handlers in self._handlers.items():
            if registered_type is not event_type and isinstance(event, registered_type):
                handlers = handlers + registered_handlers

        if not handlers:
            logger.debug("No handlers for %s", event_type.__name__)
            return

        logger.info(
            "[EventBus] Publishing %s (id=%s, tenant=%s)",
            event_type.__name__, event.event_id, event.tenant_id,
        )

        for _priority, handler in handlers:
            try:
                await handler(event)
            except Exception as exc:  # noqa: BLE001
                logger.exception(
                    "[EventBus] Handler %s failed for %s: %s",
                    handler.__name__, event_type.__name__, exc
                )
                self._dead_letter.append(
                    _DeadLetterEntry(event, handler.__name__, exc)
                )

    def publish_sync(self, event: DomainEvent) -> None:
        """
        Bridge for synchronous callers (e.g. SQLAlchemy event hooks).
        Schedules publish on the running loop or creates a new one.
        """
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(self.publish(event))
            else:
                loop.run_until_complete(self.publish(event))
        except RuntimeError:
            asyncio.run(self.publish(event))

    # ─────────────────────────────────────────────────────
    # Dead-letter
    # ─────────────────────────────────────────────────────

    def drain_dead_letter(self) -> list[_DeadLetterEntry]:
        """Return and clear the dead-letter queue."""
        entries = list(self._dead_letter)
        self._dead_letter.clear()
        return entries

    @property
    def dead_letter_count(self) -> int:
        return len(self._dead_letter)

    # ─────────────────────────────────────────────────────
    # Diagnostics
    # ─────────────────────────────────────────────────────

    def registered_handler_count(self, event_type: Type[DomainEvent]) -> int:
        return len(self._handlers.get(event_type, []))

    def list_subscriptions(self) -> dict[str, list[str]]:
        return {
            et.__name__: [h.__name__ for _, h in hs]
            for et, hs in self._handlers.items()
        }


# Module-level convenience accessor
def get_event_bus() -> EnterpriseEventBus:
    return EnterpriseEventBus.get_instance()
