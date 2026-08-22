"""Bounded CV validation and in-memory document orchestration."""

import re
from pathlib import PurePath
from uuid import UUID

from app.core.errors import ApiError
from app.domain.models import CvDocumentCreate, CvDocumentDetail, CvDocumentView, Page
from app.repositories.memory import DeterministicClock, DeterministicIds, MemoryRepositories

MAX_BYTES = 10 * 1024 * 1024
MIME = {".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".txt": "text/plain", ".md": "text/markdown"}
DOCX_ERROR_CODES = {"docx_invalid_zip", "docx_invalid_directory", "docx_encrypted", "docx_too_large", "docx_invalid_entry", "docx_unsupported_compression", "docx_not_enough_text", "docx_document_missing"}


def safe_filename(value: str) -> str:
    name = PurePath(value).name
    if name != value or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._ -]{0,179}", name) or name.startswith("."):
        raise ApiError("file_type_invalid", "Choose a safe PDF, DOCX, or TXT filename.", 422)
    return name


def normalize_text(value: str) -> str:
    normalized = "\n".join(line.rstrip() for line in value.replace("\r\n", "\n").replace("\r", "\n").split("\n")).strip()
    if len(normalized) < 120:
        raise ApiError("not_enough_text", "Provide at least 120 characters of readable CV text.", 422)
    if len(normalized) > 100_000:
        raise ApiError("invalid_request", "CV text exceeds the 100,000 character limit.", 422)
    return normalized


def validate_document(command: CvDocumentCreate) -> tuple[str, str]:
    if (command.content is None) == (command.pasted_text is None):
        raise ApiError("invalid_request", "Provide exactly one CV file or pasted CV text.", 422)
    filename = safe_filename(command.filename)
    suffix = PurePath(filename).suffix.lower()
    if suffix not in MIME or command.mime_type != MIME[suffix]:
        raise ApiError("file_type_invalid", "Upload a PDF, DOCX, or TXT document with matching metadata.", 422)
    if command.pasted_text is not None:
        if suffix not in {".txt", ".md"}:
            raise ApiError("file_type_invalid", "Pasted CV text requires TXT or Markdown metadata.", 422)
        return filename, normalize_text(command.pasted_text)
    assert command.content is not None
    if not command.content:
        raise ApiError("invalid_request", "The CV document is empty.", 422)
    if len(command.content) > MAX_BYTES:
        raise ApiError("file_too_large", "The CV document must be 10 MB or smaller.", 413)
    if suffix == ".pdf" and not command.content.startswith(b"%PDF-"):
        raise ApiError("file_signature_invalid", "The PDF signature is invalid.", 422)
    if suffix == ".docx" and not command.content.startswith(b"PK"):
        raise ApiError("file_signature_invalid", "The DOCX signature is invalid.", 422)
    text = command.extracted_text if command.extracted_text is not None else (command.content.decode("utf-8", "strict") if suffix in {".txt", ".md"} else "")
    return filename, normalize_text(text)


class DocumentService:
    def __init__(self, repository: MemoryRepositories, clock: DeterministicClock, ids: DeterministicIds) -> None:
        self.repository, self.clock, self.ids = repository, clock, ids

    async def create(self, user_id: UUID, command: CvDocumentCreate) -> CvDocumentView:
        filename, _text = validate_document(command)
        content = command.content if command.content is not None else (command.pasted_text or "").encode()
        item = CvDocumentView(id=self.ids.next(), filename=filename, mime_type=command.mime_type, size_bytes=len(content), status="uploaded", created_at=self.clock.now())
        await self.repository.put_document(user_id, item)
        await self.repository.put_object(user_id, item.id, content)
        return item

    async def list(self, user_id: UUID, offset: int, limit: int) -> Page:
        rows, total = await self.repository.list_documents(user_id, offset, limit)
        return Page(items=rows, offset=offset, limit=limit, total=total)

    async def get(self, user_id: UUID, item_id: UUID) -> CvDocumentView:
        item = await self.repository.get_document(user_id, item_id)
        if item is None:
            raise ApiError("document_not_found", "The CV document was not found.", 404)
        return item

    async def detail(self, user_id: UUID, item_id: UUID) -> CvDocumentDetail:
        return CvDocumentDetail(document=await self.get(user_id, item_id), analyses=await self.repository.list_analyses(user_id, item_id))

    async def delete(self, user_id: UUID, item_id: UUID) -> None:
        await self.get(user_id, item_id)
        await self.repository.delete_object(user_id, item_id)
        await self.repository.delete_document(user_id, item_id)
