import logging
import sys
import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import time


from rich.logging import RichHandler


def setup_logging():
    """
    Configure logging with RichHandler and structlog.
    """
    # Configure standard logging
    # RichHandler will use the format string for the message part.
    # We put the logger name at the end as requested.
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s [%(name)s]",
        datefmt="[%Y-%m-%d %H:%M:%S]",
        handlers=[
            RichHandler(
                rich_tracebacks=True,
                show_path=False,
                omit_repeated_times=False,  # Show date on every line
            )
        ],
    )

    # Mute uvicorn.access to avoid duplicate logs
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            # Disable colors to avoid ANSI codes in RichHandler output
            structlog.dev.ConsoleRenderer(colors=False),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Generate a request ID if you want, or just log
        # request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        # structlog.contextvars.bind_contextvars(request_id=request_id)

        # Use a specific logger name for access logs
        logger = structlog.get_logger("api.access")

        try:
            response = await call_next(request)
            process_time = time.time() - start_time

            logger.info(
                "http_request",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration=f"{process_time:.4f}s",
            )
            return response
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                "request_failed",
                method=request.method,
                path=request.url.path,
                duration=f"{process_time:.4f}s",
                error=str(e),
            )
            raise e
