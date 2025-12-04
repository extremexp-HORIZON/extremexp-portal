# settings of mongoDB client
import pymongo

username = "admin"
password = "admin"

mongo_client = pymongo.MongoClient(
    f"mongodb://{username}:{password}@mongo:27017/?authSource=admin"
)
