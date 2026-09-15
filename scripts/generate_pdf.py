#!/usr/bin/env python3
"""
Talk2Me AI - Markdown to PDF Executive Generator
Renders README.md into a high-fidelity, publication-quality vector PDF document.
Uses pycairo directly for native vector text, shapes, and layout.
"""

import os
import sys
import re
import cairo

PAGE_WIDTH = 595.28   # A4 Width (pt)
PAGE_HEIGHT = 841.89  # A4 Height (pt)
MARGIN_LEFT = 42.0
MARGIN_RIGHT = 42.0
MARGIN_TOP = 48.0
MARGIN_BOTTOM = 46.0
CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

# Palette
COLOR_BG = (1.0, 1.0, 1.0)
COLOR_TEXT_PRIMARY = (0.06, 0.09, 0.16)    # Slate 900 #0F172A
COLOR_TEXT_SECONDARY = (0.20, 0.25, 0.33)  # Slate 700 #334155
COLOR_TEXT_MUTED = (0.42, 0.48, 0.58)      # Slate 500 #64748B
COLOR_PRIMARY = (0.14, 0.39, 0.92)         # Blue 600 #2563EB
COLOR_PRIMARY_DARK = (0.10, 0.22, 0.55)    # Blue 900 #1E3A8A
COLOR_ACCENT = (0.02, 0.71, 0.83)          # Cyan 500 #06B6D4
COLOR_CODE_BG = (0.06, 0.09, 0.16)         # Dark slate #0F172A
COLOR_CODE_TEXT = (0.89, 0.91, 0.94)       # Light slate #E2E8F0
COLOR_CALLOUT_BG = (0.94, 0.96, 1.0)       # Blue 50 #EFF6FF
COLOR_CALLOUT_BORDER = (0.23, 0.51, 0.96)   # Blue 500 #3B82F6
COLOR_BORDER = (0.88, 0.91, 0.94)          # Slate 200 #E2E8F0
COLOR_TABLE_HEADER = (0.12, 0.16, 0.23)    # Slate 800 #1E293B
COLOR_TABLE_ALT = (0.97, 0.98, 0.99)       # Slate 50 #F8FAFC


def set_color(cr, rgb, alpha=1.0):
    if len(rgb) == 3:
        cr.set_source_rgba(rgb[0], rgb[1], rgb[2], alpha)
    else:
        cr.set_source_rgba(rgb[0], rgb[1], rgb[2], rgb[3])


def clean_text_emojis(text):
    """Strips emoji characters and backticks that lack vector font glyphs or look messy in titles."""
    clean = re.sub(r'[\U00010000-\U0010ffff]', '', text)
    clean = re.sub(r'[\u2600-\u27ff\u2300-\u23ff\u2b50\u200d\ufe0f]', '', clean)
    clean = clean.replace('`', '')
    return clean.strip()


def draw_rounded_rect(cr, x, y, w, h, r):
    """Draws a path for a rectangle with rounded corners."""
    cr.new_path()
    cr.arc(x + w - r, y + r, r, -1.5707963267948966, 0)
    cr.arc(x + w - r, y + h - r, r, 0, 1.5707963267948966)
    cr.arc(x + r, y + h - r, r, 1.5707963267948966, 3.141592653589793)
    cr.arc(x + r, y + r, r, 3.141592653589793, 4.71238898038469)
    cr.close_path()


