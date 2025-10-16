import pymongo
import json
import time
import calendar
from dbClient import mongo_client
import uuid


class ExperimentHandler(object):
    def __init__(self):
        self.client = mongo_client
        self.db = self.client.experiments
        self.collection_experiment = self.db.experiment

    def get_experiments(self, username):
        query = {"id_experiment": {"$regex": username}}
        documents = self.collection_experiment.find(query).sort(
            "update_at", pymongo.DESCENDING
        )
        # return documents in JSON format
        return json.loads(json.dumps(list(documents), default=str))
    
    def detect_duplicate(self, new_name):
        query = {"name": new_name}
        documents = self.collection_experiment.find(query)
        for doc in documents:
            if doc["name"] == new_name:
                return True
        return False

    def experiment_exists(self, exp_id):
        query = {"id_experiment": exp_id}
        documents = self.collection_experiment.find(query)
        for doc in documents:
            if doc["id_experiment"] == exp_id:
                return True
        return False

    def get_experiment(self, exp_id):
        query = {"id_experiment": exp_id}
        documents = self.collection_experiment.find(query)
        return json.loads(json.dumps(documents[0], default=str))

    def create_experiment(self, username, payload):
        create_time = calendar.timegm(time.gmtime())
        exp_id = username + "-" + str(uuid.uuid4()) + "-" + str(create_time)
        exp_name = None
        if not payload:
            exp_name = "Experiment-" + str(create_time)
            query = {
                "id_experiment": exp_id,
                "name": exp_name,
                "create_at": create_time,
                "update_at": create_time,
                "steps": [],
            }
        else:
            query = payload
            query["id_experiment"] = exp_id
            query["create_at"] = create_time
            query["update_at"] = create_time
        self.collection_experiment.insert_one(query)
        return exp_name if exp_name else payload["name"]

    def delete_experiment(self, exp_id):
        query = {"id_experiment": exp_id}
        self.collection_experiment.delete_one(query)

    def update_experiment_name(self, exp_id, new_name):
        update_time = calendar.timegm(time.gmtime())
        query = {"id_experiment": exp_id}
        new_values = {"$set": {"name": new_name, "update_at": update_time}}
        self.collection_experiment.update_one(query, new_values)
        return True

    def update_experiment_graphical_model(self, exp_id, steps):
        update_time = calendar.timegm(time.gmtime())
        query = {"id_experiment": exp_id}
        new_values = {
            "$set": {"steps": steps, "update_at": update_time}
        }
        self.collection_experiment.update_one(query, new_values)

        return True


experimentHandler = ExperimentHandler()