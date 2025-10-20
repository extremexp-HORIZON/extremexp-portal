from pathlib import Path
from typing import TYPE_CHECKING
from watchdog.events import FileSystemEventHandler
from config.logging_config import get_logger
from .event_registry import should_ignore_event

if TYPE_CHECKING:
    from handlers.experimentHandler import ExperimentHandler
    from handlers.workflowHandler import WorkflowHandler
    from handlers.fileSystemHandler import FileSystemHandler
    from handlers.convertorHandler import ConvertorHandler

logger = get_logger(__name__)


class FileSystemSyncHandler(FileSystemEventHandler):
    """
    Handles filesystem events and synchronizes with MongoDB.
    Watches for file deletions, modifications, creations, and renames,
    and updates corresponding database entries.
    """

    def __init__(self, experiment_handler: "ExperimentHandler", workflow_handler: "WorkflowHandler", file_system_handler: "FileSystemHandler", convertor_handler: "ConvertorHandler"):
        """
        Initialize the handler with database handlers.

        Args:
            experiment_handler: Handler for experiment database operations
            workflow_handler: Handler for workflow database operations
        """
        super().__init__()
        self.experiment_handler = experiment_handler
        self.workflow_handler = workflow_handler
        self.file_system_handler = file_system_handler
        self.convertor_handler = convertor_handler
        logger.info("FileSystemSyncHandler initialized")

    def on_deleted(self, event):
        """
        Called when a file or directory is deleted.

        Args:
            event: The file system event
        """
        if event.is_directory:
            return

        # Only process .xxp files
        if not event.src_path.endswith('.xxp'):
            return

        try:
            # Parse the file path to extract information
            path = Path(event.src_path)
            filename = path.stem  # filename without extension
            parent_dir = path.parent.name  # 'experiments' or 'workflows'
            username = path.parent.parent.name

            logger.info(f"File deleted: {event.src_path}")
            logger.info(f"Parsed - Username: {username}, Type: {parent_dir}, Name: {filename}")

            # Check if this deletion was initiated by the API (should be ignored)
            if should_ignore_event('delete', username, parent_dir, filename):
                logger.info(f"Skipping database cleanup for API-initiated deletion: {filename}")
                return

            # Clean up from database based on file type
            self._cleanup_file(username, filename, parent_dir)

        except Exception as e:
            logger.error(f"Error processing deleted file {event.src_path}: {str(e)}", exc_info=True)

    def on_modified(self, event):
        """
        Called when a file or directory is modified.

        Args:
            event: The file system event
        """
        if event.is_directory:
            return

        # Only process .xxp files
        if not event.src_path.endswith('.xxp'):
            return

        try:
            # Parse the file path to extract information
            path = Path(event.src_path)
            filename = path.stem  # filename without extension
            parent_dir = path.parent.name  # 'experiments' or 'workflows'
            username = path.parent.parent.name

            logger.info(f"File modified: {event.src_path}")
            logger.info(f"Parsed - Username: {username}, Type: {parent_dir}, Name: {filename}")

            # Check if this modification was initiated by the API (should be ignored)
            if should_ignore_event('modify', username, parent_dir, filename):
                logger.info(f"Skipping processing for API-initiated modification: {filename}")
                return

            # Process the modification based on file type
            self._handle_file_modification(username, filename, parent_dir, event.src_path)

        except Exception as e:
            logger.error(f"Error processing modified file {event.src_path}: {str(e)}", exc_info=True)

    def on_created(self, event):
        """
        Called when a file or directory is created.

        Args:
            event: The file system event
        """
        if event.is_directory:
            return

        # Only process .xxp files
        if not event.src_path.endswith('.xxp'):
            return

        try:
            # Parse the file path to extract information
            path = Path(event.src_path)
            filename = path.stem  # filename without extension
            parent_dir = path.parent.name  # 'experiments' or 'workflows'
            username = path.parent.parent.name

            logger.info(f"File created: {event.src_path}")
            logger.info(f"Parsed - Username: {username}, Type: {parent_dir}, Name: {filename}")

            # Check if this creation was initiated by the API (should be ignored)
            if should_ignore_event('create', username, parent_dir, filename):
                logger.info(f"Skipping processing for API-initiated creation: {filename}")
                return

            # Process the creation based on file type
            self._handle_file_creation(username, filename, parent_dir, event.src_path)

        except Exception as e:
            logger.error(f"Error processing created file {event.src_path}: {str(e)}", exc_info=True)

    def on_moved(self, event):
        """
        Called when a file or directory is renamed/moved.

        Args:
            event: The file system event (has both src_path and dest_path)
        """
        if event.is_directory:
            return

        # Only process .xxp files
        if not event.dest_path.endswith('.xxp'):
            return

        try:
            # Parse the old file path
            old_path = Path(event.src_path)
            old_filename = old_path.stem
            old_parent_dir = old_path.parent.name
            old_username = old_path.parent.parent.name

            # Parse the new file path
            new_path = Path(event.dest_path)
            new_filename = new_path.stem
            new_parent_dir = new_path.parent.name
            new_username = new_path.parent.parent.name

            logger.info(f"File renamed/moved: {event.src_path} -> {event.dest_path}")
            logger.info(f"Old - Username: {old_username}, Type: {old_parent_dir}, Name: {old_filename}")
            logger.info(f"New - Username: {new_username}, Type: {new_parent_dir}, Name: {new_filename}")

            # Check if this rename was initiated by the API (should be ignored)
            if should_ignore_event('rename', new_username, new_parent_dir, new_filename):
                logger.info(f"Skipping processing for API-initiated rename: {old_filename} -> {new_filename}")
                return

            # Process the rename based on file type
            self._handle_file_move(old_username, old_filename, old_parent_dir, new_username, new_filename, new_parent_dir, event.dest_path)

        except Exception as e:
            logger.error(f"Error processing renamed file {event.src_path}: {str(e)}", exc_info=True)

    def _handle_file_modification(self, username, file_name, file_type, file_path):
        """
        Handle file modification for any file type (experiments, workflows, etc.).
        You can implement custom logic here (e.g., update last_modified timestamp in DB).

        Args:
            username: The username who owns the file
            file_name: The name of the file (without extension)
            file_type: The type of file ('experiments', 'workflows', etc.)
            file_path: Full path to the modified file
        """
        try:
            logger.info(f"{file_type.capitalize()} file modified externally: {file_name} by user: {username}")

            if file_type == "experiments":
                # Read file content
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                steps = self.convertor_handler.dsl2experiment(file_name, content)
                if steps:
                    # Update the experiment handler with the new steps
                    self.experiment_handler.update_experiment_steps_from_file_name(username, file_name, steps)
                    logger.info(f"Successfully updated experiment {file_name} to database")
                else:
                    logger.error(f"Error couldn't fetch experiment steps from file content")
                    return
                pass
            elif file_type == "workflows":
                # Read file content
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                graphical_model = self.convertor_handler.dsl2workflow(file_name, content)
                if graphical_model:
                    # Update the workflow handler with the new graphical model
                    self.workflow_handler.update_workflow_graphical_model_from_file_name(username, file_name, graphical_model)
                    logger.info(f"Successfully updated workflow {file_name} to database")
                else:
                    logger.error(f"Error couldn't fetch workflow graphical model from file content")
                    return
                pass
            else:
                logger.warning(f"Unknown file type: {file_type}")

        except Exception as e:
            logger.error(f"Error handling {file_type} modification {file_name}: {str(e)}", exc_info=True)

    def _handle_file_creation(self, username, file_name, file_type, file_path):
        """
        Handle file creation for any file type (experiments, workflows, etc.).
        You can implement custom logic here (e.g., sync new file to database).

        Args:
            username: The username who owns the file
            file_name: The name of the file (without extension)
            file_type: The type of file ('experiments', 'workflows', etc.)
            file_path: Full path to the created file
        """
        try:
            logger.info(f"{file_type.capitalize()} file created externally: {file_name} by user: {username}")

            # Add file-type-specific logic here
            if file_type == "experiments":
                # System Detects file creation as a Create and a Modify event.
                payload = {
                    "name": file_name,
                    "steps": [],
                }
                self.experiment_handler.create_experiment(username, payload)
                pass
            elif file_type == "workflows":
                # System Detects file creation as a Create and a Modify event.
                payload = {
                    "name": file_name,
                    "graphical_model": {},
                }
                self.workflow_handler.create_workflow(username, payload)
                pass
            else:
                logger.warning(f"Unknown file type: {file_type}")

        except Exception as e:
            logger.error(f"Error handling {file_type} creation {file_name}: {str(e)}", exc_info=True)

    def _handle_file_move(self, old_username, old_file_name, old_file_type, new_username, new_file_name, new_file_type, file_path):
        """
        Handle file rename for any file type (experiments, workflows, etc.).
        You can implement custom logic here (e.g., update the name in the database).

        Args:
            old_username: The username who owns the file (before rename)
            old_file_name: The old name of the file (without extension)
            old_file_type: The old type of file ('experiments', 'workflows', etc.)
            new_username: The username who owns the file (after rename)
            new_file_name: The new name of the file (without extension)
            new_file_type: The new type of file ('experiments', 'workflows', etc.)
            file_path: Full path to the renamed file
        """
        # FIXME: Currently system identifies rename as delete + create + modify on MacOS.
        try:
            logger.info(f"{new_file_type.capitalize()} file renamed: {old_file_name} -> {new_file_name} by user: {new_username}")

            # Add file-type-specific logic here
            if new_file_type == "experiments":
                # Check if experiment exists in the database
                experiment = self.experiment_handler.get_experiment_from_file_name(old_username, old_file_name)
                if not experiment:
                    # Get JSON steps
                    logger.info(f"Experiment to rename not found in DB, creating new entry: {old_file_name} for user: {old_username}")
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    json_steps = self.convertor_handler.dsl2experiment(new_file_name, content)
                    payload = {
                        "name": new_file_name,
                        "steps": json_steps,
                    }
                    self.experiment_handler.create_experiment(new_username, payload)
                    logger.info(f"Experiment created in DB after rename: {new_file_name} for user: {new_username}")
                    return
                else:
                    logger.info(f"Experiment found in DB, proceeding with rename: {old_file_name} -> {new_file_name} for user: {old_username}")
                    self.experiment_handler.update_experiment_name_from_file_name(new_username, old_file_name, new_file_name)
                    logger.info(f"Experiment renamed in DB: {old_file_name} -> {new_file_name} for user: {new_username}")
                pass
            elif new_file_type == "workflows":
                # Check if workflow exists in the database
                experiment = self.experiment_handler.get_experiment_from_file_name(old_username, old_file_name)
                if not experiment:
                    # Get JSON graphical
                    logger.info(f"Experiment to rename not found in DB, creating new entry: {old_file_name} for user: {old_username}")
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    json_steps = self.convertor_handler.dsl2workflow(new_file_name, content)
                    payload = {
                        "name": new_file_name,
                        "steps": json_steps,
                    }
                    self.workflow_handler.create_workflow(new_username, payload)
                    logger.info(f"Workflow created in DB after rename: {new_file_name} for user: {new_username}")
                    return
                else:
                    logger.info(f"Workflow found in DB, proceeding with rename: {old_file_name} -> {new_file_name} for user: {old_username}")
                    self.workflow_handler.update_workflow_name_from_file_name(new_username, old_file_name, new_file_name)
                    logger.info(f"Workflow renamed in DB: {old_file_name} -> {new_file_name} for user: {new_username}")
                pass
            else:
                logger.warning(f"Unknown file type: {new_file_type}")

        except Exception as e:
            logger.error(f"Error handling {new_file_type} rename {old_file_name} -> {new_file_name}: {str(e)}", exc_info=True)

    def _cleanup_file(self, username, file_name, file_type):
        """
        Clean up file from database for any file type (experiments, workflows, etc.).

        Args:
            username: The username who owns the file
            file_name: The name of the file (without extension)
            file_type: The type of file ('experiments', 'workflows', etc.)
        """
        try:
            if file_type == "experiments":
                # Get all experiments for this user
                items = self.experiment_handler.get_experiments(username)

                # Find the experiment with matching name
                matching_items = [item for item in items if item.get("name") == file_name]

                if not matching_items:
                    logger.warning(f"No experiment found in DB with name: {file_name} for user: {username}")
                    return

                # Delete all matching experiments (should typically be just one)
                for item in matching_items:
                    item_id = item.get("id_experiment")
                    if item_id:
                        self.experiment_handler.delete_experiment(item_id)
                        logger.info(f"Deleted experiment from DB: {item_id} (name: {file_name})")

            elif file_type == "workflows":
                # Get all workflows for this user
                items = self.workflow_handler.get_workflows(username)

                # Find the workflow with matching name
                matching_items = [item for item in items if item.get("name") == file_name]

                if not matching_items:
                    logger.warning(f"No workflow found in DB with name: {file_name} for user: {username}")
                    return

                # Delete all matching workflows (should typically be just one)
                for item in matching_items:
                    item_id = item.get("id_workflow")
                    if item_id:
                        self.workflow_handler.delete_workflow(item_id)
                        logger.info(f"Deleted workflow from DB: {item_id} (name: {file_name})")

            else:
                logger.warning(f"Unknown file type for cleanup: {file_type}")

        except Exception as e:
            logger.error(f"Error cleaning up {file_type} {file_name}: {str(e)}", exc_info=True)
