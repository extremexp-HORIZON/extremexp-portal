import logging
import sys
from pathlib import Path

def setup_logging(log_level=logging.INFO):
    """
    Configure logging for the application.

    Args:
        log_level: The logging level (default: logging.INFO)
    """
    # Create logs directory if it doesn't exist
    log_dir = Path(__file__).parent.parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)

    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    # File handler
    file_handler = logging.FileHandler(log_dir / "app.log")
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    return root_logger

def get_logger(name):
    """
    Get a logger with the specified name.

    Args:
        name: The name of the logger (typically __name__)

    Returns:
        A configured logger instance
    """
    return logging.getLogger(name)
