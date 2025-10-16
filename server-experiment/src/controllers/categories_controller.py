from flask import Blueprint, request, g
from flask_cors import cross_origin
from handlers import categoryHandler, taskHandler

categories = Blueprint('categories', __name__)

ERROR_DUPLICATE = "Error: Duplicate name"
ERROR_NOT_FOUND = "Error: Not found"

@categories.route("/all", methods=["GET"])
@cross_origin()
def get_categories():
    categories = categoryHandler.get_categories(g.username)
    return {
        "message": "categories retrieved",
        "data": {"categories": categories},
    }, 200


@categories.route("/create", methods=["OPTIONS", "POST"])
@cross_origin()
def create_category():
    category_name = request.json["name"]
    if categoryHandler.detect_duplicate(g.username, category_name):
        return {
            "error": ERROR_DUPLICATE,
            "message": "Category name already exists",
        }, 409

    res = categoryHandler.create_category(g.username, category_name)
    return {"message": "Category created.", "data": {"id_category": res}}, 201


@categories.route("/<category_id>/rename", methods=["OPTIONS", "PUT"])
@cross_origin()
def update_category_name(category_id):
    category_name = request.json["name"]
    get_category = categoryHandler.get_category(category_id)
    if get_category["name"] != category_name:
        if categoryHandler.detect_duplicate(g.username, category_name):
            return {
                "error": ERROR_DUPLICATE,
                "message": "Category name already exists",
            }, 409
    categoryHandler.update_category_name(category_id, category_name)
    return {"message": "category name updated"}, 200


@categories.route("/<category_id>", methods=["OPTIONS", "DELETE"])
@cross_origin()
# FIXME: delete official category should not be allowed
def delete_category(category_id):
    if not categoryHandler.category_exists(category_id):
        return {"error": ERROR_NOT_FOUND, "message": "category does not exist"}, 404
    categoryHandler.delete_category(category_id)
    taskHandler.delete_tasks(category_id)
    return {"message": "category deleted"}, 204