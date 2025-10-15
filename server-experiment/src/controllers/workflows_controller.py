from flask import Blueprint, request, Response, g
from flask_cors import cross_origin
from handlers import workflowHandler

workflows = Blueprint("workflows", __name__)

ERROR_DUPLICATE = "Error: Duplicate name"

@workflows.route("/<proj_id>/list", methods=["GET"])
@cross_origin()
def get_workflows(proj_id):
    workflows = workflowHandler.get_workflows(proj_id)
    return {
        "message": "workflows retrieved",
        "data": {"workflows": workflows},
    }, 200


@workflows.route("/<work_id>", methods=["GET"])
@cross_origin()
def get_workflow(work_id):
    workflow = workflowHandler.get_workflow(work_id)
    return {
        "message": "workflow retrieved",
        "data": {"workflow": workflow},
    }, 200


@workflows.route("/create/<proj_id>", methods=["OPTIONS", "POST"])
@cross_origin()
def create_workflow(proj_id):
    work_name = request.json["work_name"]
    graphical_model = request.json["graphical_model"]
    if workflowHandler.detect_duplicate(proj_id, work_name):
        return {
            "error": ERROR_DUPLICATE,
            "message": "Workflow name already exists",
        }, 409
    res = workflowHandler.create_workflow(
        g.username, proj_id, work_name, graphical_model
    )
    return {"message": "Workflow created", "data": {"id_workflow": res}}, 201


@workflows.route(
    "/delete/<proj_id>/<work_id>",
    methods=["OPTIONS", "DELETE"],
)
@cross_origin()
def delete_workflow(proj_id, work_id):
    if not workflowHandler.workflow_exists(work_id):
        return {"message": "this workflow does not exist"}, 404
    workflowHandler.delete_workflow(work_id, proj_id)
    return {"message": "workflow deleted"}, 204


@workflows.route(
    "/rename/<proj_id>/<work_id>",
    methods=["OPTIONS", "PUT"],
)
@cross_origin()
def rename_workflow(proj_id, work_id):
    work_name = request.json["work_name"]
    if workflowHandler.detect_duplicate(proj_id, work_name):
        return {
            "error": ERROR_DUPLICATE,
            "message": "Workflow name already exists",
        }, 409
    workflowHandler.update_workflow_name(work_id, proj_id, work_name)
    return {"message": "workflow name updated"}, 200


@workflows.route(
    "/update/graph/<proj_id>/<work_id>/",
    methods=["OPTIONS", "PUT"],
)
@cross_origin()
def update_workflow_graphical_model(proj_id, work_id):
    graphical_model = request.json["graphical_model"]
    workflowHandler.update_workflow_graphical_model(
        work_id, proj_id, graphical_model
    )
    return {"message": "workflow graphical model updated"}, 200