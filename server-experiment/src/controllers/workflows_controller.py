from flask import Blueprint, request, Response, g
from flask_cors import cross_origin
from handlers import workflowHandler, fileSystemHandler

workflows = Blueprint("workflows", __name__)

ERROR_DUPLICATE = "Error: Duplicate name"

@workflows.route("/all", methods=["GET"])
@cross_origin()
def get_workflows():
    workflows = workflowHandler.get_workflows(g.username)
    return {
        "message": "workflows retrieved",
        "data": {"workflows": workflows},
    }, 200


@workflows.route("/<work_id>", methods=["GET"])
@cross_origin()
def get_workflow(work_id):
    workflow = workflowHandler.get_workflow(work_id)
    # Check if the corresponding file exists (lazy cleanup)
    if not fileSystemHandler.detect_missing_file(g.username, "workflows", workflow["name"]):
        # File is missing, clean up the database entry
        workflowHandler.delete_workflow(work_id)
        return {"message": "workflow file not found", "error": "File was deleted"}, 404
    return {
        "message": "workflow retrieved",
        "data": {"workflow": workflow},
    }, 200

@workflows.route("/some",methods=["OPTIONS", "POST"])
@cross_origin()
def get_some_workflows():
    workflow_ids = request.json["workflow_ids"]
    workflows = workflowHandler.get_some_workflows(
        workflow_ids
    )
    return {"message": "Successfully fetched workflows", "data": workflows}, 200


@workflows.route("/create", methods=["OPTIONS", "POST"])
@cross_origin()
def create_workflow():
    payload = request.json
    res = workflowHandler.create_workflow(g.username, payload)
    fs_result, fs_status = fileSystemHandler.create_workflow(g.username, res)
    if fs_status != 201:
        return {"message": "Filesystem error", "error": fs_result}, 500
    if payload:
        fs_result, fs_status = fileSystemHandler.update_workflow(g.username, res, payload["graphical_model"])

    return {"message": "Workflow created", "data": {"name": res}}, 201


@workflows.route("/<work_id>",methods=["OPTIONS", "DELETE"])
@cross_origin()
def delete_workflow(work_id):
    workflow_name = request.json["work_name"]
    if not workflowHandler.workflow_exists(work_id):
        return {"message": "this workflow does not exist"}, 404
    workflowHandler.delete_workflow(work_id)
    fileSystemHandler.delete_workflow(g.username, workflow_name)

    return {"message": "workflow deleted"}, 204


@workflows.route("/<work_id>/rename",methods=["OPTIONS", "PUT"])
@cross_origin()
def rename_workflow(work_id):
    old_work_name = request.json["old_work_name"]
    new_work_name = request.json["new_work_name"]
    if workflowHandler.detect_duplicate(new_work_name):
        return {
            "error": ERROR_DUPLICATE,
            "message": "Workflow name already exists",
        }, 409
    workflowHandler.update_workflow_name(work_id, new_work_name)
    fs_result, fs_status = fileSystemHandler.rename_workflow(g.username, old_work_name, new_work_name)
    if fs_status != 200:
        return {"message": "Filesystem error", "error": fs_result}, 500
    return {"message": "workflow name updated"}, 200


@workflows.route("/<work_id>/update",methods=["OPTIONS", "PUT"])
@cross_origin()
def update_workflow_graphical_model(work_id):
    workflow_name = request.json["work_name"]
    graphical_model = request.json["graphical_model"]
    workflowHandler.update_workflow_graphical_model(
        work_id, graphical_model
    )
    fs_result, fs_status = fileSystemHandler.update_workflow(g.username, workflow_name, graphical_model)
    if fs_status != 200:
        return {"message": "Filesystem error", "error": fs_result}, 500
    return {"message": "workflow graphical model updated"}, 200
