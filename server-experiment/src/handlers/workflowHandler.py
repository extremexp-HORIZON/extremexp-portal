import pymongo
import json
import time
import calendar
from dbClient import mongo_client
import uuid


class WorkflowHandler(object):
    def __init__(self):
        self.client = mongo_client
        self.db = self.client.workflows
        self.collection_workflow = self.db.workflow

    def get_workflows(self, username):
        query = {"id_workflow": {"$regex": username}}
        documents = self.collection_workflow.find(query).sort(
            "update_at", pymongo.DESCENDING
        )
        # return documents in JSON format
        return json.loads(json.dumps(list(documents), default=str))
    

    def workflow_exists(self, work_id):
        query = {"id_workflow": work_id}
        documents = self.collection_workflow.find(query)
        for doc in documents:
            if doc["id_workflow"] == work_id:
                return True
        return False

    def get_workflow(self, work_id):
        query = {"id_workflow": work_id}
        documents = self.collection_workflow.find(query)
        return json.loads(json.dumps(documents[0], default=str))

    def create_workflow(self, username):
        create_time = calendar.timegm(time.gmtime())  # get current time in seconds
        work_id = username + "-" + str(uuid.uuid4()) + "-" + str(create_time)
        work_name = "Workflow-" + str(create_time)
        query = {
            "id_workflow": work_id,
            "name": work_name,
            "create_at": create_time,
            "update_at": create_time,
            "graphical_model": {
                "nodes": [],
                "edges": [],
            },
        }
        self.collection_workflow.insert_one(query)

        return work_name

    def delete_workflow(self, work_id):
        query = {"id_workflow": work_id}
        self.collection_workflow.delete_one(query)

    # FIXME: bad implementation
    def detect_duplicate(self, exp_name):
        query = {"name": exp_name}
        documents = self.collection_workflow.find(query)
        for doc in documents:
            if doc["name"] == exp_name:
                return True
        return False

    def update_workflow_name(self, work_id, exp_name):
        update_time = calendar.timegm(time.gmtime())
        query = {"id_workflow": work_id}
        new_values = {"$set": {"name": exp_name, "update_at": update_time}}
        self.collection_workflow.update_one(query, new_values)

        return True

    def update_workflow_graphical_model(self, work_id, graphical_model):
        update_time = calendar.timegm(time.gmtime())
        query = {"id_workflow": work_id}
        new_values = {
            "$set": {"graphical_model": graphical_model, "update_at": update_time}
        }
        self.collection_workflow.update_one(query, new_values)

        return True


workflowHandler = WorkflowHandler()