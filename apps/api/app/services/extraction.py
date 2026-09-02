"""Bounded text extraction for hostile CV uploads."""

import asyncio
import io
import zipfile
from xml.etree import ElementTree

from pypdf import PdfReader

from app.core.errors import ApiError
from app.services.documents import normalize_text

MAX_DOCX_ENTRIES = 2_000
MAX_DOCX_UNCOMPRESSED = 40 * 1024 * 1024
MAX_PDF_PAGES = 100
EXTRACTION_TIMEOUT_SECONDS = 15


async def extract_text_bounded(filename: str, mime_type: str, content: bytes) -> str:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(extract_text, filename, mime_type, content),
            timeout=EXTRACTION_TIMEOUT_SECONDS,
        )
    except TimeoutError as error:
        raise ApiError("file_processing_timeout", "The document took too long to process safely.", 422) from error


def extract_text(filename: str, mime_type: str, content: bytes) -> str:
    suffix = filename.lower().rsplit(".", 1)[-1]
    if suffix in {"txt", "md"}:
        try:
            return normalize_text(content.decode("utf-8", "strict"))
        except UnicodeDecodeError as error:
            raise ApiError("file_type_invalid", "Text documents must use UTF-8 encoding.", 422) from error
    if suffix == "pdf":
        try:
            reader = PdfReader(io.BytesIO(content), strict=True)
            if reader.is_encrypted or len(reader.pages) > MAX_PDF_PAGES:
                raise ApiError("file_type_invalid", "Use an unencrypted PDF with at most 100 pages.", 422)
            return normalize_text("\n".join((page.extract_text() or "") for page in reader.pages))
        except ApiError:
            raise
        except Exception as error:
            raise ApiError("file_signature_invalid", "The PDF could not be read safely.", 422) from error
    if suffix == "docx":
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                entries = archive.infolist()
                if len(entries) > MAX_DOCX_ENTRIES or sum(item.file_size for item in entries) > MAX_DOCX_UNCOMPRESSED:
                    raise ApiError("docx_too_large", "The DOCX expands beyond the safe processing limit.", 413)
                if any(item.flag_bits & 0x1 for item in entries):
                    raise ApiError("docx_encrypted", "Encrypted DOCX files are not supported.", 422)
                document = archive.read("word/document.xml")
            root = ElementTree.fromstring(document)
            text = "\n".join(node.text or "" for node in root.iter() if node.tag.endswith("}t"))
            return normalize_text(text)
        except ApiError:
            raise
        except KeyError as error:
            raise ApiError("docx_document_missing", "The DOCX document body is missing.", 422) from error
        except (zipfile.BadZipFile, ElementTree.ParseError) as error:
            raise ApiError("docx_invalid_zip", "The DOCX file is malformed.", 422) from error
    raise ApiError("file_type_invalid", "Upload a PDF, DOCX, TXT, or Markdown document.", 422)
