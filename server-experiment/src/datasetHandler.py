import pymongo
import json
import time
import calendar
from dbClient import mongo_client
from projectHandler import projectHandler


class DatasetHandler(object):
    def __init__(self):
        self.client = mongo_client
        self.db = self.client.experiments
        self.collection_dataset = self.db.dataset

    def get_datasets(self, proj_id):
        query = {"project_id": proj_id}
        documents = self.collection_dataset.find(query).sort(
            "update_at", pymongo.DESCENDING
        )
        # return documents in JSON format
        return json.loads(json.dumps(list(documents), default=str))

    def dataset_exists(self, dataset_id):
        query = {"id_dataset": dataset_id}
        documents = self.collection_dataset.find(query)
        for doc in documents:
            if doc["id_dataset"] == dataset_id:
                return True
        return False

    def get_dataset(self, dataset_id):
        query = {"id_dataset": dataset_id}
        documents = self.collection_dataset.find(query)
        return json.loads(json.dumps(documents[0], default=str))

    def create_dataset(self, username, proj_id, dataset_name):
        # TODO Orestis to upload file to Zenoh here
        create_time = calendar.timegm(time.gmtime())  # get current time in seconds
        dataset_id = username + "-" + dataset_name.replace(" ", "") + "-" + str(create_time)
        query = {
            "id_dataset": dataset_id,
            "project_id": proj_id,
            "name": dataset_name,
            "create_at": create_time,
            "update_at": create_time
        }
        self.collection_dataset.insert_one(query)

        projectHandler.update_project_update_at(proj_id)
        return dataset_id

    def delete_dataset(self, dataset_id, proj_id):
        query = {"id_dataset": dataset_id}
        self.collection_dataset.delete_one(query)

        projectHandler.update_project_update_at(proj_id)

    def delete_datasets(self, proj_id):
        query = {"project_id": proj_id}
        self.collection_dataset.delete_many(query)

    # FIXME: bad implementation
    def detect_duplicate(self, proj_id, dataset_name):
        query = {"project_id": proj_id, "name": dataset_name}
        documents = self.collection_dataset.find(query)
        for doc in documents:
            if doc["name"] == dataset_name:
                return True
        return False

    def update_dataset_name(self, dataset_id, proj_id, dataset_name):
        update_time = calendar.timegm(time.gmtime())
        query = {"id_dataset": dataset_id}
        new_values = {"$set": {"name": dataset_name, "update_at": update_time}}
        self.collection_dataset.update_one(query, new_values)

        projectHandler.update_project_update_at(proj_id)
        return True


datasetHandler = DatasetHandler()
