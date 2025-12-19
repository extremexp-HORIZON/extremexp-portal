"""Conversion module for DSL <-> JSON conversion and EMF model conversion."""

from .client import ConversionClient, close_conversion_client, get_conversion_client
from .emf_client import (
    EMFClient,
    EMFConversionError,
    EMFConversionResult,
    close_emf_client,
    get_emf_client,
)

__all__ = [
    "ConversionClient",
    "get_conversion_client",
    "close_conversion_client",
    "EMFClient",
    "EMFConversionError",
    "EMFConversionResult",
    "get_emf_client",
    "close_emf_client",
]
