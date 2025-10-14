import requests

class UserAuthHandler(object):
    def __init__(self):
        # host depend on the host url of auth-service 
        # or the name of the container of auth-service in docker-compose.yml if you use docker-compose
        self.userAuthUrl = "http://access-control-service:5521/extreme_auth/api/v1/person/userinfo" 

    def verify_user(self, token):
        r = requests.get(url = self.userAuthUrl, headers ={
            "Authorization": token
        })
        status=r.status_code
        data = r.json()
        print("received: ", data)
        if status == 200:
            username = data['preferred_username']
            return {"valid": True, "username": username}
        else:
            return {"valid": False, "error_type": data['type']}
    
userAuthHandler = UserAuthHandler()