class PDFDocument:
    def __init__(self, filename):
        self.filename = filename
        self.surface = cairo.PDFSurface(filename, PAGE_WIDTH, PAGE_HEIGHT)
        self.cr = cairo.Context(self.surface)
        self.page_number = 1
        self.total_pages = 1
        self.y = MARGIN_TOP
        self.is_dry_run = False

    def new_page(self):
        if not self.is_dry_run:
            self._draw_header_footer()
            self.surface.show_page()
        self.page_number += 1
        self.y = MARGIN_TOP

    def check_page_break(self, height_needed):
        """If element doesn't fit on current page, advance to next page."""
        if self.y + height_needed > PAGE_HEIGHT - MARGIN_BOTTOM:
            self.new_page()

    def _draw_header_footer(self):
        cr = self.cr
        cr.new_path()
        # Running Header (pages >= 2)
        if self.page_number > 1:
            cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
            cr.set_font_size(8)
            set_color(cr, COLOR_TEXT_MUTED)
            cr.move_to(MARGIN_LEFT, 26)
            cr.show_text("Talk2Me AI — System Specification & Technical Overview")

            set_color(cr, COLOR_BORDER)
            cr.set_line_width(0.6)
            cr.move_to(MARGIN_LEFT, 32)
            cr.line_to(PAGE_WIDTH - MARGIN_RIGHT, 32)
            cr.stroke()
            cr.new_path()

        # Running Footer (all pages)
        cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
        cr.set_font_size(8)
        set_color(cr, COLOR_TEXT_MUTED)

        # Left footer
        cr.move_to(MARGIN_LEFT, PAGE_HEIGHT - 22)
        cr.show_text("TechVerge Africa • Talk2Me AI Proprietary Platform Specification")

        # Right footer
        page_str = f"Page {self.page_number} of {self.total_pages}"
        ext = cr.text_extents(page_str)
        cr.move_to(PAGE_WIDTH - MARGIN_RIGHT - ext.width, PAGE_HEIGHT - 22)
        cr.show_text(page_str)

        # Hairline rule above footer
        set_color(cr, COLOR_BORDER)
        cr.set_line_width(0.6)
        cr.move_to(MARGIN_LEFT, PAGE_HEIGHT - 32)
        cr.line_to(PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 32)
        cr.stroke()
        cr.new_path()

    def finish(self):
        if not self.is_dry_run:
            self._draw_header_footer()
            self.surface.show_page()
            self.surface.finish()


def parse_spans(text):
    """Parses markdown inline spans into a list of (token_text, style).
       Handles bold code: **`code`**, **bold**, `code`, *italic*
    """
    # Normalize nested markdown like **`item`** into bold code
    pattern = re.compile(r'(\*\*(?:`[^`]+`|[^*])+\*\*|`[^`]+`|\*[^*]+\*)')
    tokens = []
    parts = pattern.split(text)
    for p in parts:
        if not p:
            continue
        if p.startswith('**') and p.endswith('**') and len(p) >= 4:
            inner = p[2:-2]
            if inner.startswith('`') and inner.endswith('`') and len(inner) >= 2:
                tokens.append((inner[1:-1], 'bold_code'))
            else:
                # Strip inner backticks if any
                inner_clean = inner.replace('`', '')
                tokens.append((inner_clean, 'bold'))
        elif p.startswith('`') and p.endswith('`') and len(p) >= 2:
            tokens.append((p[1:-1], 'code'))
        elif p.startswith('*') and p.endswith('*') and len(p) >= 2:
            tokens.append((p[1:-1], 'italic'))
        else:
            tokens.append((p, 'normal'))
    return tokens


