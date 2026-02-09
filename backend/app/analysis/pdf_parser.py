import fitz  # PyMuPDF


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text content from a PDF file's raw bytes.

    Args:
        pdf_bytes: Raw bytes of the uploaded PDF file.

    Returns:
        Extracted text with pages separated by newlines.

    Raises:
        ValueError: If the PDF cannot be read or contains no extractable text.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        raise ValueError(f"Could not open PDF: {exc}") from exc

    pages_text: list[str] = []
    for page in doc:
        text = page.get_text("text")
        if text:
            pages_text.append(text.strip())

    doc.close()

    full_text = "\n\n".join(pages_text).strip()
    if not full_text:
        raise ValueError(
            "No text could be extracted from this PDF. "
            "It may be a scanned image — only text-based PDFs are supported."
        )

    return full_text
