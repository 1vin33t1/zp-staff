"""
Anganwadi full merit list PDF generator.

Run:
    python anganwadi_pdf.py

API:
    POST http://localhost:8995/

Body:
    {
        "output_file_name": "full_merit_list.pdf",
        "meritList": [
            {
                "village": "Asegoan",
                "header": ["row1", "row2"],
                "footer": ["row1", "row2"],
                "maxRowPerPage": 10,
                "columnWidth": {
                    "1": 10,
                    "5": 20,
                    "16": 20
                },
                "columnWidths": {
                    "A.No.": 6,
                    "Educational Qualification (% of marks obtained).Class XII": 8
                },
                "rows": [...]
            }
        ]
    }

Response:
    {"success": true}
"""
import os
import re
import traceback
from html import escape
from io import BytesIO
from urllib.request import urlretrieve

from flask import Flask, request, jsonify
from minio import Minio
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import legal, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PORT = int(os.getenv("PORT", "8935"))
DEFAULT_OUTPUT_FILE = "anganwadi_full_merit_list.pdf"
PAGE_MARGIN_MM = 6
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(BASE_DIR, "fonts")
FONT_REGULAR_NAME = "AnganwadiUnicode"
FONT_BOLD_NAME = "AnganwadiUnicode-Bold"
FALLBACK_FONT_REGULAR = "Helvetica"
FALLBACK_FONT_BOLD = "Helvetica-Bold"
NOTO_DEVANAGARI_REGULAR_URL = (
    "https://github.com/googlefonts/noto-fonts/raw/main/"
    "hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf"
)
NOTO_DEVANAGARI_BOLD_URL = (
    "https://github.com/googlefonts/noto-fonts/raw/main/"
    "hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf"
)

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:8131")
MINIO_PUBLIC_ACCESS_KEY = os.getenv("MINIO_PUBLIC_ACCESS_KEY", "public-bucket-user")
MINIO_PUBLIC_SECRET_KEY = os.getenv("MINIO_PUBLIC_SECRET_KEY", "U0h9SNNps5FxOYdWBE4y")
MINIO_PUBLIC_BUCKET_NAME = os.getenv("MINIO_PUBLIC_BUCKET_NAME", "public-bucket")
MINIO_USE_SSL = os.getenv("MINIO_USE_SSL", "false").lower() == "true"

GROUP_HEADER_BG = colors.white
HEADER_BG = colors.white
BORDER = colors.black
TOTAL_COLUMN_BG = colors.HexColor("#fce4d6")
REGISTERED_FONT_REGULAR = FALLBACK_FONT_REGULAR
REGISTERED_FONT_BOLD = FALLBACK_FONT_BOLD
DEVANAGARI_RE = re.compile(r"([\u0900-\u097F]+)")


def download_font_if_missing(font_path, url):
    if os.path.exists(font_path):
        return font_path

    os.makedirs(os.path.dirname(font_path), exist_ok=True)
    urlretrieve(url, font_path)
    return font_path


def resolve_font_path(env_name, local_file_name, download_url):
    configured_path = os.getenv(env_name)
    if configured_path and os.path.exists(configured_path):
        return configured_path

    local_path = os.path.join(FONT_DIR, local_file_name)
    if os.path.exists(local_path):
        return local_path

    try:
        return download_font_if_missing(local_path, download_url)
    except Exception:
        return ""


def register_unicode_fonts():
    global REGISTERED_FONT_REGULAR, REGISTERED_FONT_BOLD

    regular_path = resolve_font_path(
        "PDF_FONT_REGULAR_PATH",
        "NotoSansDevanagari-Regular.ttf",
        NOTO_DEVANAGARI_REGULAR_URL,
    )
    bold_path = resolve_font_path(
        "PDF_FONT_BOLD_PATH",
        "NotoSansDevanagari-Bold.ttf",
        NOTO_DEVANAGARI_BOLD_URL,
    )

    try:
        if regular_path:
            pdfmetrics.registerFont(TTFont(FONT_REGULAR_NAME, regular_path))
            REGISTERED_FONT_REGULAR = FONT_REGULAR_NAME

        if bold_path:
            pdfmetrics.registerFont(TTFont(FONT_BOLD_NAME, bold_path))
            REGISTERED_FONT_BOLD = FONT_BOLD_NAME
        elif regular_path:
            REGISTERED_FONT_BOLD = FONT_REGULAR_NAME
    except Exception:
        traceback.print_exc()
        REGISTERED_FONT_REGULAR = FALLBACK_FONT_REGULAR
        REGISTERED_FONT_BOLD = FALLBACK_FONT_BOLD


