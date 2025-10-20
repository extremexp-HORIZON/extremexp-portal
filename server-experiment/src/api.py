from flask import Flask, request, g
from flask_cors import CORS, cross_origin
from handlers import userAuthHandler, experimentHandler, workflowHandler, fileSystemHandler, convertorHandler
from controllers import experiments, categories, tasks, workflows
from services.file_watcher import initialize_watcher, get_watcher
from config.logging_config import setup_logging
import atexit

# Setup logging
setup_logging()

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

# Initialize and start the filesystem watcher
watcher = initialize_watcher(
    workspace_path="/workspace",
    experiment_handler=experimentHandler,
    workflow_handler=workflowHandler,
    file_system_handler=fileSystemHandler,
    convertor_handler=convertorHandler
)
watcher.start()

# Register cleanup on app shutdown
@atexit.register
def cleanup():
    if watcher:
        watcher.stop()

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


@app.route(f"{BASE_PREFIX}/health", methods=["GET"])
@cross_origin()
def index():
    return {"message": "Experiment service is running."}, 200


@app.route(f"{BASE_PREFIX}/health/watcher", methods=["GET"])
@cross_origin()
def watcher_health():
    """
    Health check endpoint for the filesystem watcher.
    Returns the current status of the watcher.
    """
    watcher = get_watcher()
    if not watcher:
        return {
            "status": "not_initialized",
            "message": "Filesystem watcher is not initialized"
        }, 503

    status = watcher.get_status()
    if status["running"]:
        return {
            "status": "healthy",
            "message": "Filesystem watcher is running",
            "details": status
        }, 200
    else:
        return {
            "status": "unhealthy",
            "message": "Filesystem watcher is not running",
            "details": status
        }, 503
