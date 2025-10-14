import os
import json
from pathlib import Path
import shutil
from datetime import datetime

class FileSystemHandler:
    def __init__(self):
        self.workspace_path = Path() / os.getenv("WORKSPACE_PATH", Path(__file__).parent / "workspace")
        self.archives_path = Path() / os.getenv("ARCHIVES_PATH", Path(__file__).parent / "archives")

    def create_experiment(self, username: str, project_id: str, exp_name: str) -> dict:
        filepath = self.workspace_path / username / f"{project_id}" / "experiments" / f"{exp_name}.xxp"
        if filepath.exists():
            return {"message": f"experiment name {exp_name} already exists"}, 406

        os.makedirs(self.workspace_path / username / f"{project_id}" / "experiments", exist_ok=True)
        with open(filepath, 'w') as fileobject:
            fileobject.write("")

        return {"message": f"experiment started with name {exp_name}"}, 201
    
    def create_project(self, username: str, project_id: str) -> dict:
        filepath = self.workspace_path / username / f"{project_id}"
        if filepath.exists():
            return {"message": f"project name {project_id} already exists"}, 406

        os.makedirs(self.workspace_path / username / f"{project_id}" / "experiments", exist_ok=True)

        return {"message": f"project created with name {project_id}"}, 201

    def rename_experiment(self, username: str, project_id: str, old_experiment_name: str, new_experiment_name: str) -> dict:
        filepath = self.workspace_path / username / f"{project_id}" / "experiments" / f"{old_experiment_name}.xxp"
        if not filepath.exists():
            return {"message": f"experiment name {old_experiment_name} does not exist"}, 404

        if not new_experiment_name:
            os.rename(filepath, self.workspace_path / username / f"{project_id}" / "experiments" / f"{new_experiment_name}.xxp")
            return {"message": f"experiment {old_experiment_name} was renamed to {new_experiment_name}"}, 200

        return {"message": f"no update on {old_experiment_name}"}, 200
    
    def rename_project(self, username: str, old_project_id: str, new_project_id: str) -> dict:
        filepath = self.workspace_path / username / f"{old_project_id}"
        if not filepath.exists():
            return {"message": f"project name {old_project_id} does not exist"}, 404

        if not new_project_id:
            return {"message": "new project name is empty"}, 400
    
        os.rename(filepath, self.workspace_path / username / f"{new_project_id}")
        return {"message": f"project {old_project_id} was renamed to {new_project_id}"}, 200


    def delete_experiment(self, username: str, project_id: str, experiment_name: str) -> dict:
        filepath = self.workspace_path / username / f"{project_id}" / "experiments" / f"{experiment_name}.xxp"
        if not filepath.exists():
            return {"message": f"experiment name {experiment_name} does not exist"}, 404
        try:
            os.remove(filepath)
            return {"message": f"{experiment_name} has been deleted"}, 200  
        except Exception as e:
            return {"message": f"Error deleting {experiment_name}: {str(e)}"}, 500
        
    def delete_project(self, username: str, project_id: str) -> dict:
        filepath = self.workspace_path / username / f"{project_id}"
        if not filepath.exists():
            return {"message": f"project name {project_id} does not exist"}, 404
        try:
            shutil.rmtree(filepath)
            return {"message": f"project {project_id} has been deleted"}, 200  
        except Exception as e:
            return {"message": f"Error deleting project {project_id}: {str(e)}"}, 500

    def update_experiment(self, username: str, project_id: str, experiment_name: str, content: str) -> dict:
        filepath = self.workspace_path / username / f"{project_id}" / "experiments" / f"{experiment_name}.xxp"
        if not filepath.exists():
            return {"message": f"experiment name {experiment_name} does not exist"}, 404

        with open(filepath, 'w', encoding='utf-8') as fileobject:
            fileobject.write(content)

        return {"message": f"{experiment_name} has been updated"}, 200  

    def get_experiments(self, username: str, project_id: str) -> dict:
        experiments = [ exp for exp in (self.workspace_path / username / f"{project_id}" / "experiments").glob(f"*.xxp") ]
        filenames = [f.name for f in experiments]
        return {"message": "experiments retrieved", "data": {"experiments": filenames}}, 200

    def get_experiment_fs(self, username: str, project_id: str, experiment_name: str) -> dict:
        filepath = self.workspace_path / username / f"{project_id}" / "experiments" / f"{experiment_name}.xxp"
        if not filepath.exists():
            return {"message": f"experiment name {experiment_name} does not exist"}, 404

        with open(filepath, "r") as dsl:
            text = dsl.read()

        return {"message": f"experiment {experiment_name} retrieved", "data": {"dsl": text}}, 200

    def archive_experiment(self, username: str, project_id: str, experiment_name: str) -> dict:
        filepath = self.workspace_path / username / f"{project_id}" / "experiments" / f"{experiment_name}.xxp"
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

fileSystemHandler = FileSystemHandler()