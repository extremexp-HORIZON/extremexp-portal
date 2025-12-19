"""Tests for event registry module."""

import time

from filesystem_sync.sync.event_registry import EventRegistry


class TestEventRegistry:
    """Tests for EventRegistry class."""

    def test_register_and_check(self):
        registry = EventRegistry(expiry_seconds=2)

        # Register an event
        registry.register("create", "alice", "experiments", "test")

        # Should be ignored
        assert registry.should_ignore("create", "alice", "experiments", "test") is True

    def test_different_event_not_ignored(self):
        registry = EventRegistry(expiry_seconds=2)

        registry.register("create", "alice", "experiments", "test")

        # Different event type should not be ignored
        assert registry.should_ignore("modify", "alice", "experiments", "test") is False

        # Different username should not be ignored
        assert registry.should_ignore("create", "bob", "experiments", "test") is False

        # Different file type should not be ignored
        assert registry.should_ignore("create", "alice", "workflows", "test") is False

        # Different file name should not be ignored
        assert registry.should_ignore("create", "alice", "experiments", "other") is False

    def test_expiry(self):
        registry = EventRegistry(expiry_seconds=0.1)

        registry.register("create", "alice", "experiments", "test")

        # Should be ignored immediately
        assert registry.should_ignore("create", "alice", "experiments", "test") is True

        # Wait for expiry
        time.sleep(0.15)

        # Should no longer be ignored
        assert registry.should_ignore("create", "alice", "experiments", "test") is False

    def test_clear(self):
        registry = EventRegistry(expiry_seconds=10)

        registry.register("create", "alice", "experiments", "test")
        assert registry.should_ignore("create", "alice", "experiments", "test") is True

        registry.clear()

        assert registry.should_ignore("create", "alice", "experiments", "test") is False

    def test_len(self):
        registry = EventRegistry(expiry_seconds=10)

        assert len(registry) == 0

        registry.register("create", "alice", "experiments", "test1")
        assert len(registry) == 1

        registry.register("create", "alice", "experiments", "test2")
        assert len(registry) == 2

        # Same key overwrites
        registry.register("create", "alice", "experiments", "test1")
        assert len(registry) == 2
