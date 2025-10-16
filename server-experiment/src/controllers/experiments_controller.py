from flask import Blueprint, request, g
from flask_cors import cross_origin
from handlers import experimentHandler, fileSystemHandler

experiments = Blueprint('experiments', __name__)

ERROR_DUPLICATE = "Error: Duplicate name"

@experiments.route("/all", methods=["GET"])
@cross_origin()
def get_experiments():
    experiments = experimentHandler.get_experiments(g.username)
    return {
        "message": "experiments retrieved",
        "data": {"experiments": experiments},
    }, 200


@experiments.route("/create", methods=["OPTIONS", "POST"])
@cross_origin()
def create_experiment():
    res = experimentHandler.create_experiment(g.username)
    fs_result, fs_status = fileSystemHandler.create_experiment(g.username, res)
    if fs_status != 201:
        return {"message": "Filesystem error", "error": fs_result}, 500

    return {"message": "Experiment created", "data": {"id_experiment": res}}, 201


@experiments.route("/<experiment_id>", methods=["GET"])
@cross_origin()
def get_experiment(experiment_id):
    experiment = experimentHandler.get_experiment(experiment_id)
    return {
        "message": "experiment retrieved",
        "data": {"experiment": experiment},
    }, 200


@experiments.route("/<experiment_id>",methods=["OPTIONS", "DELETE"])
@cross_origin()
def delete_experiment(experiment_id):
    experiment_name = request.json["exp_name"]
    if not experimentHandler.experiment_exists(experiment_id):
        return {"message": "this experiment does not exist"}, 404
    experimentHandler.delete_experiment(experiment_id)
    fs_result, fs_status = fileSystemHandler.delete_experiment(g.username, experiment_name)
    if fs_status != 204:
        return {"message": "Filesystem error", "error": fs_result}, 500
    
    return {"message": "experiment deleted"}, 204


@experiments.route("/<experiment_id>/rename",methods=["OPTIONS", "PUT"])
@cross_origin()
def rename_experiment(experiment_id):
    old_exp_name = request.json["old_exp_name"]
    new_exp_name = request.json["new_exp_name"]
    if experimentHandler.detect_duplicate(new_exp_name):
        return {
            "error": ERROR_DUPLICATE,
            "message": "Experiment name already exists",
        }, 409
    experimentHandler.update_experiment_name(experiment_id, new_exp_name)
    fs_result, fs_status = fileSystemHandler.rename_experiment(g.username, old_exp_name, new_exp_name)
    if fs_status != 200:
        return {"message": "Filesystem error", "error": fs_result}, 500
    return {"message": "experiment name updated"}, 200


@experiments.route("/<experiment_id>/update",methods=["OPTIONS", "PUT"])
@cross_origin()
def update_experiment_graphical_model(experiment_id):
    experiment_name = request.json["exp_name"]
    steps = request.json["steps"]
    experimentHandler.update_experiment_graphical_model(
        experiment_id, steps
    )
    fs_result, fs_status = fileSystemHandler.update_experiment(g.username, experiment_name, steps)
    if fs_status != 200:
        return {"message": "Filesystem error", "error": fs_result}, 500
    return {"message": "experiment graphical model updated"}, 200