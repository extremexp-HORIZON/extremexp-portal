"""Tests for filesystem operations module."""

from pathlib import Path

import pytest

from filesystem_sync.filesystem.operations import FileOperations


class TestFileOperations:
    """Tests for FileOperations class."""

    @pytest.fixture
    def file_ops(self, temp_workspace: Path) -> FileOperations:
        """Create FileOperations instance for testing."""
        return FileOperations(temp_workspace)

    def test_read_success(self, file_ops: FileOperations, temp_workspace: Path):
        """Test reading a file successfully."""
        # Create user directory structure and file
        exp_dir = temp_workspace / "alice" / "experiments"
        exp_dir.mkdir(parents=True)
        test_file = exp_dir / "test.xxp"
        test_file.write_text("Hello, World!")

        content = file_ops.read("alice", "experiments", "test")
        assert content == "Hello, World!"

    def test_read_not_found(self, file_ops: FileOperations, temp_workspace: Path):
        """Test reading a non-existent file returns None."""
        content = file_ops.read("alice", "experiments", "does_not_exist")
        assert content is None

    def test_read_invalid_username(self, file_ops: FileOperations):
        """Test reading with invalid username returns None."""
        content = file_ops.read("../etc", "experiments", "passwd")
        assert content is None

    def test_write_success(self, file_ops: FileOperations, temp_workspace: Path):
        """Test writing a file successfully."""
        result = file_ops.write("bob", "experiments", "output", "Test content")

        assert result is True
        output_file = temp_workspace / "bob" / "experiments" / "output.xxp"
        assert output_file.exists()
        assert output_file.read_text() == "Test content"

    def test_write_creates_parent_dirs(self, file_ops: FileOperations, temp_workspace: Path):
        """Test writing a file creates parent directories."""
        result = file_ops.write("newuser", "workflows", "mywf", "Workflow content")

        assert result is True
        wf_file = temp_workspace / "newuser" / "workflows" / "mywf.xxp"
        assert wf_file.exists()
        assert wf_file.read_text() == "Workflow content"

    def test_write_invalid_username(self, file_ops: FileOperations):
        """Test writing with invalid username returns False."""
        result = file_ops.write("../evil", "experiments", "bad", "content")
        assert result is False

    def test_delete_success(self, file_ops: FileOperations, temp_workspace: Path):
        """Test deleting a file successfully."""
        # Create a file first
        exp_dir = temp_workspace / "alice" / "experiments"
        exp_dir.mkdir(parents=True)
        test_file = exp_dir / "to_delete.xxp"
        test_file.write_text("Delete me")

        result = file_ops.delete("alice", "experiments", "to_delete")

        assert result is True
        assert not test_file.exists()

    def test_delete_non_existent(self, file_ops: FileOperations, temp_workspace: Path):
        """Test deleting a non-existent file returns True (idempotent)."""
        result = file_ops.delete("alice", "experiments", "does_not_exist")
        assert result is True  # Idempotent - succeeds even if file doesn't exist

    def test_delete_invalid_username(self, file_ops: FileOperations):
        """Test deleting with invalid username returns False."""
        result = file_ops.delete("../etc", "experiments", "hosts")
        assert result is False

    def test_exists_true(self, file_ops: FileOperations, temp_workspace: Path):
        """Test exists returns True for existing file."""
        exp_dir = temp_workspace / "alice" / "experiments"
        exp_dir.mkdir(parents=True)
        test_file = exp_dir / "exists.xxp"
        test_file.write_text("I exist")

        assert file_ops.exists("alice", "experiments", "exists") is True

    def test_exists_false(self, file_ops: FileOperations, temp_workspace: Path):
        """Test exists returns False for non-existent file."""
        assert file_ops.exists("alice", "experiments", "does_not_exist") is False

    def test_exists_invalid_username(self, file_ops: FileOperations):
        """Test exists with invalid username returns False."""
        assert file_ops.exists("../etc", "experiments", "passwd") is False

    def test_list_files(self, file_ops: FileOperations, temp_workspace: Path):
        """Test listing .xxp files."""
        # Create user directory structure
        exp_dir = temp_workspace / "alice" / "experiments"
        wf_dir = temp_workspace / "alice" / "workflows"
        exp_dir.mkdir(parents=True)
        wf_dir.mkdir(parents=True)

        # Create .xxp files
        (exp_dir / "exp1.xxp").write_text("experiment 1")
        (exp_dir / "exp2.xxp").write_text("experiment 2")
        (wf_dir / "wf1.xxp").write_text("workflow 1")

        # Create non-.xxp files (should be ignored)
        (exp_dir / "readme.txt").write_text("readme")
        (exp_dir / "exp1.xxp.err").write_text("error file")

        exp_files = file_ops.list_files("alice", "experiments")
        wf_files = file_ops.list_files("alice", "workflows")

        assert set(exp_files) == {"exp1", "exp2"}
        assert set(wf_files) == {"wf1"}

    def test_list_files_empty(self, file_ops: FileOperations, temp_workspace: Path):
        """Test listing .xxp files in empty directory."""
        files = file_ops.list_files("alice", "experiments")
        assert files == []

    def test_list_users(self, file_ops: FileOperations, temp_workspace: Path):
        """Test listing users."""
        # Create user directories
        (temp_workspace / "alice").mkdir()
        (temp_workspace / "bob").mkdir()
        (temp_workspace / ".hidden").mkdir()  # Should be excluded

        users = file_ops.list_users()

        assert set(users) == {"alice", "bob"}

    def test_write_error(self, file_ops: FileOperations, temp_workspace: Path):
        """Test writing error file."""
        result = file_ops.write_error("alice", "experiments", "test", "Parse error")

        assert result is True
        err_file = temp_workspace / "alice" / "experiments" / "test.xxp.err"
        assert err_file.exists()
        assert err_file.read_text() == "Parse error"

    def test_delete_also_removes_error_file(self, file_ops: FileOperations, temp_workspace: Path):
        """Test that delete also removes associated error file."""
        # Create file and error file
        exp_dir = temp_workspace / "alice" / "experiments"
        exp_dir.mkdir(parents=True)
        (exp_dir / "test.xxp").write_text("content")
        (exp_dir / "test.xxp.err").write_text("error")

        result = file_ops.delete("alice", "experiments", "test")

        assert result is True
        assert not (exp_dir / "test.xxp").exists()
        assert not (exp_dir / "test.xxp.err").exists()

    def test_rename_success(self, file_ops: FileOperations, temp_workspace: Path):
        """Test renaming a file."""
        exp_dir = temp_workspace / "alice" / "experiments"
        exp_dir.mkdir(parents=True)
        (exp_dir / "old.xxp").write_text("content")

        result = file_ops.rename("alice", "experiments", "old", "new")

        assert result is True
        assert not (exp_dir / "old.xxp").exists()
        assert (exp_dir / "new.xxp").exists()
        assert (exp_dir / "new.xxp").read_text() == "content"

    def test_ensure_user_directories(self, file_ops: FileOperations, temp_workspace: Path):
        """Test creating user directories."""
        result = file_ops.ensure_user_directories("newuser")

        assert result is True
        assert (temp_workspace / "newuser" / "experiments").is_dir()
        assert (temp_workspace / "newuser" / "workflows").is_dir()
