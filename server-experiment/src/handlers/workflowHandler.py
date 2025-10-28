import pymongo
import json
import time
import calendar
from dbClient import mongo_client
import uuid
from config.logging_config import get_logger
from typing import Optional, Dict

logger = get_logger(__name__)


class WorkflowHandler(object):
    def __init__(self):
        self.client = mongo_client
        self.db = self.client.workflows
        self.collection_workflow = self.db.workflow

    def get_some_workflows(self, workflow_ids: list[str]) -> list:
        query = {"id_workflow": {"$in": workflow_ids}}
        documents = self.collection_workflow.find(query).sort(
            "update_at", pymongo.DESCENDING
        )
        # return documents in JSON format
        return json.loads(json.dumps(list(documents), default=str))
    
    def get_workflows(self, username: str) -> list:
        query = {"id_workflow": {"$regex": username}}
        documents = self.collection_workflow.find(query).sort(
            "update_at", pymongo.DESCENDING
        )
        # return documents in JSON format
        return json.loads(json.dumps(list(documents), default=str))
    

    def workflow_exists(self, work_id: str) -> bool:
        query = {"id_workflow": work_id}
        document = self.collection_workflow.find_one(query)
        return True if document else False

    def get_workflow(self, work_id: str) -> Optional[Dict]:
        query = {"id_workflow": work_id}
        document = self.collection_workflow.find_one(query)
        return json.loads(json.dumps(document, default=str)) if document else None

    def create_workflow(self, username: str, payload: dict) -> str:
        create_time = calendar.timegm(time.gmtime())  # get current time in seconds
        work_id = username + "-" + str(uuid.uuid4()) + "-" + str(create_time)
        workflow_name = None
        if not payload:
            workflow_name = "Workflow-" + str(create_time)
            query = {
                "id_workflow": work_id,
                "name": workflow_name,
                "create_at": create_time,
                "update_at": create_time,
                "graphical_model": {"nodes": [], "edges": []},
            }
        else:
            query = payload
            query["id_workflow"] = work_id
            query["create_at"] = create_time
            query["update_at"] = create_time
        self.collection_workflow.insert_one(query)
        logger.info(f"Workflow created on MongoDB: {query}")
        return workflow_name if workflow_name else payload["name"]

    def delete_workflow(self, work_id: str) -> None:
        query = {"id_workflow": work_id}
        self.collection_workflow.delete_one(query)

    def delete_workflows(self, exp_ids: list) -> None:
        query = {"id_workflow": {"$in": exp_ids}}
        self.collection_workflow.delete_many(query)

    # FIXME: bad implementation
    def detect_duplicate(self, exp_name: str) -> bool:
        query = {"name": exp_name}
        documents = self.collection_workflow.find(query)
        for doc in documents:
            if doc["name"] == exp_name:
                return True
        return False

    def update_workflow_name(self, work_id: str, work_name: str) -> bool:
        update_time = calendar.timegm(time.gmtime())
        query = {"id_workflow": work_id}
        new_values = {"$set": {"name": work_name, "update_at": update_time}}
        self.collection_workflow.update_one(query, new_values)
        return True

    def update_workflow_name_from_file_name(self, username: str, old_workflow_name: str, new_workflow_name: str) -> bool:
        update_time = calendar.timegm(time.gmtime())
        query = {"id_workflow": {"$regex": username}, "name": old_workflow_name}
        new_values = {"$set": {"name": new_workflow_name, "update_at": update_time}}
        self.collection_workflow.update_one(query, new_values)
        return True

    def update_workflow_graphical_model(self, work_id: str, graphical_model: dict) -> bool:
        update_time = calendar.timegm(time.gmtime())
        query = {"id_workflow": work_id}
        new_values = {
            "$set": {"graphical_model": graphical_model, "update_at": update_time}
        }
        self.collection_workflow.update_one(query, new_values)

        return True
    
    def update_workflow_graphical_model_from_file_name(self, username: str, workflow_name: str, graphical_model: dict) -> bool:
        update_time = calendar.timegm(time.gmtime())
        query = {"id_workflow": {"$regex": username}, "name": workflow_name}
        new_values = {"$set": {"graphical_model": graphical_model, "update_at": update_time}}
        self.collection_workflow.update_one(query, new_values)
        return True

    def get_workflow_from_file_name(self, username: str, workflow_name: str) -> Optional[Dict]:
        query = {"id_workflow": {"$regex": username}, "name": workflow_name}
        document = self.collection_workflow.find_one(query)
        return json.loads(json.dumps(document, default=str)) if document else None


workflowHandler = WorkflowHandler()