import os
import json
from pathlib import Path
import shutil
from datetime import datetime
from services.file_watcher import register_api_event
from config.logging_config import get_logger
from handlers import convertorHandler
import requests

logger = get_logger(__name__)

class FileSystemHandler:
    def __init__(self):
        self.workspace_path = Path("/workspace")
        self.archives_path = Path("/archives")

    def create_experiment(self, username: str, exp_name: str) -> dict:
        filepath = self.workspace_path / username / "experiments" / f"{exp_name}.xxp"
        if filepath.exists():
            return {"message": f"experiment name {exp_name} already exists"}, 406
        register_api_event('create', username, "experiments", exp_name)
        os.makedirs(self.workspace_path / username / "experiments", exist_ok=True)
        with open(filepath, 'w') as fileobject:
            fileobject.write("")

        return {"message": f"experiment started with name {exp_name}"}, 201

    def create_workflow(self, username: str, workflow_name: str) -> tuple:
        filepath = self.workspace_path / username / "workflows" / f"{workflow_name}.xxp"
        if filepath.exists():
            return {"message": f"workflow name {workflow_name} already exists"}, 406
        register_api_event('create', username, "workflows", workflow_name)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        filepath.write_text("", encoding='utf-8')

        return {"message": f"workflow started with name {workflow_name}"}, 201

    def rename_experiment(self, username: str, old_experiment_name: str, new_experiment_name: str) -> dict:
        filepath = self.workspace_path / username / "experiments" / f"{old_experiment_name}.xxp"
        if not filepath.exists():
            return {"message": f"experiment name {old_experiment_name} does not exist"}, 404

        if new_experiment_name:
            register_api_event('rename', username, "experiments", old_experiment_name)
            os.rename(filepath, self.workspace_path / username / "experiments" / f"{new_experiment_name}.xxp")
            return {"message": f"experiment {old_experiment_name} was renamed to {new_experiment_name}"}, 200

        return {"message": f"no update on {old_experiment_name}"}, 200

    def rename_workflow(self, username: str, old_workflow_name: str, new_workflow_name: str) -> dict:
        sourcePath = self.workspace_path / username / "workflows" / f"{old_workflow_name}.xxp"
        targetPath = self.workspace_path / username / "workflows" / f"{new_workflow_name}.xxp"
        if not sourcePath.exists():
            return {"message": f"workflow name {old_workflow_name} does not exist"}, 404

        if new_workflow_name:
            register_api_event('rename', username, "workflows", old_workflow_name)
            os.rename(sourcePath, targetPath)
            return {"message": f"workflow {old_workflow_name} was renamed to {new_workflow_name}"}, 200

        return {"message": f"no update on {old_workflow_name}"}, 200

    def delete_experiment(self, username: str, experiment_name: str) -> dict:
        filepath = self.workspace_path / username / "experiments" / f"{experiment_name}.xxp"
        if not filepath.exists():
            return {"message": f"experiment name {experiment_name} does not exist"}, 404
        try:
            # Register this deletion to prevent watcher from cleaning up database
            register_api_event('delete', username, "experiments", experiment_name)
            os.remove(filepath)
            return {"message": f"{experiment_name} has been deleted"}, 204
        except Exception as e:
            return {"message": f"Error deleting {experiment_name}: {str(e)}"}, 500

    def delete_workflow(self, username: str, workflow_name: str) -> dict:
        filepath = self.workspace_path / username / "workflows" / f"{workflow_name}.xxp"
        if not filepath.exists():
            return {"message": f"workflow name {workflow_name} does not exist"}, 404
        try:
            # Register this deletion to prevent watcher from cleaning up database
            register_api_event('delete', username, "workflows", workflow_name)
            os.remove(filepath)
            return {"message": f"{workflow_name} has been deleted"}, 204
        except Exception as e:
            return {"message": f"Error deleting {workflow_name}: {str(e)}"}, 500

    def update_experiment(self, username: str, experiment_name: str, content: str) -> dict:
        filepath = self.workspace_path / username / "experiments" / f"{experiment_name}.xxp"
        if not filepath.exists():
            return {"message": f"experiment name {experiment_name} does not exist"}, 404

        # Register this modification to prevent watcher from processing it
        register_api_event('modify', username, "experiments", experiment_name)

        dsl_content = convertorHandler.experiment2dsl(experiment_name, content)

        if dsl_content:
            with open(filepath, 'w', encoding='utf-8') as fileobject:
                fileobject.write(dsl_content)
            return {"message": f"experiment {experiment_name} updated successfully"}, 200
        else:
            return {"message": f"Error converting experiment {experiment_name} to DSL"}, 500

    def update_workflow(self, username: str, workflow_name: str, content: dict) -> dict:
        filepath = self.workspace_path / username / "workflows" / f"{workflow_name}.xxp"
        if not filepath.exists():
            return {"message": f"workflow name {workflow_name} does not exist"}, 404

        # Register this modification to prevent watcher from processing it
        register_api_event('modify', username, "workflows", workflow_name)

        dsl_content = convertorHandler.workflow2dsl(workflow_name, content)

        if dsl_content:
            with open(filepath, 'w', encoding='utf-8') as fileobject:
                fileobject.write(dsl_content)
            return {"message": f"workflow {workflow_name} updated successfully"}, 200
        else:
            return {"message": f"Error converting workflow {workflow_name} to DSL"}, 500

    def get_experiments(self, username: str) -> dict:
        experiments = [ exp for exp in (self.workspace_path / username / "experiments").glob(f"*.xxp") ]
        filenames = [f.name for f in experiments]
        return {"message": "experiments retrieved", "data": {"experiments": filenames}}, 200

    def get_experiment_dsl(self, username: str, experiment_name: str) -> dict:
        filepath = self.workspace_path / username / "experiments" / f"{experiment_name}.xxp"
        if not filepath.exists():
            return {"message": f"experiment name {experiment_name} does not exist"}, 404

        with open(filepath, "r") as dsl:
            text = dsl.read()

        return {"message": f"experiment {experiment_name} retrieved", "data": {"dsl": text}}, 200

    def get_workflow_dsl(self, username: str, workflow_name: str) -> dict:
        filepath = self.workspace_path / username / "workflows" / f"{workflow_name}.xxp"
        if not filepath.exists():
            return {"message": f"workflow name {workflow_name} does not exist"}, 404

        with open(filepath, "r") as dsl:
            text = dsl.read()

        return {"message": f"workflow {workflow_name} retrieved", "data": {"dsl": text}}, 200

    def archive_experiment(self, username: str, experiment_name: str) -> dict:
        filepath = self.workspace_path / username / "experiments" / f"{experiment_name}.xxp"
        if not filepath.exists():
            return {"message": f"experiment name {experiment_name} does not exist"}, 404

        os.makedirs(self.archives_path, exist_ok=True)

        # Get current date and time as a string
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # Create new file name with timestamp suffix
        new_name = f"{experiment_name}.xxp.{timestamp}"

        # Define full destination path
        destination_path = os.path.join(self.archives_path, new_name)

        # Move and rename the file
        shutil.move(filepath , destination_path)

        return {"message": f"{experiment_name} has been archived"}, 200
    
    def detect_missing_file(self, username: str, fileType: str, fileName: str) -> bool:
        filePath = self.workspace_path / username / fileType / f"{fileName}.xxp"
        return filePath.exists()

fileSystemHandler = FileSystemHandler()