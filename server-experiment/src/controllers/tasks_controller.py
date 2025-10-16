from flask import Blueprint, request, Response, g
from flask_cors import cross_origin
from handlers import taskHandler, experimentHandler, convertorHandler

tasks = Blueprint("tasks", __name__)

ERROR_DUPLICATE = "Error: Duplicate name"
ERROR_NOT_FOUND = "Error: Not found"


# TASKS
@tasks.route("/<category_id>/all", methods=["GET"])
@cross_origin()
def get_tasks(category_id):
    tasks = taskHandler.get_tasks(category_id, g.username)
    return {
        "message": "tasks retrieved",
        "data": {"tasks": tasks},
    }, 200


@tasks.route("/<task_id>", methods=["GET"])
@cross_origin()
def get_task(task_id):
    task = taskHandler.get_task(task_id)
    return {
        "message": "task retrieved",
        "data": {"task": task},
    }, 200


@tasks.route("/<category_id>", methods=["OPTIONS", "POST"])
@cross_origin()
def create_task(category_id):
    task_name = request.json["name"]
    task_provider = request.json["provider"]
    graphical_model = request.json["graphical_model"]
    if taskHandler.detect_duplicate(category_id, task_name):
        return {
            "error": ERROR_DUPLICATE,
            "message": "Task name already exists",
        }, 409
    res = taskHandler.create_task(
        g.username, category_id, task_name, task_provider, graphical_model
    )
    return {"message": "Task created", "data": {"id_task": res}}, 201


@tasks.route("/<task_id>",methods=["OPTIONS", "DELETE"])
@cross_origin()
def delete_task(task_id):
    if not taskHandler.task_exists(task_id):
        return {"error": ERROR_NOT_FOUND, "message": "this task does not exist"}, 404
    taskHandler.delete_task(task_id)
    return {"message": "task deleted"}, 204


@tasks.route("/<category_id>/<task_id>/update",methods=["OPTIONS", "PUT"])
@cross_origin()
def update_task_info(category_id, task_id):
    task_name = request.json["name"]
    task_description = request.json["description"]
    if taskHandler.detect_duplicate(category_id, task_name):
        return {
            "error": ERROR_DUPLICATE,
            "message": "Task name already exists",
        }, 409
    taskHandler.update_task_info(task_id, task_name, task_description)
    return {"message": "task information updated"}, 200


@tasks.route("/update/graph/<task_id>",methods=["OPTIONS", "PUT"])
@cross_origin()
def update_task_graphical_model(task_id):
    graphical_model = request.json["graphical_model"]
    taskHandler.update_task_graphical_model(task_id, graphical_model)
    return {"message": "task graphical model updated"}, 200


# EXECUTION
@tasks.route("/exp/execute/convert/<exp_id>", methods=["OPTIONS", "POST"])
@cross_origin()
def convert_to_source_model(exp_id):
    if not experimentHandler.experiment_exists(exp_id):
        return {"error": ERROR_NOT_FOUND, "message": "experiment not found"}, 404
    exp = experimentHandler.get_experiment(exp_id)
    convert_res = convertorHandler.convert(exp)

    if not convert_res["success"]:
        return {"error": "Error converting model", "message": convert_res["error"]}, 500
    return {"message": "source model converted", "data": convert_res["data"]}, 200