def rich_text(value, bold=False):
    text = str(value if value is not None else "")
    font_name = REGISTERED_FONT_BOLD if bold else REGISTERED_FONT_REGULAR

    if font_name in (FALLBACK_FONT_REGULAR, FALLBACK_FONT_BOLD):
        return escape(text)

    parts = []
    last_index = 0
    for match in DEVANAGARI_RE.finditer(text):
        parts.append(escape(text[last_index:match.start()]))
        parts.append(f'<font name="{font_name}">{escape(match.group(0))}</font>')
        last_index = match.end()

    parts.append(escape(text[last_index:]))
    return "".join(parts)


def is_plain_object(value):
    return isinstance(value, dict)


def safe_object_name(file_name):
    raw_name = str(file_name or DEFAULT_OUTPUT_FILE).strip().lstrip("/")
    clean_segments = []

    for segment in raw_name.split("/"):
        clean_segment = re.sub(r"[^A-Za-z0-9._ -]", "_", segment.strip())
        if clean_segment:
            clean_segments.append(clean_segment)

    clean_name = "/".join(clean_segments) or DEFAULT_OUTPUT_FILE

    if not clean_name.lower().endswith(".pdf"):
        clean_name = f"{clean_name}.pdf"

    return clean_name


def get_minio_client():
    return Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_PUBLIC_ACCESS_KEY,
        secret_key=MINIO_PUBLIC_SECRET_KEY,
        secure=MINIO_USE_SSL,
    )


def upload_pdf_to_minio(object_name, pdf_bytes):
    client = get_minio_client()
    pdf_stream = BytesIO(pdf_bytes)

    client.put_object(
        MINIO_PUBLIC_BUCKET_NAME,
        object_name,
        pdf_stream,
        length=len(pdf_bytes),
        content_type="application/pdf",
    )


def paragraph(text, size=5, bold=False, align=TA_CENTER):
    return Paragraph(
        rich_text(text, bold=bold),
        ParagraphStyle(
            name=f"cell-{size}-{bold}-{align}",
            fontSize=size,
            leading=size + 1.8,
            alignment=align,
            fontName=FALLBACK_FONT_BOLD if bold else FALLBACK_FONT_REGULAR,
            wordWrap="CJK",
        ),
    )


def title_paragraph(text, size=8, bold=True, align=TA_CENTER):
    return Paragraph(
        rich_text(text, bold=bold),
        ParagraphStyle(
            name=f"title-{size}-{bold}-{align}",
            fontSize=size,
            leading=size + 3,
            alignment=align,
            fontName=FALLBACK_FONT_BOLD if bold else FALLBACK_FONT_REGULAR,
        ),
    )


def collect_columns(rows):
    """
    Preserve API key order while expanding nested objects into grouped columns.
    Output items:
        {"key": "A.No.", "label": "A.No.", "children": None}
        {"key": "Educational...", "label": "Educational...", "children": ["Class XII", ...]}
    """
    columns = []
    column_index = {}

    for row in rows:
        for key, value in (row or {}).items():
            if is_plain_object(value):
                if key not in column_index:
                    column_index[key] = len(columns)
                    columns.append({"key": key, "label": key, "children": []})

                children = columns[column_index[key]]["children"]
                for child_key in value.keys():
                    if child_key not in children:
                        children.append(child_key)
            elif key not in column_index:
                column_index[key] = len(columns)
                columns.append({"key": key, "label": key, "children": None})

    return columns


