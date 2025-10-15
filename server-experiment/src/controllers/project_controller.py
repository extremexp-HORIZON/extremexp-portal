from flask import Blueprint, request, Response, g
from flask_cors import cross_origin
from handlers import projectHandler, experimentHandler, fileSystemHandler

projects = Blueprint('projects', __name__)
ERROR_DUPLICATE = "Error: Duplicate name"

# PROJECTS
@projects.route("/all", methods=["GET"])
@cross_origin()
def get_projects():
    projects = projectHandler.get_projects(g.username)
    return {
        "message": "projects retrieved",
        "data": {"projects": projects},
    }, 200

@projects.route("/create", methods=["OPTIONS", "POST"])
@cross_origin()
def create_project():
    proj_name = request.json["name"]
    if projectHandler.detect_duplicate(g.username, proj_name):
        return {
            "error": ERROR_DUPLICATE,
            "message": "Project name already exists",
        }, 409

    res = projectHandler.create_project(g.username, proj_name)
    fileSystemHandler.create_project(g.username, proj_name)
    return {"message": "Project created.", "data": {"id_project": res}}, 201


@projects.route("/update/<proj_id>", methods=["OPTIONS", "PUT"])
@cross_origin()
def update_project_info(proj_id):
    proj_name = request.json["name"]
    get_proj = projectHandler.get_project(proj_id)
    if get_proj["name"] != proj_name:
        if projectHandler.detect_duplicate(g.username, proj_name):
            return {
                "error": ERROR_DUPLICATE,
                "message": "Project name already exists",
            }, 409
    description = request.json["description"]  # can be empty
    projectHandler.update_project_info(proj_id, proj_name, description)
    fileSystemHandler.rename_project(g.username, get_proj["name"], proj_name)
    return {"message": "project info updated"}, 200


@projects.route("/delete/<proj_id>", methods=["OPTIONS", "DELETE"])
@cross_origin()
def delete_project(proj_id):
    if not projectHandler.project_exists(proj_id):
        return {"message": "project does not exist"}, 404
    projectHandler.delete_project(proj_id)
    experimentHandler.delete_experiments(proj_id)
    fileSystemHandler.delete_project(g.username, proj_id)
    return {"message": "project deleted"}, 204