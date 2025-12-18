from bacinet.middleware import BacinetMiddleware


class ConditionalBacinetMiddleware:
    def __init__(self, app):
        self.app = app
        self.bacinet = BacinetMiddleware(app)

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path.startswith("/docs") or path.startswith("/redoc"):
                await self.app(scope, receive, send)
                return

        await self.bacinet(scope, receive, send)
