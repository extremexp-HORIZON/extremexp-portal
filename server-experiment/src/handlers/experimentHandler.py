import pymongo
import json
import time
import calendar
from dbClient import mongo_client
import uuid
from config.logging_config import get_logger
from typing import Optional, Dict

logger = get_logger(__name__)


class ExperimentHandler(object):
    def __init__(self):
        self.client = mongo_client
        self.db = self.client.experiments
        self.collection_experiment = self.db.experiment

    def get_experiments(self, username: str) -> list:
        query = {"id_experiment": {"$regex": username}}
        documents = self.collection_experiment.find(query).sort(
            "update_at", pymongo.DESCENDING
        )
        # return documents in JSON format
        return json.loads(json.dumps(list(documents), default=str))

    def detect_duplicate(self, new_name: str) -> bool:
        query = {"name": new_name}
        document = self.collection_experiment.find_one(query)
        return True if document else False

    def experiment_exists(self, exp_id: str) -> bool:
        query = {"id_experiment": exp_id}
        document = self.collection_experiment.find_one(query)
        return True if document else False

    def get_experiment(self, exp_id: str) -> Optional[Dict]:
        query = {"id_experiment": exp_id}
        document = self.collection_experiment.find_one(query)
        return json.loads(json.dumps(document, default=str)) if document else None

    def create_experiment(self, username: str, payload: dict) -> str:
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
        logger.info(f"Experiment created on MongoDB: {query}")
        return exp_name if exp_name else payload["name"]

    def delete_experiment(self, exp_id: str) -> None:
        query = {"id_experiment": exp_id}
        self.collection_experiment.delete_one(query)

    def delete_experiments(self, exp_ids: list) -> None:
        query = {"id_experiment": {"$in": exp_ids}}
        self.collection_experiment.delete_many(query)

    def update_experiment_name(self, exp_id: str, new_name: str) -> bool:
        update_time = calendar.timegm(time.gmtime())
        query = {"id_experiment": exp_id}
        new_values = {"$set": {"name": new_name, "update_at": update_time}}
        self.collection_experiment.update_one(query, new_values)
        return True

    def update_experiment_name_from_file_name(self, username: str, old_experiment_name: str, new_experiment_name: str) -> bool:
        update_time = calendar.timegm(time.gmtime())
        query = {"id_experiment": {"$regex": username}, "name": old_experiment_name}
        new_values = {"$set": {"name": new_experiment_name, "update_at": update_time}}
        self.collection_experiment.update_one(query, new_values)
        return True

    def update_experiment_graphical_model(self, exp_id: str, steps: list) -> bool:
        update_time = calendar.timegm(time.gmtime())
        query = {"id_experiment": exp_id}
        new_values = {
            "$set": {"steps": steps, "update_at": update_time}
        }
        self.collection_experiment.update_one(query, new_values)

        return True

    def update_experiment_steps_from_file_name(self, username: str, experiment_name: str, steps: dict) -> bool:
        update_time = calendar.timegm(time.gmtime())
        query = {"id_experiment": {"$regex": username}, "name": experiment_name}
        new_values = {"$set": {"steps": steps, "update_at": update_time}}
        self.collection_experiment.update_one(query, new_values)
        return True

    def get_experiment_from_file_name(self, username: str, experiment_name: str) -> Optional[Dict]:
        query = {"id_experiment": {"$regex": username}, "name": experiment_name}
        document = self.collection_experiment.find_one(query)
        return json.loads(json.dumps(document, default=str)) if document else None


experimentHandler = ExperimentHandler()
