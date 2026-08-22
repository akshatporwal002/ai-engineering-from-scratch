import unittest
from uuid import UUID

from app.core.errors import ApiError
from app.domain.models import CvDocumentCreate
from app.repositories.memory import DeterministicClock, DeterministicIds, MemoryRepositories
from app.services.documents import DOCX_ERROR_CODES, DocumentService, MAX_BYTES, normalize_text, safe_filename, validate_document


TEXT = b"A deterministic synthetic resume with enough text for the current one hundred and twenty character minimum. It contains only fake material for local tests."


def command(filename="resume.txt", mime="text/plain", content=TEXT, extracted=None, pasted=None):
    return CvDocumentCreate(filename=filename, mime_type=mime, content=content, pasted_text=pasted, extracted_text=extracted, target_role="AI Engineer", consent=True)


class DocumentTests(unittest.IsolatedAsyncioTestCase):
    def test_supported_txt_pdf_and_docx(self):
        self.assertEqual(validate_document(command())[0], "resume.txt")
        extracted = TEXT.decode()
        self.assertEqual(validate_document(command("resume.pdf", "application/pdf", b"%PDF-fixture", extracted))[0], "resume.pdf")
        self.assertEqual(validate_document(command("resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", b"PK-fixture", extracted))[0], "resume.docx")
        self.assertEqual(validate_document(command("resume.md", "text/markdown", TEXT))[0], "resume.md")

    def test_current_docx_error_vocabulary_is_preserved(self):
        self.assertEqual(DOCX_ERROR_CODES, {"docx_invalid_zip", "docx_invalid_directory", "docx_encrypted", "docx_too_large", "docx_invalid_entry", "docx_unsupported_compression", "docx_not_enough_text", "docx_document_missing"})

    def test_rejects_unsafe_filename_type_mime_and_signature(self):
        for value in [command("../resume.txt"), command("resume.exe", "text/plain"), command("resume.pdf", "text/plain", b"%PDF-x", TEXT.decode()), command("resume.pdf", "application/pdf", b"no", TEXT.decode())]:
            with self.assertRaises(ApiError): validate_document(value)

    def test_exact_size_boundary_and_too_large(self):
        exact = command("resume.pdf", "application/pdf", b"%PDF-" + b"x" * (MAX_BYTES - 5), TEXT.decode())
        self.assertEqual(len(exact.content), MAX_BYTES)
        validate_document(exact)
        with self.assertRaises(ApiError): validate_document(command("resume.pdf", "application/pdf", b"%PDF-" + b"x" * (MAX_BYTES - 4), TEXT.decode()))

    def test_empty_and_short_text_are_rejected(self):
        with self.assertRaises(ApiError): validate_document(command(content=b""))
        with self.assertRaises(ApiError): validate_document(command(content=b"short"))

    def test_text_normalization_is_bounded(self):
        source = "Synthetic CV line with enough deterministic content. " * 4
        self.assertEqual(normalize_text(source + "  \r\nSecond line."), source.rstrip() + "\nSecond line.")
        with self.assertRaises(ApiError): normalize_text("x" * 100_001)

    async def test_pagination_is_stable_and_validated(self):
        repository = MemoryRepositories()
        service = DocumentService(repository, DeterministicClock(), DeterministicIds())
        user = UUID(int=1)
        first = await service.create(user, command("first.txt"))
        second = await service.create(user, command("second.txt"))
        page = await service.list(user, 0, 1)
        self.assertEqual(page.total, 2)
        self.assertEqual(page.items[0].id, second.id)
        self.assertNotEqual(first.id, second.id)

    async def test_delete_removes_owned_metadata_and_object(self):
        repository = MemoryRepositories()
        service = DocumentService(repository, DeterministicClock(), DeterministicIds())
        user = UUID(int=1)
        item = await service.create(user, command())
        self.assertIsNotNone(await repository.get_object(user, item.id))
        await service.delete(user, item.id)
        self.assertIsNone(await repository.get_object(user, item.id))
        self.assertIsNone(await repository.get_document(user, item.id))

    def test_filename_normalizer_does_not_accept_hidden_or_paths(self):
        for value in [".env", "/tmp/resume.txt", "resume?.txt"]:
            with self.assertRaises(ApiError): safe_filename(value)

    def test_requires_exactly_one_file_or_pasted_source(self):
        with self.assertRaises(ApiError): validate_document(command(content=None))
        with self.assertRaises(ApiError): validate_document(command(pasted=TEXT.decode()))
        filename, text = validate_document(command(content=None, pasted=TEXT.decode()))
        self.assertEqual(filename, "resume.txt")
        self.assertEqual(text, TEXT.decode())


if __name__ == "__main__":
    unittest.main()
