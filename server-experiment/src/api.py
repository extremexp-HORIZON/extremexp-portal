from flask import Flask, request, g
from flask_cors import CORS, cross_origin
from handlers import userAuthHandler
from controllers import experiments, categories, tasks, workflows

BASE_PREFIX = "/api"
ERROR_FORBIDDEN = "Error: Forbidden"
ENDPOINT_WITHOUT_AUTH = []

app = Flask(__name__)
cors = CORS(app)  # cors is added in advance to allow cors requests
app.config["CORS_HEADERS"] = "Content-Type"
app.register_blueprint(experiments, url_prefix=f"{BASE_PREFIX}/experiments")
app.register_blueprint(categories, url_prefix=f"{BASE_PREFIX}/categories")
app.register_blueprint(tasks, url_prefix=f"{BASE_PREFIX}/tasks")
app.register_blueprint(workflows, url_prefix=f"{BASE_PREFIX}/workflows")

# there's a bug in flask_cors that headers is None when using before_request for OPTIONS request
@app.before_request
def verify_user():
    if request.endpoint in ENDPOINT_WITHOUT_AUTH:
        return None
    # get token from params {'token': 'token'}
    token = request.headers.get("Authorization")
    if token is None:
        return {"error": ERROR_FORBIDDEN, "message": "token is not provided"}, 403
    auth_res = userAuthHandler.verify_user(token)
    if not auth_res["valid"] or auth_res["username"] is None:
        return {"error": ERROR_FORBIDDEN, "message": auth_res["error_type"]}, 403
    g.username = auth_res["username"]


@app.after_request
def after_request(response):
    # to enable cors response
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    return response


@app.route(f"{BASE_PREFIX}/", methods=["GET"])
@cross_origin()
def index():
    return {"message": "Experiment service is running."}, 200