def flatten_columns(columns):
    flat = []
    for column in columns:
        if column["children"]:
            for child in column["children"]:
                flat.append({
                    "group": column["key"],
                    "key": child,
                    "label": child,
                    "source": "nested",
                })
        else:
            flat.append({
                "group": None,
                "key": column["key"],
                "label": column["label"],
                "source": "plain",
            })
    return flat


def manual_column_width(column, manual_widths, column_number):
    if not manual_widths:
        return None

    lookup_keys = [
        column_number,
        str(column_number),
        column["key"],
        column["label"],
    ]

    if column["group"]:
        lookup_keys.extend([
            f"{column['group']}.{column['key']}",
            f"{column['group']}.{column['label']}",
        ])

    for key in lookup_keys:
        if key in manual_widths:
            try:
                width = float(manual_widths[key])
                return width if width > 0 else None
            except (TypeError, ValueError):
                return None

    return None


def estimate_column_width(column, manual_widths=None, column_number=None):
    fixed_width = manual_column_width(column, manual_widths, column_number)
    if fixed_width is not None:
        return fixed_width

    label = column["label"]
    lower_label = label.lower()

    if "candidate" in lower_label and "name" in lower_label:
        return 21
    if lower_label in ("remarks", "remark"):
        return 18
    if "eligible" in lower_label:
        return 11
    if "total marks" in lower_label:
        return 13
    if "village" in lower_label:
        return 12
    if "rank" in lower_label:
        return 6
    if "a.no" in lower_label or lower_label in ("s.no.", "s.no"):
        return 6
    if "age" in lower_label:
        return 8
    if lower_label in ("caste", "d-ed", "b-ed", "mscit"):
        return 7

    return min(max(len(label) * 0.9, 7), 14)


def column_widths(flat_columns, usable_width, manual_widths=None):
    raw_widths = [
        estimate_column_width(column, manual_widths, index + 1)
        for index, column in enumerate(flat_columns)
    ]
    total = sum(raw_widths) or 1
    return [(width / total) * usable_width for width in raw_widths]


def build_table_header(columns):
    flat_columns = flatten_columns(columns)
    group_row = []
    label_row = []
    number_row = []
    spans = []
    col_index = 0

    for column in columns:
        children = column["children"]

        if children:
            start_col = col_index
            end_col = col_index + len(children) - 1
            group_row.append(paragraph(column["label"], size=4.5, bold=True))

            for offset, child in enumerate(children):
                if offset > 0:
                    group_row.append(paragraph(""))
                label_row.append(paragraph(child, size=4.2, bold=True))
                number_row.append(paragraph(str(col_index + offset + 1), size=4.2, bold=True))

            spans.append(("SPAN", (start_col, 0), (end_col, 0)))
            col_index += len(children)
        else:
            group_row.append(paragraph(column["label"], size=4.2, bold=True))
            label_row.append(paragraph(""))
            number_row.append(paragraph(str(col_index + 1), size=4.2, bold=True))
            spans.append(("SPAN", (col_index, 0), (col_index, 1)))
            col_index += 1

    return [group_row, label_row, number_row], spans, flat_columns


def row_value(row, column):
    if column["source"] == "nested":
        group_value = row.get(column["group"], {})
        if is_plain_object(group_value):
            return group_value.get(column["key"], "")
        return ""

    return row.get(column["key"], "")


def build_data_rows(rows, flat_columns):
    return [
        [paragraph(row_value(row, column), size=4.8) for column in flat_columns]
        for row in rows
    ]


def build_table_style(header_row_count, data_row_count, spans, flat_columns):
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, 0), GROUP_HEADER_BG),
        ("BACKGROUND", (0, 1), (-1, header_row_count - 1), HEADER_BG),
        ("FONTNAME", (0, 0), (-1, header_row_count - 1), "Helvetica-Bold"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING", (0, 0), (-1, -1), 1),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1),
    ]
    commands.extend(spans)

    for index, column in enumerate(flat_columns):
        label = column["label"].lower()
        normalized_label = re.sub(r"\s+", " ", label)
        is_total_column = (
            "total marks" in normalized_label
            or "18" in normalized_label and "23" in normalized_label
            or "25" in normalized_label and "27" in normalized_label
            or "24" in normalized_label and "28" in normalized_label
        )

        if is_total_column:
            commands.append(("BACKGROUND", (index, header_row_count), (index, -1), TOTAL_COLUMN_BG))

    return TableStyle(commands)