def wrap_spans(cr, spans, max_width, font_size=9.5):
    """Word-wraps inline styled spans within max_width."""
    lines = []
    current_line = []
    current_line_width = 0.0

    for text, style in spans:
        if style in ('bold', 'bold_code'):
            cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        elif style == 'italic':
            cr.select_font_face("Sans", cairo.FONT_SLANT_ITALIC, cairo.FONT_WEIGHT_NORMAL)
        elif style == 'code':
            cr.select_font_face("Monospace", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
        else:
            cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
        cr.set_font_size(font_size)

        words = re.findall(r'\S+|\s+', text)
        for w in words:
            ext = cr.text_extents(w)
            w_width = ext.x_advance

            if current_line_width + w_width > max_width and current_line and not w.isspace():
                lines.append(current_line)
                current_line = []
                current_line_width = 0.0

            if not (not current_line and w.isspace()):
                current_line.append((w, style, w_width))
                current_line_width += w_width

    if current_line:
        lines.append(current_line)
    return lines


def render_wrapped_lines(doc, lines, x, line_height=14.0, font_size=9.5):
    cr = doc.cr
    for line in lines:
        doc.check_page_break(line_height)
        cur_x = x
        for w, style, w_width in line:
            if not doc.is_dry_run:
                if style == 'bold':
                    cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
                    set_color(cr, COLOR_TEXT_PRIMARY)
                elif style == 'bold_code':
                    cr.select_font_face("Monospace", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
                    draw_rounded_rect(cr, cur_x - 1, doc.y - line_height + 3, w_width + 2, line_height - 2, 2)
                    set_color(cr, (0.91, 0.94, 0.98))
                    cr.fill()
                    cr.new_path()
                    set_color(cr, COLOR_PRIMARY_DARK)
                elif style == 'italic':
                    cr.select_font_face("Sans", cairo.FONT_SLANT_ITALIC, cairo.FONT_WEIGHT_NORMAL)
                    set_color(cr, COLOR_TEXT_SECONDARY)
                elif style == 'code':
                    cr.select_font_face("Monospace", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
                    draw_rounded_rect(cr, cur_x - 1, doc.y - line_height + 3, w_width + 2, line_height - 2, 2)
                    set_color(cr, (0.93, 0.95, 0.98))
                    cr.fill()
                    cr.new_path()
                    set_color(cr, COLOR_PRIMARY_DARK)
                else:
                    cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
                    set_color(cr, COLOR_TEXT_SECONDARY)

                cr.set_font_size(font_size)
                cr.move_to(cur_x, doc.y)
                cr.show_text(w)
            cur_x += w_width
        doc.y += line_height


def render_markdown_to_pdf(readme_path, output_pdf_path):
    with open(readme_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    raw_lines = md_content.splitlines()

    def run_pass(is_dry_run, total_pages=1):
        doc = PDFDocument(output_pdf_path)
        doc.is_dry_run = is_dry_run
        doc.total_pages = total_pages
        cr = doc.cr

        in_code_block = False
        code_block_lines = []
        code_lang = ""

        in_table = False
        table_rows = []

        i = 0
        n = len(raw_lines)

        while i < n:
            line = raw_lines[i]
            stripped = line.strip()

            # Handle Code Blocks
            if stripped.startswith("```"):
                if in_code_block:
                    render_code_block(doc, code_block_lines, code_lang)
                    code_block_lines = []
                    in_code_block = False
                else:
                    in_code_block = True
                    code_lang = stripped[3:].strip()
                i += 1
                continue

            if in_code_block:
                code_block_lines.append(line)
                i += 1
                continue

            # Handle Tables
            if stripped.startswith("|") and stripped.endswith("|"):
                table_rows.append(stripped)
                in_table = True
                i += 1
                continue
            elif in_table:
                render_table(doc, table_rows)
                table_rows = []
                in_table = False

            # Skip badge lines
            if stripped.startswith("[![") or (stripped.startswith("[") and "shields.io" in stripped):
                i += 1
                continue

            # Horizontal Rule
            if stripped in ("---", "***", "___"):
                doc.check_page_break(18)
                if not doc.is_dry_run:
                    cr.new_path()
                    set_color(cr, COLOR_BORDER)
                    cr.set_line_width(0.8)
                    cr.move_to(MARGIN_LEFT, doc.y + 8)
                    cr.line_to(PAGE_WIDTH - MARGIN_RIGHT, doc.y + 8)
                    cr.stroke()
                    cr.new_path()
                doc.y += 18
                i += 1
                continue

            # H1: Title Banner
            if stripped.startswith("# ") and not stripped.startswith("## "):
                title_text = clean_text_emojis(stripped[2:])
                render_title_banner(doc, title_text)
                i += 1
                continue

            # Blockquote
            if stripped.startswith("> "):
                bq_text = stripped[2:].strip()
                render_callout(doc, bq_text)
                i += 1
                continue

            # H2 Heading
            if stripped.startswith("## "):
                h2_text = clean_text_emojis(stripped[3:])
                render_h2(doc, h2_text)
                i += 1
                continue

            # H3 Heading
            if stripped.startswith("### "):
                h3_text = clean_text_emojis(stripped[4:])
                render_h3(doc, h3_text)
                i += 1
                continue

            # Unordered / Ordered List Item
            if re.match(r'^\s*[-*]\s+', line) or re.match(r'^\s*\d+\.\s+', line):
                render_list_item(doc, line)
                i += 1
                continue

            # Regular Paragraph
            if stripped:
                render_paragraph(doc, stripped)
                i += 1
                continue

            # Vertical Spacing
            doc.y += 5
            i += 1

        if in_table and table_rows:
            render_table(doc, table_rows)

        doc.finish()
        return doc.page_number

    total_pages = run_pass(is_dry_run=True, total_pages=1)
    print(f"Total calculated pages: {total_pages}")
    run_pass(is_dry_run=False, total_pages=total_pages)
    print(f"Rendered vector PDF: {output_pdf_path}")


def render_title_banner(doc, title):
    cr = doc.cr
    banner_height = 76
    doc.check_page_break(banner_height + 15)

    if not doc.is_dry_run:
        cr.new_path()
        draw_rounded_rect(cr, MARGIN_LEFT, doc.y, CONTENT_WIDTH, banner_height, 6)
        set_color(cr, (0.05, 0.08, 0.16)) # #0D1424
        cr.fill()

        draw_rounded_rect(cr, MARGIN_LEFT, doc.y, CONTENT_WIDTH, banner_height, 6)
        set_color(cr, (0.15, 0.25, 0.45))
        cr.set_line_width(1.0)
        cr.stroke()

        # Cyan indicator
        draw_rounded_rect(cr, MARGIN_LEFT + 4, doc.y + 12, 3.5, banner_height - 24, 1.5)
        set_color(cr, (0.14, 0.65, 0.98))
        cr.fill()
        cr.new_path()

        # Title
        cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        cr.set_font_size(21)
        set_color(cr, (1.0, 1.0, 1.0))
        cr.move_to(MARGIN_LEFT + 18, doc.y + 28)
        cr.show_text(title)

        # Subtitle
        cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
        cr.set_font_size(9.0)
        set_color(cr, (0.75, 0.82, 0.92))
        cr.move_to(MARGIN_LEFT + 18, doc.y + 45)
        cr.show_text("Inclusive Real-Time WebRTC Collaboration Platform • African Dialect Multimodal AI")

        # Badges line
        badges = ["Next.js 16", "LiveKit SFU", "Groq Whisper LPU", "Gemini 2.5 Flash", "Supabase PostgreSQL", "WCAG AAA"]
        badge_x = MARGIN_LEFT + 18
        badge_y = doc.y + 55
        cr.set_font_size(7.0)
        cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)

        for b in badges:
            ext = cr.text_extents(b)
            bw = ext.width + 8
            draw_rounded_rect(cr, badge_x, badge_y, bw, 12, 3)
            set_color(cr, (0.12, 0.20, 0.35))
            cr.fill()
            cr.new_path()

            set_color(cr, (0.35, 0.75, 0.98))
            cr.move_to(badge_x + 4, badge_y + 8.5)
            cr.show_text(b)
            badge_x += bw + 5

    doc.y += banner_height + 14


def render_callout(doc, text):
    cr = doc.cr
    clean_text = text.replace("**", "")
    spans = parse_spans(clean_text)
    lines = wrap_spans(cr, spans, CONTENT_WIDTH - 28, font_size=9.2)
    box_height = len(lines) * 13.5 + 14

    doc.check_page_break(box_height + 6)

    if not doc.is_dry_run:
        cr.new_path()
        draw_rounded_rect(cr, MARGIN_LEFT, doc.y, CONTENT_WIDTH, box_height, 4)
        set_color(cr, COLOR_CALLOUT_BG)
        cr.fill()

        draw_rounded_rect(cr, MARGIN_LEFT, doc.y, 4, box_height, 2)
        set_color(cr, COLOR_CALLOUT_BORDER)
        cr.fill()
        cr.new_path()

    start_y = doc.y + 12
    doc.y = start_y
    render_wrapped_lines(doc, lines, MARGIN_LEFT + 14, line_height=13.5, font_size=9.2)
    doc.y += 8


def render_h2(doc, text):
    cr = doc.cr
    doc.check_page_break(75)

    doc.y += 10
    if not doc.is_dry_run:
        cr.new_path()
        draw_rounded_rect(cr, MARGIN_LEFT, doc.y - 12, 3.5, 15, 1.5)
        set_color(cr, COLOR_PRIMARY)
        cr.fill()
        cr.new_path()

        cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        cr.set_font_size(13.0)
        set_color(cr, COLOR_PRIMARY_DARK)
        cr.move_to(MARGIN_LEFT + 10, doc.y)
        cr.show_text(text)

        set_color(cr, (0.85, 0.90, 0.96))
        cr.set_line_width(0.8)
        cr.move_to(MARGIN_LEFT + 10, doc.y + 4)
        cr.line_to(PAGE_WIDTH - MARGIN_RIGHT, doc.y + 4)
        cr.stroke()
        cr.new_path()

    doc.y += 14


def render_h3(doc, text):
    cr = doc.cr
    doc.check_page_break(50)

    doc.y += 6
    if not doc.is_dry_run:
        cr.new_path()
        cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        cr.set_font_size(10.5)
        set_color(cr, (0.10, 0.18, 0.32))
        cr.move_to(MARGIN_LEFT, doc.y)
        cr.show_text(text)
        cr.new_path()

    doc.y += 11


def render_paragraph(doc, text):
    cr = doc.cr
    spans = parse_spans(text)
    lines = wrap_spans(cr, spans, CONTENT_WIDTH, font_size=9.0)
    render_wrapped_lines(doc, lines, MARGIN_LEFT, line_height=13.0, font_size=9.0)
    doc.y += 4


def render_list_item(doc, line):
    cr = doc.cr
    indent_level = len(line) - len(line.lstrip())
    is_sub = indent_level >= 2

    clean_content = re.sub(r'^\s*[-*]\s+|\s*\d+\.\s+', '', line)
    spans = parse_spans(clean_content)

    bullet_x = MARGIN_LEFT + (18 if is_sub else 6)
    text_x = bullet_x + 10
    max_w = CONTENT_WIDTH - (text_x - MARGIN_LEFT)

    lines = wrap_spans(cr, spans, max_w, font_size=8.8)
    line_h = 12.8

    doc.check_page_break(len(lines) * line_h + 3)

    if not doc.is_dry_run:
        cr.new_path()
        set_color(cr, COLOR_PRIMARY)
        if is_sub:
            cr.new_sub_path()
            cr.arc(bullet_x + 2, doc.y - 4, 1.6, 0, 6.283185307179586)
            cr.set_line_width(0.8)
            cr.stroke()
            cr.new_path()
        else:
            cr.new_sub_path()
            cr.arc(bullet_x + 2, doc.y - 4, 2.0, 0, 6.283185307179586)
            cr.fill()
            cr.new_path()

    render_wrapped_lines(doc, lines, text_x, line_height=line_h, font_size=8.8)
    doc.y += 2


def render_code_block(doc, lines, lang=""):
    cr = doc.cr
    font_size = 7.0 if len(lines) > 20 or any(len(l) > 65 for l in lines) else 7.5
    line_h = font_size * 1.55
    padding = 7
    block_h = len(lines) * line_h + padding * 2

    doc.check_page_break(min(block_h + 8, 200))

    chunk = []
    for l in lines:
        chunk.append(l)
        if doc.y + len(chunk) * line_h + padding * 2 > PAGE_HEIGHT - MARGIN_BOTTOM:
            _draw_code_chunk(doc, chunk, lang, font_size, line_h, padding)
            chunk = []
            doc.new_page()

    if chunk:
        _draw_code_chunk(doc, chunk, lang, font_size, line_h, padding)
        doc.y += 8


def _draw_code_chunk(doc, lines, lang, font_size, line_h, padding):
    cr = doc.cr
    chunk_h = len(lines) * line_h + padding * 2

    if not doc.is_dry_run:
        cr.new_path()
        draw_rounded_rect(cr, MARGIN_LEFT, doc.y, CONTENT_WIDTH, chunk_h, 4)
        set_color(cr, COLOR_CODE_BG)
        cr.fill()

        draw_rounded_rect(cr, MARGIN_LEFT, doc.y, CONTENT_WIDTH, chunk_h, 4)
        set_color(cr, (0.20, 0.25, 0.35))
        cr.set_line_width(0.8)
        cr.stroke()
        cr.new_path()

        cr.select_font_face("Monospace", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
        cr.set_font_size(font_size)

        y_cursor = doc.y + padding + font_size + 1
        for l in lines:
            if l.strip().startswith("#") or l.strip().startswith("//"):
                set_color(cr, (0.45, 0.55, 0.65))
            elif any(sym in l for sym in ("•", "───", "│", "┌", "▼", "└", "├", "┐", "┘")):
                set_color(cr, (0.25, 0.75, 0.95))
            elif any(kw in l for kw in ("POST", "GET", "true", "false", "npm", "git", "export")):
                set_color(cr, (0.95, 0.65, 0.25))
            else:
                set_color(cr, COLOR_CODE_TEXT)

            cr.move_to(MARGIN_LEFT + padding, y_cursor)
            cr.show_text(l[:100])
            y_cursor += line_h

    doc.y += chunk_h


def render_table(doc, raw_rows):
    cr = doc.cr
    if len(raw_rows) < 2:
        return

    rows = []
    for r in raw_rows:
        parts = [c.strip() for c in r.split("|")]
        if len(parts) >= 3:
            if parts[0] == "":
                parts = parts[1:]
            if parts and parts[-1] == "":
                parts = parts[:-1]
            rows.append(parts)

    if not rows:
        return

    header_row = rows[0]
    data_rows = []
    for r in rows[1:]:
        if all(re.match(r'^:?-+:?$', c) for c in r):
            continue
        data_rows.append(r)

    num_cols = len(header_row)
    if num_cols == 0:
        return

    if num_cols == 5:
        col_widths = [CONTENT_WIDTH * 0.10, CONTENT_WIDTH * 0.28, CONTENT_WIDTH * 0.26, CONTENT_WIDTH * 0.20, CONTENT_WIDTH * 0.16]
    elif num_cols == 4:
        col_widths = [CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.33, CONTENT_WIDTH * 0.30]
    else:
        eq_w = CONTENT_WIDTH / num_cols
        col_widths = [eq_w] * num_cols

    header_h = 22.0
    doc.check_page_break(header_h + 30)

    def draw_header_bar():
        if not doc.is_dry_run:
            cr.new_path()
            draw_rounded_rect(cr, MARGIN_LEFT, doc.y, CONTENT_WIDTH, header_h, 3)
            set_color(cr, COLOR_TABLE_HEADER)
            cr.fill()
            cr.new_path()

            cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
            cr.set_font_size(7.8)
            set_color(cr, (1.0, 1.0, 1.0))

            cx = MARGIN_LEFT
            for ci, col in enumerate(header_row):
                cw = col_widths[ci] if ci < len(col_widths) else 50
                cr.move_to(cx + 6, doc.y + 14)
                cr.show_text(col[:30])
                cx += cw

        doc.y += header_h

    draw_header_bar()

    row_idx = 0
    for row in data_rows:
        wrapped_cells = []
        max_lines_in_row = 1
        for ci, cell in enumerate(row):
            cw = col_widths[ci] if ci < len(col_widths) else 50
            clean_cell = cell.replace("`", "")
            spans = parse_spans(clean_cell)
            w_lines = wrap_spans(cr, spans, cw - 10, font_size=7.5)
            if not w_lines:
                w_lines = [[("", "normal", 0)]]
            wrapped_cells.append(w_lines)
            if len(w_lines) > max_lines_in_row:
                max_lines_in_row = len(w_lines)

        row_h = max_lines_in_row * 11.2 + 8
        if doc.y + row_h > PAGE_HEIGHT - MARGIN_BOTTOM:
            doc.new_page()
            draw_header_bar()

        if not doc.is_dry_run:
            cr.new_path()
            bg_col = COLOR_TABLE_ALT if (row_idx % 2 == 1) else (1.0, 1.0, 1.0)
            cr.rectangle(MARGIN_LEFT, doc.y, CONTENT_WIDTH, row_h)
            set_color(cr, bg_col)
            cr.fill()

            set_color(cr, COLOR_BORDER)
            cr.set_line_width(0.5)
            cr.move_to(MARGIN_LEFT, doc.y + row_h)
            cr.line_to(PAGE_WIDTH - MARGIN_RIGHT, doc.y + row_h)
            cr.stroke()
            cr.new_path()

            cx = MARGIN_LEFT
            for ci, w_lines in enumerate(wrapped_cells):
                cw = col_widths[ci] if ci < len(col_widths) else 50
                cell_y = doc.y + 9.5
                for line in w_lines:
                    cur_x = cx + 5
                    for w, style, w_w in line:
                        if style in ('bold', 'bold_code'):
                            cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
                            set_color(cr, COLOR_TEXT_PRIMARY)
                        elif style == 'code':
                            cr.select_font_face("Monospace", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
                            set_color(cr, COLOR_PRIMARY_DARK)
                        else:
                            cr.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
                            set_color(cr, COLOR_TEXT_SECONDARY)
                        cr.set_font_size(7.5)
                        cr.move_to(cur_x, cell_y)
                        cr.show_text(w)
                        cur_x += w_w
                    cell_y += 11.2
                cx += cw

        doc.y += row_h
        row_idx += 1

    doc.y += 8


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    readme_path = os.path.join(base_dir, "README.md")
    output_pdf_path = os.path.join(base_dir, "README.pdf")

    if not os.path.exists(readme_path):
        print(f"Error: {readme_path} does not exist.")
        sys.exit(1)

    print(f"Converting {readme_path} to {output_pdf_path}...")
    render_markdown_to_pdf(readme_path, output_pdf_path)

    branded_pdf_path = os.path.join(base_dir, "Talk2Me-AI-System-Overview.pdf")
    render_markdown_to_pdf(readme_path, branded_pdf_path)
    print("Done!")
