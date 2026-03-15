import logging

from config import config


def get_logger(name: str = __name__) -> logging.Logger:
    """Create a logger based on configuration settings.

    Args:
        name (str): Name of the logger. Defaults to the module's name.

    Returns:
        logging.Logger: Configured logger instance.

    """
    logger = logging.getLogger(name)

    if not logger.hasHandlers():
        log_level = config.log_level.upper()
        logger.setLevel(getattr(logging, log_level, logging.INFO))

        formatter = logging.Formatter(config.log_format)

        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        logger.propagate = False

    return logger