def chunks(values, size):
    if not values:
        return [[]]

    return [values[index:index + size] for index in range(0, len(values), size)]


def build_header_flow(header_lines):
    flow = []
    for line in header_lines or []:
        flow.append(title_paragraph(line, size=8, bold=True, align=TA_CENTER))
        flow.append(Spacer(1, 1 * mm))
    return flow


def build_footer_flow(footer_lines):
    flow = []
    if footer_lines:
        flow.append(Spacer(1, 3 * mm))

    for line in footer_lines:
        flow.append(title_paragraph(line, size=6, bold=False, align=TA_LEFT))
        flow.append(Spacer(1, 1 * mm))
    return flow


def build_merit_list_flow(merit_list, usable_width, default_manual_widths=None):
    village = merit_list.get("village") or ""
    header_lines = merit_list.get("header") or []
    footer_lines = merit_list.get("footer") or []
    rows = merit_list.get("rows") or []
    manual_widths = (
        merit_list.get("columnWidth")
        or merit_list.get("columnWidths")
        or merit_list.get("column_widths")
        or default_manual_widths
        or {}
    )
    rows_per_page = int(merit_list.get("maxRowPerPage") or 10)
    rows_per_page = max(rows_per_page, 1)

    columns = collect_columns(rows)
    if not columns:
        columns = [{"key": "A.No.", "label": "A.No.", "children": None}]

    table_header, spans, flat_columns = build_table_header(columns)
    widths = column_widths(flat_columns, usable_width, manual_widths)
    data_rows = build_data_rows(rows, flat_columns)
    paged_rows = chunks(data_rows, rows_per_page)

    flow = []
    header_row_count = len(table_header)

    for page_index, page_rows in enumerate(paged_rows):
        is_first_page = page_index == 0
        is_last_page = page_index == len(paged_rows) - 1

        if page_index > 0:
            flow.append(PageBreak())

        if is_first_page:
            flow.extend(build_header_flow(header_lines))

        flow.append(title_paragraph(f"{village}", size=7.5, bold=True, align=TA_LEFT))
        flow.append(Spacer(1, 1 * mm))

        table_data = table_header + page_rows
        table = Table(table_data, colWidths=widths, repeatRows=header_row_count)
        table.setStyle(build_table_style(header_row_count, len(page_rows), spans, flat_columns))
        flow.append(table)

        if is_last_page:
            flow.extend(build_footer_flow(footer_lines))

    return flow


def generate_pdf(payload):
    object_name = safe_object_name(payload.get("output_file_name"))
    merit_lists = payload.get("meritList") or []
    default_manual_widths = (
        payload.get("columnWidth")
        or payload.get("columnWidths")
        or payload.get("column_widths")
        or {}
    )

    if not isinstance(merit_lists, list) or not merit_lists:
        raise ValueError("meritList must be a non-empty array")

    page_width, _ = landscape(legal)
    margin = PAGE_MARGIN_MM * mm
    usable_width = page_width - (2 * margin)

    story = []
    for index, merit_list in enumerate(merit_lists):
        if index > 0:
            story.append(PageBreak())

        story.extend(build_merit_list_flow(merit_list or {}, usable_width, default_manual_widths))

    pdf_buffer = BytesIO()
    document = SimpleDocTemplate(
        pdf_buffer,
        pagesize=landscape(legal),
        leftMargin=margin,
        rightMargin=margin,
        topMargin=margin,
        bottomMargin=margin,
    )
    document.build(story)
    upload_pdf_to_minio(object_name, pdf_buffer.getvalue())
    return object_name


app = Flask(__name__)
register_unicode_fonts()


@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"success": True})


@app.route("/", methods=["POST"])
def generate():
    try:
        payload = request.get_json(force=True)
        generate_pdf(payload)
        return jsonify({"success": True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
