"""
Test script to verify successful imports after Audit Module cleanup.
"""
try:
    from enterprise.shared.domain_events import DomainEvent
    from enterprise.shared.event_bus import EnterpriseEventBus
    from enterprise.shared.value_objects import Severity
    print("Shared infrastructure imports successfully!")

    try:
        from enterprise.ai.domain.entities import AIModel
        print("AI Module imports successfully!")
    except ImportError:
        print("AI Module is missing (this might be normal depending on the state, but shouldn't crash).")
        pass

    import sys
    sys.exit(0)
except Exception as e:
    import traceback
    traceback.print_exc()
    import sys
    sys.exit(1)
