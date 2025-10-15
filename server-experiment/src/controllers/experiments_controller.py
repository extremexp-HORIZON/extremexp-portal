from flask import Blueprint, request, g
from flask_cors import cross_origin
from handlers import experimentHandler, fileSystemHandler

experiments = Blueprint('experiments', __name__)

ERROR_DUPLICATE = "Error: Duplicate name"

@experiments.route("/<project_id>/all", methods=["GET"])
@cross_origin()
def get_experiments(project_id):
    experiments = experimentHandler.get_experiments(project_id)
    return {
        "message": "experiments retrieved",
        "data": {"experiments": experiments},
    }, 200


@experiments.route("/<experiment_id>", methods=["GET"])
@cross_origin()
def get_experiment(experiment_id):
    experiment = experimentHandler.get_experiment(experiment_id)
    return {
        "message": "experiment retrieved",
        "data": {"experiment": experiment},
    }, 200


@experiments.route("/create/<project_id>", methods=["OPTIONS", "POST"])
@cross_origin()
def create_experiment(project_id):
    exp_name = request.json["exp_name"]
    steps = request.json["steps"]
    if experimentHandler.detect_duplicate(project_id, exp_name):
        return {
            "error": ERROR_DUPLICATE,
            "message": "Experiment name already exists",
        }, 409
    res = experimentHandler.create_experiment(
        g.username, project_id, exp_name, steps
    )

    fileSystemHandler.create_experiment(g.username, project_id, exp_name)

    return {"message": "Experiment created", "data": {"id_experiment": res}}, 201


@experiments.route("/delete/<project_id>/<experiment_id>",methods=["OPTIONS", "DELETE"])
@cross_origin()
def delete_experiment(project_id, experiment_id):
    if not experimentHandler.experiment_exists(experiment_id):
        return {"message": "this experiment does not exist"}, 404
    experimentHandler.delete_experiment(experiment_id, project_id)
    fileSystemHandler.delete_experiment(g.username, project_id, experiment_id)
    return {"message": "experiment deleted"}, 204


@experiments.route("/rename/<project_id>/<experiment_id>",methods=["OPTIONS", "PUT"])
@cross_origin()
def rename_experiment(project_id, experiment_id):
    exp_name = request.json["exp_name"]
    if experimentHandler.detect_duplicate(project_id, exp_name):
        return {
            "error": ERROR_DUPLICATE,
            "message": "Experiment name already exists",
        }, 409
    experimentHandler.update_experiment_name(experiment_id, project_id, exp_name)
    fileSystemHandler.rename_experiment(g.username, project_id, experiment_id, exp_name)
    return {"message": "experiment name updated"}, 200


@experiments.route("/update/<project_id>/<experiment_id>",methods=["OPTIONS", "PUT"])
@cross_origin()
def update_experiment_graphical_model(project_id, experiment_id):
    steps = request.json["steps"]
    experimentHandler.update_experiment_graphical_model(
        experiment_id, project_id, steps
    )
    fileSystemHandler.update_experiment(g.username, project_id, experiment_id, steps)
    return {"message": "experiment graphical model updated"}, 200