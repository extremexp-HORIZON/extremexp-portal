"""Tests for path validation and security module."""

from pathlib import Path

from filesystem_sync.security import (
    MAX_FILENAME_LENGTH,
    get_error_file_path,
    is_error_file,
    parse_xxp_path,
    safe_path,
    validate_safe_name,
)


class TestValidateSafeName:
    """Tests for validate_safe_name function."""

    def test_valid_simple_name(self):
        assert validate_safe_name("test", MAX_FILENAME_LENGTH) is True

    def test_valid_name_with_underscore(self):
        assert validate_safe_name("my_experiment", MAX_FILENAME_LENGTH) is True

    def test_valid_name_with_hyphen(self):
        assert validate_safe_name("my-experiment", MAX_FILENAME_LENGTH) is True

    def test_valid_name_with_numbers(self):
        assert validate_safe_name("test123", MAX_FILENAME_LENGTH) is True

    def test_valid_name_with_dots(self):
        assert validate_safe_name("test.v1", MAX_FILENAME_LENGTH) is True

    def test_empty_name(self):
        assert validate_safe_name("", MAX_FILENAME_LENGTH) is False

    def test_too_long_name(self):
        long_name = "a" * (MAX_FILENAME_LENGTH + 1)
        assert validate_safe_name(long_name, MAX_FILENAME_LENGTH) is False

    def test_dot_traversal(self):
        assert validate_safe_name(".", MAX_FILENAME_LENGTH) is False
        assert validate_safe_name("..", MAX_FILENAME_LENGTH) is False

    def test_null_byte(self):
        assert validate_safe_name("test\x00", MAX_FILENAME_LENGTH) is False

    def test_invalid_characters(self):
        assert validate_safe_name("test/file", MAX_FILENAME_LENGTH) is False
        assert validate_safe_name("test\\file", MAX_FILENAME_LENGTH) is False
        assert validate_safe_name("test:file", MAX_FILENAME_LENGTH) is False
        assert validate_safe_name("test<file", MAX_FILENAME_LENGTH) is False
        assert validate_safe_name("test>file", MAX_FILENAME_LENGTH) is False
        assert validate_safe_name("test|file", MAX_FILENAME_LENGTH) is False
        assert validate_safe_name("test?file", MAX_FILENAME_LENGTH) is False
        assert validate_safe_name("test*file", MAX_FILENAME_LENGTH) is False

    def test_spaces_not_allowed(self):
        assert validate_safe_name("test file", MAX_FILENAME_LENGTH) is False


class TestSafePath:
    """Tests for safe_path function."""

    def test_valid_path(self, tmp_path):
        result = safe_path(tmp_path, "alice", "experiments", "test.xxp")
        assert result is not None
        assert result == tmp_path / "alice" / "experiments" / "test.xxp"

    def test_path_traversal_in_component(self, tmp_path):
        result = safe_path(tmp_path, "alice", "..", "test.xxp")
        assert result is None

    def test_path_traversal_username(self, tmp_path):
        result = safe_path(tmp_path, "..", "experiments", "test.xxp")
        assert result is None

    def test_invalid_username(self, tmp_path):
        result = safe_path(tmp_path, "alice/bob", "experiments", "test.xxp")
        assert result is None

    def test_empty_components(self, tmp_path):
        result = safe_path(tmp_path)
        assert result == tmp_path.resolve()


class TestParseXxpPath:
    """Tests for parse_xxp_path function."""

    def test_valid_experiment_path(self, tmp_path):
        file_path = tmp_path / "alice" / "experiments" / "test.xxp"
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.touch()

        result = parse_xxp_path(file_path, tmp_path)

        assert result is not None
        assert result.username == "alice"
        assert result.file_type == "experiments"
        assert result.file_name == "test"
        assert result.full_path == file_path

    def test_valid_workflow_path(self, tmp_path):
        file_path = tmp_path / "bob" / "workflows" / "my-workflow.xxp"
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.touch()

        result = parse_xxp_path(file_path, tmp_path)

        assert result is not None
        assert result.username == "bob"
        assert result.file_type == "workflows"
        assert result.file_name == "my-workflow"

    def test_wrong_extension(self, tmp_path):
        file_path = tmp_path / "alice" / "experiments" / "test.txt"
        result = parse_xxp_path(file_path, tmp_path)
        assert result is None

    def test_wrong_depth(self, tmp_path):
        # Too shallow
        file_path = tmp_path / "alice" / "test.xxp"
        result = parse_xxp_path(file_path, tmp_path)
        assert result is None

        # Too deep
        file_path = tmp_path / "alice" / "experiments" / "subdir" / "test.xxp"
        result = parse_xxp_path(file_path, tmp_path)
        assert result is None

    def test_invalid_file_type(self, tmp_path):
        file_path = tmp_path / "alice" / "invalid" / "test.xxp"
        result = parse_xxp_path(file_path, tmp_path)
        assert result is None

    def test_path_outside_workspace(self, tmp_path):
        other_path = tmp_path / ".." / "outside" / "experiments" / "test.xxp"
        result = parse_xxp_path(other_path, tmp_path)
        assert result is None


class TestErrorFiles:
    """Tests for error file helper functions."""

    def test_is_error_file_true(self):
        assert is_error_file(Path("/workspace/alice/experiments/test.xxp.err")) is True

    def test_is_error_file_false(self):
        assert is_error_file(Path("/workspace/alice/experiments/test.xxp")) is False

    def test_get_error_file_path(self):
        xxp_path = Path("/workspace/alice/experiments/test.xxp")
        err_path = get_error_file_path(xxp_path)
        assert err_path == Path("/workspace/alice/experiments/test.xxp.err")
