import threading
from pathlib import Path
from typing import TYPE_CHECKING
from watchdog.observers import Observer
from config.logging_config import get_logger
from .event_handlers import FileSystemSyncHandler
if TYPE_CHECKING:
    from handlers.experimentHandler import ExperimentHandler
    from handlers.workflowHandler import WorkflowHandler
    from handlers.fileSystemHandler import FileSystemHandler
    from handlers.convertorHandler import ConvertorHandler

logger = get_logger(__name__)


class FileSystemWatcher:
    """
    Manages the filesystem watcher that monitors for file deletions, modifications,
    creations, and renames in the workspace.
    """

    def __init__(self, workspace_path: str, experiment_handler: "ExperimentHandler", workflow_handler: "WorkflowHandler", file_system_handler: "FileSystemHandler", convertor_handler: "ConvertorHandler"):
        """
        Initialize the filesystem watcher.

        Args:
            workspace_path: Path to the workspace directory to watch
            experiment_handler: Handler for experiment database operations
            workflow_handler: Handler for workflow database operations
        """
        self.workspace_path = Path(workspace_path)
        self.experiment_handler = experiment_handler
        self.workflow_handler = workflow_handler
        self.file_system_handler = file_system_handler
        self.convertor_handler = convertor_handler
        self.observer = None
        self.is_running = False
        self._lock = threading.Lock()
        logger.info(f"FileSystemWatcher created for path: {workspace_path}")

    def start(self):
        """
        Start the filesystem watcher in a background thread.
        """
        with self._lock:
            if self.is_running:
                logger.warning("Watcher is already running")
                return

            try:
                # Ensure workspace directory exists
                if not self.workspace_path.exists():
                    logger.warning(f"Workspace path does not exist: {self.workspace_path}")
                    self.workspace_path.mkdir(parents=True, exist_ok=True)
                    logger.info(f"Created workspace directory: {self.workspace_path}")

                # Create event handler
                event_handler = FileSystemSyncHandler(
                    self.experiment_handler,
                    self.workflow_handler,
                    self.file_system_handler,
                    self.convertor_handler
                )

                # Create observer
                self.observer = Observer()
                self.observer.schedule(event_handler, str(self.workspace_path), recursive=True)
                self.observer.start()
                self.is_running = True

                logger.info(f"FileSystemWatcher started successfully, monitoring: {self.workspace_path}")

            except Exception as e:
                logger.error(f"Error starting FileSystemWatcher: {str(e)}", exc_info=True)
                self.is_running = False
                raise

    def stop(self):
        """
        Stop the filesystem watcher.
        """
        with self._lock:
            if not self.is_running:
                logger.warning("Watcher is not running")
                return

            try:
                if self.observer:
                    self.observer.stop()
                    self.observer.join(timeout=5)
                    self.observer = None

                self.is_running = False
                logger.info("FileSystemWatcher stopped successfully")

            except Exception as e:
                logger.error(f"Error stopping FileSystemWatcher: {str(e)}", exc_info=True)
                raise

    def get_status(self):
        """
        Get the current status of the watcher.

        Returns:
            dict: Status information
        """
        with self._lock:
            return {
                "running": self.is_running,
                "workspace_path": str(self.workspace_path),
                "observer_alive": self.observer.is_alive() if self.observer else False
            }


# Global watcher instance
_watcher_instance: "FileSystemWatcher | None" = None


def initialize_watcher(workspace_path: str, experiment_handler: "ExperimentHandler", workflow_handler: "WorkflowHandler", file_system_handler: "FileSystemHandler", convertor_handler: "ConvertorHandler") -> "FileSystemWatcher":
    """
    Initialize the global watcher instance.

    Args:
        workspace_path: Path to the workspace directory
        experiment_handler: Handler for experiment database operations
        workflow_handler: Handler for workflow database operations

    Returns:
        FileSystemWatcher: The initialized watcher instance
    """
    global _watcher_instance

    if _watcher_instance is not None:
        logger.warning("Watcher already initialized, returning existing instance")
        return _watcher_instance

    _watcher_instance = FileSystemWatcher(
        workspace_path,
        experiment_handler,
        workflow_handler,
        file_system_handler,
        convertor_handler
    )

    return _watcher_instance


def get_watcher() -> "FileSystemWatcher | None":
    """
    Get the global watcher instance.

    Returns:
        FileSystemWatcher: The watcher instance, or None if not initialized
    """
    return _watcher_instance
