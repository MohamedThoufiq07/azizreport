import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls


def set_cell_background(cell, fill_hex):
    """Set background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)


def set_cell_margins(cell, top=80, bottom=80, left=100, right=100):
    """Set inner padding for table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)


def set_table_borders(table, color_hex="000000", sz="4", val="single"):
    """Set thin black borders around table cells matching reference photos."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'  <w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'  <w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'  <w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)


def add_thin_light_cyan_page_border(section):
    """
    Adds thin light sky blue double frame border matching reference photos 1 & 2.
    Positioned relative to page edge (offsetFrom="page") so border frames the entire page around header and footer.
    """
    sectPr = section._sectPr
    pgBorders = parse_xml(
        f'<w:pgBorders {nsdecls("w")} w:offsetFrom="page">'
        f'  <w:top w:val="double" w:sz="6" w:space="18" w:color="00AEEF"/>'
        f'  <w:left w:val="double" w:sz="6" w:space="18" w:color="00AEEF"/>'
        f'  <w:bottom w:val="double" w:sz="6" w:space="18" w:color="00AEEF"/>'
        f'  <w:right w:val="double" w:sz="6" w:space="18" w:color="00AEEF"/>'
        f'</w:pgBorders>'
    )
    sectPr.append(pgBorders)


def add_word_field(p, field_name):
    """
    Adds dynamic Word field (PAGE or NUMPAGES) with proper OpenXML fldChar structure.
    """
    run = p.add_run()
    r = run._r
    fldChar1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls('w'))
    instrText = parse_xml(r'<w:instrText %s xml:space="preserve"> %s </w:instrText>' % (nsdecls('w'), field_name))
    fldChar2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls('w'))
    rText = parse_xml(r'<w:r %s><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="19"/><w:szCs w:val="19"/><w:b/></w:rPr><w:t>1</w:t></w:r>' % nsdecls('w'))
    fldChar3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls('w'))
    
    r.append(fldChar1)
    r.append(instrText)
    r.append(fldChar2)
    r.append(rText)
    r.append(fldChar3)


def remove_table_borders(table):
    """Explicitly removes all borders from a table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="none"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:bottom w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideH w:val="none"/>'
        f'  <w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)


def add_blue_section_banner(doc, title_text, is_subtitle=False):
    """
    Adds soft blue section banner matching reference screenshots.
    Both main titles and subtitles align flush left on the page margin.
    """
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    remove_table_borders(table)

    cell = table.rows[0].cells[0]
    cell.width = Inches(7.17)
    set_cell_background(cell, "B4C6E7")
    set_cell_margins(cell, top=50, bottom=50, left=120, right=120)

    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run(title_text)
    run.font.name = "Calibri"
    run.font.size = Pt(11 if is_subtitle else 12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0, 0, 0)


def get_logo_paths():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.abspath(os.path.join(base_dir, '..', 'frontend', 'src', 'assets'))
    
    left_logo = os.path.join(assets_dir, 'report left side logo.png')
    right_logo = os.path.join(assets_dir, 'report right side logo.png')
    
    return left_logo if os.path.exists(left_logo) else None, right_logo if os.path.exists(right_logo) else None


def create_template_docx(output_path="template.docx"):
    doc = Document()
    
    # Page setup - Standard A4 with top margin 1.65 in to give clear gap below header table
    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(1.85)
    section.bottom_margin = Inches(0.50)
    section.left_margin = Inches(0.5)
    section.right_margin = Inches(0.5)
    section.header_distance = Inches(0.35)
    section.footer_distance = Inches(0.25)

    # ADD THIN LIGHT SKY BLUE DOUBLE PAGE FRAME BORDER (ALL 4 SIDES)
    add_thin_light_cyan_page_border(section)

    # ---------------- HEADER SETUP ----------------
    header = section.header
    header_table = header.add_table(rows=1, cols=3, width=Inches(7.17))
    header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    header_table.autofit = False
    
    set_table_borders(header_table, color_hex="000000", sz="4", val="single")

    c0, c1, c2 = header_table.rows[0].cells[0], header_table.rows[0].cells[1], header_table.rows[0].cells[2]
    c0.width = Inches(2.25)
    c1.width = Inches(3.52)
    c2.width = Inches(1.4)

    c0.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    c1.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    c2.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    set_cell_margins(c0, top=40, bottom=40, left=40, right=40)
    set_cell_margins(c1, top=40, bottom=40, left=40, right=40)
    set_cell_margins(c2, top=40, bottom=40, left=40, right=40)

    left_logo, right_logo = get_logo_paths()

    # Left Cell: DELTA STAR PNG Logo
    p0 = c0.paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if left_logo:
        p0.add_run().add_picture(left_logo, width=Inches(2.1))
    else:
        r_ds = p0.add_run("DELTA STAR\n")
        r_ds.font.name = "Arial Black"
        r_ds.font.size = Pt(12)
        r_ds.font.bold = True
        r_ds.font.color.rgb = RGBColor(192, 0, 0)
        r_ds_sub = p0.add_run("POWER PROJECTS SERVICES\nSOLE PROPRIETORSHIP - L.L.C.")
        r_ds_sub.font.name = "Calibri"
        r_ds_sub.font.size = Pt(7)

    # Middle Cell: Exact Centered Text matching Screenshot 1 & 2
    p1 = c1.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.line_spacing = 1.15
    r_mid = p1.add_run(
        "D-114980–2-YEARLTRAFORCONDITIONMONITORING OF\n"
        "PRIMARY AND DISTRIBUTION SUBSTATIONS IN ABU\n"
        "DHABI, AL AIN AND AL DHAFRA REG"
    )
    r_mid.font.name = "Calibri"
    r_mid.font.size = Pt(8.5)
    r_mid.font.bold = True

    # Right Cell: TAQA Distribution PNG Logo
    p2 = c2.paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if right_logo:
        p2.add_run().add_picture(right_logo, width=Inches(1.3))
    else:
        r_taqa = p2.add_run("TAQA\n")
        r_taqa.font.name = "Arial"
        r_taqa.font.size = Pt(14)
        r_taqa.font.bold = True
        r_taqa.font.color.rgb = RGBColor(0, 128, 128)
        r_taqa_sub = p2.add_run("Distribution\nطاقة للتوزيع")
        r_taqa_sub.font.name = "Calibri"
        r_taqa_sub.font.size = Pt(7.5)

    # ---------------- FOOTER TABLE SETUP (EXACT MATCHING SCREENSHOT 2 RIGHT CORNER) ----------------
    footer = section.footer
    footer_table = footer.add_table(rows=1, cols=2, width=Inches(7.27))
    footer_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    remove_table_borders(footer_table)

    fc0, fc1 = footer_table.rows[0].cells[0], footer_table.rows[0].cells[1]
    fc0.width = Inches(3.63)
    fc1.width = Inches(3.64)

    # Left Cell: D– 114980
    p_fc0 = fc0.paragraphs[0]
    p_fc0.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_fc0.paragraph_format.space_before = Pt(0)
    p_fc0.paragraph_format.space_after = Pt(0)
    f_run1 = p_fc0.add_run("D– 114980")
    f_run1.font.name = "Calibri"
    f_run1.font.size = Pt(9.5)
    f_run1.font.color.rgb = RGBColor(89, 89, 89)

    # Right Cell: Page X of Y & DELTA STAR (Right-Aligned)
    p_fc1 = fc1.paragraphs[0]
    p_fc1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_fc1.paragraph_format.space_before = Pt(0)
    p_fc1.paragraph_format.space_after = Pt(0)
    p_fc1.paragraph_format.line_spacing = 1.15
    
    f_tab = p_fc1.add_run("Page ")
    f_tab.font.name = "Calibri"
    f_tab.font.size = Pt(9.5)
    f_tab.font.color.rgb = RGBColor(89, 89, 89)

    add_word_field(p_fc1, "PAGE")

    f_of = p_fc1.add_run(" of ")
    f_of.font.name = "Calibri"
    f_of.font.size = Pt(9.5)
    f_of.font.color.rgb = RGBColor(89, 89, 89)

    add_word_field(p_fc1, "NUMPAGES")

    r_ds_label = p_fc1.add_run("\nDELTA STAR")
    r_ds_label.font.name = "Calibri"
    r_ds_label.font.size = Pt(9.5)
    r_ds_label.font.bold = True
    r_ds_label.font.color.rgb = RGBColor(217, 83, 79)

    # ---------------- PAGE 1: FORMAL COVER ----------------
    doc.add_paragraph()

    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.line_spacing = 1.4

    r = p_meta.add_run("PROJECT NAME \t: {{ project_name }}\n\n")
    r.font.name = "Calibri"
    r.font.size = Pt(11)
    r.font.bold = True

    r = p_meta.add_run("CLIENT \t\t: {{ client }}\n\n")
    r.font.name = "Calibri"
    r.font.size = Pt(11)
    r.font.bold = True

    r = p_meta.add_run("CONTRACTOR \t: {{ contractor }}\n\n")
    r.font.name = "Calibri"
    r.font.size = Pt(11)
    r.font.bold = True

    doc.add_paragraph()

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.line_spacing = 1.3

    r = p_title.add_run("INSPECTION REPORT\n\n")
    r.font.name = "Calibri"
    r.font.size = Pt(16)
    r.font.bold = True

    r = p_title.add_run("WO: {{ work_order }}\n\n")
    r.font.name = "Calibri"
    r.font.size = Pt(14)
    r.font.bold = True

    r = p_title.add_run("EWO: {{ ewo }}\n\n")
    r.font.name = "Calibri"
    r.font.size = Pt(14)
    r.font.bold = True

    r = p_title.add_run("{{ substation_id }}\n\n")
    r.font.name = "Calibri"
    r.font.size = Pt(16)
    r.font.bold = True

    sig_table = doc.add_table(rows=2, cols=5)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sig_table.autofit = False
    set_table_borders(sig_table, color_hex="000000", sz="4")

    headers = ["Date of Issue", "Date of Inspection", "Prepared by DELTA", "Verified by DELTA", "Maximo Entry By"]
    widths = [Inches(1.2), Inches(1.3), Inches(1.5), Inches(1.5), Inches(1.3)]

    for idx, (h_text, w) in enumerate(zip(headers, widths)):
        cell = sig_table.rows[0].cells[idx]
        cell.width = w
        set_cell_background(cell, "9BC2E6")
        set_cell_margins(cell, top=100, bottom=100, left=60, right=60)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h_text)
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)
        r.font.bold = True

    values = ["{{ date_of_issue }}", "{{ date_of_inspection }}", "{{ prepared_by }}", "{{ verified_by }}", "{{ maximo_entry_by }}"]
    for idx, (v_text, w) in enumerate(zip(values, widths)):
        cell = sig_table.rows[1].cells[idx]
        cell.width = w
        set_cell_margins(cell, top=200, bottom=200, left=60, right=60)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(v_text)
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)

    doc.add_page_break()

    # ---------------- PAGE 2: SECTION 1 (BRIEF) & SECTION 2 (FINDINGS) ----------------
    p_gap = doc.add_paragraph()
    p_gap.paragraph_format.space_before = Pt(6)
    p_gap.paragraph_format.space_after = Pt(0)

    add_blue_section_banner(doc, "1. Brief")

    p_b1 = doc.add_paragraph()
    p_b1.paragraph_format.space_before = Pt(2)
    p_b1.paragraph_format.space_after = Pt(4)
    r = p_b1.add_run("This inspection done on “{{ substation_id }}” , during the inspection the following done:\n")
    r.font.name = "Calibri"
    r.font.size = Pt(11)

    p_b2 = doc.add_paragraph()
    p_b2.paragraph_format.space_before = Pt(2)
    p_b2.paragraph_format.space_after = Pt(8)
    p_b2.paragraph_format.left_indent = Inches(0.3)
    r = p_b2.add_run("{{ brief_text }}\n")
    r.font.name = "Calibri"
    r.font.size = Pt(11)

    add_blue_section_banner(doc, "2. Summary of Findings")

    defects_table = doc.add_table(rows=1, cols=2)
    defects_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    defects_table.autofit = False
    set_table_borders(defects_table, color_hex="000000", sz="4")

    c_left = defects_table.rows[0].cells[0]
    c_right = defects_table.rows[0].cells[1]

    c_left.width = Inches(1.8)
    c_right.width = Inches(5.1)

    set_cell_margins(c_left, top=150, bottom=150, left=100, right=100)
    set_cell_margins(c_right, top=150, bottom=150, left=150, right=150)

    p_left = c_left.paragraphs[0]
    r_left = p_left.add_run("DEFECTS\nFINDINGS")
    r_left.font.name = "Calibri"
    r_left.font.size = Pt(11)
    r_left.font.bold = True

    p_right = c_right.paragraphs[0]
    r_right = p_right.add_run("{{ summary_findings }}")
    r_right.font.name = "Calibri"
    r_right.font.size = Pt(10.5)

    # Force page break after Section 2 so Section 3 (dynamic pages) starts at top of Page 3
    doc.add_page_break()

    # ---------------- PAGE 3+: DYNAMIC PER-PAGE PHOTO EVIDENCE & AUTO-FIT LAYOUTS ----------------
    p_pg_loop_start = doc.add_paragraph()
    p_pg_loop_start.paragraph_format.space_before = Pt(0)
    p_pg_loop_start.paragraph_format.space_after = Pt(0)
    p_pg_loop_start.add_run("{%p for page in pages %}")

    # Add page break between pages
    p_pb = doc.add_paragraph()
    p_pb.paragraph_format.space_before = Pt(0)
    p_pb.paragraph_format.space_after = Pt(0)
    p_pb.add_run("{%p if not loop.first %}")
    p_pb = doc.add_paragraph()
    p_pb.paragraph_format.space_after = Pt(0)
    p_pb.add_run()._r.append(parse_xml(r'<w:br %s w:type="page"/>' % nsdecls('w')))
    doc.add_paragraph("{%p endif %}")

    # Section Title Banner (Rendered on first page of a section)
    p_sec_if = doc.add_paragraph()
    p_sec_if.paragraph_format.space_before = Pt(0)
    p_sec_if.paragraph_format.space_after = Pt(0)
    p_sec_if.add_run("{%p if page.is_first_page_of_section and page.section_title %}")
    add_blue_section_banner(doc, "{{ page.section_title }}", is_subtitle=False)
    p_sec_end = doc.add_paragraph()
    p_sec_end.paragraph_format.space_before = Pt(0)
    p_sec_end.paragraph_format.space_after = Pt(2)
    p_sec_end.add_run("{%p endif %}")

    # Subtitle Banner (e.g. 3.1 Substation Outside or 3.2 SWITCH GEAR)
    p_sub_if = doc.add_paragraph()
    p_sub_if.paragraph_format.space_before = Pt(0)
    p_sub_if.paragraph_format.space_after = Pt(0)
    p_sub_if.add_run("{%p if page.subtitle %}")
    add_blue_section_banner(doc, "{{ page.subtitle }}", is_subtitle=True)
    p_sub_end = doc.add_paragraph()
    p_sub_end.paragraph_format.space_before = Pt(0)
    p_sub_end.paragraph_format.space_after = Pt(4)
    p_sub_end.add_run("{%p endif %}")

    # Bullet point notes (if any on this page)
    p_notes_if = doc.add_paragraph()
    p_notes_if.add_run("{%p if page.notes %}")
    p_note_start = doc.add_paragraph()
    p_note_start.add_run("{%p for note in page.notes %}")
    p_note = doc.add_paragraph()
    p_note.paragraph_format.space_before = Pt(2)
    p_note.paragraph_format.space_after = Pt(4)
    p_note.paragraph_format.left_indent = Inches(0.2)
    r_n = p_note.add_run("{{ note.text }}")
    r_n.font.name = "Calibri"
    r_n.font.size = Pt(11)
    r_n.font.bold = True
    p_note_end = doc.add_paragraph()
    p_note_end.add_run("{%p endfor %}")
    p_notes_endif = doc.add_paragraph()
    p_notes_endif.add_run("{%p endif %}")

    # ================= LAYOUT 1: SINGLE FULL-WIDTH PHOTO =================
    p_l1_if = doc.add_paragraph()
    p_l1_if.add_run("{%p if page.layout == '1_full' %}")

    p_l1_sub = doc.add_paragraph()
    p_l1_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l1_sub.paragraph_format.space_before = Pt(0)
    p_l1_sub.paragraph_format.space_after = Pt(2)
    r_l1_s = p_l1_sub.add_run("{% if page.sub1 %}{{ page.sub1 }}{% endif %}")
    r_l1_s.font.name = "Calibri"
    r_l1_s.font.size = Pt(10)
    r_l1_s.font.bold = True

    p_l1_img = doc.add_paragraph()
    p_l1_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l1_img.paragraph_format.space_before = Pt(0)
    p_l1_img.paragraph_format.space_after = Pt(2)
    p_l1_img.add_run("{% if page.img1 %}{{ page.img1 }}{% endif %}")

    p_l1_cap = doc.add_paragraph()
    p_l1_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l1_cap.paragraph_format.space_before = Pt(0)
    p_l1_cap.paragraph_format.space_after = Pt(4)
    r_l1_c = p_l1_cap.add_run("{% if page.cap1 %}{{ page.cap1 }}{% endif %}")
    r_l1_c.font.name = "Calibri"
    r_l1_c.font.size = Pt(8.5)

    p_l1_end = doc.add_paragraph()
    p_l1_end.add_run("{%p endif %}")

    # ================= LAYOUT 2: 2 PHOTOS VERTICALLY STACKED (MATCHES SCREENSHOT 2) =================
    p_l2_if = doc.add_paragraph()
    p_l2_if.add_run("{%p if page.layout == '2_stack' %}")

    # Top Photo (Photo 1)
    p_l2_sub1 = doc.add_paragraph()
    p_l2_sub1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l2_sub1.paragraph_format.space_before = Pt(0)
    p_l2_sub1.paragraph_format.space_after = Pt(2)
    r_l2_s1 = p_l2_sub1.add_run("{% if page.sub1 %}{{ page.sub1 }}{% endif %}")
    r_l2_s1.font.name = "Calibri"
    r_l2_s1.font.size = Pt(10)
    r_l2_s1.font.bold = True

    p_l2_img1 = doc.add_paragraph()
    p_l2_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l2_img1.paragraph_format.space_before = Pt(0)
    p_l2_img1.paragraph_format.space_after = Pt(2)
    p_l2_img1.add_run("{% if page.img1 %}{{ page.img1 }}{% endif %}")

    p_l2_cap1 = doc.add_paragraph()
    p_l2_cap1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l2_cap1.paragraph_format.space_before = Pt(0)
    p_l2_cap1.paragraph_format.space_after = Pt(6) # Small neat gap between the 2 stacked photos
    r_l2_c1 = p_l2_cap1.add_run("{% if page.cap1 %}{{ page.cap1 }}{% endif %}")
    r_l2_c1.font.name = "Calibri"
    r_l2_c1.font.size = Pt(8.5)

    # Bottom Photo (Photo 2)
    p_l2_sub2 = doc.add_paragraph()
    p_l2_sub2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l2_sub2.paragraph_format.space_before = Pt(0)
    p_l2_sub2.paragraph_format.space_after = Pt(2)
    r_l2_s2 = p_l2_sub2.add_run("{% if page.sub2 %}{{ page.sub2 }}{% endif %}")
    r_l2_s2.font.name = "Calibri"
    r_l2_s2.font.size = Pt(10)
    r_l2_s2.font.bold = True

    p_l2_img2 = doc.add_paragraph()
    p_l2_img2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l2_img2.paragraph_format.space_before = Pt(0)
    p_l2_img2.paragraph_format.space_after = Pt(2)
    p_l2_img2.add_run("{% if page.img2 %}{{ page.img2 }}{% endif %}")

    p_l2_cap2 = doc.add_paragraph()
    p_l2_cap2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l2_cap2.paragraph_format.space_before = Pt(0)
    p_l2_cap2.paragraph_format.space_after = Pt(4)
    r_l2_c2 = p_l2_cap2.add_run("{% if page.cap2 %}{{ page.cap2 }}{% endif %}")
    r_l2_c2.font.name = "Calibri"
    r_l2_c2.font.size = Pt(8.5)

    p_l2_end = doc.add_paragraph()
    p_l2_end.add_run("{%p endif %}")

    # ================= LAYOUT 3: 3 PHOTOS HYBRID (1 TOP + 2 BOTTOM - MATCHES SCREENSHOT 3) =================
    p_l3_if = doc.add_paragraph()
    p_l3_if.add_run("{%p if page.layout == '3_hybrid' %}")

    # Row 1: Large Centered Top Photo
    p_l3_sub1 = doc.add_paragraph()
    p_l3_sub1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l3_sub1.paragraph_format.space_before = Pt(0)
    p_l3_sub1.paragraph_format.space_after = Pt(2)
    r_l3_s1 = p_l3_sub1.add_run("{% if page.sub1 %}{{ page.sub1 }}{% endif %}")
    r_l3_s1.font.name = "Calibri"
    r_l3_s1.font.size = Pt(10)
    r_l3_s1.font.bold = True

    p_l3_img1 = doc.add_paragraph()
    p_l3_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l3_img1.paragraph_format.space_before = Pt(0)
    p_l3_img1.paragraph_format.space_after = Pt(2)
    p_l3_img1.add_run("{% if page.img1 %}{{ page.img1 }}{% endif %}")

    p_l3_cap1 = doc.add_paragraph()
    p_l3_cap1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l3_cap1.paragraph_format.space_before = Pt(0)
    p_l3_cap1.paragraph_format.space_after = Pt(6) # Small neat gap before bottom row
    r_l3_c1 = p_l3_cap1.add_run("{% if page.cap1 %}{{ page.cap1 }}{% endif %}")
    r_l3_c1.font.name = "Calibri"
    r_l3_c1.font.size = Pt(8.5)

    # Row 2: 2 Photos Side-by-Side in borderless 2-column table
    tbl_l3_r2 = doc.add_table(rows=1, cols=2)
    tbl_l3_r2.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_l3_r2.autofit = False
    remove_table_borders(tbl_l3_r2)

    c_l3_1 = tbl_l3_r2.rows[0].cells[0]
    c_l3_2 = tbl_l3_r2.rows[0].cells[1]
    c_l3_1.width = Inches(3.55)
    c_l3_2.width = Inches(3.55)
    set_cell_margins(c_l3_1, top=10, bottom=20, left=10, right=20)
    set_cell_margins(c_l3_2, top=10, bottom=20, left=20, right=10)

    # Left Bottom Photo
    p_l3_s2 = c_l3_1.paragraphs[0]
    p_l3_s2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l3_s2.paragraph_format.space_before = Pt(0)
    p_l3_s2.paragraph_format.space_after = Pt(2)
    r_l3_s2 = p_l3_s2.add_run("{% if page.sub2 %}{{ page.sub2 }}{% endif %}")
    r_l3_s2.font.name = "Calibri"
    r_l3_s2.font.size = Pt(9.5)
    r_l3_s2.font.bold = True

    p_l3_i2 = c_l3_1.add_paragraph()
    p_l3_i2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l3_i2.paragraph_format.space_before = Pt(0)
    p_l3_i2.paragraph_format.space_after = Pt(2)
    p_l3_i2.add_run("{% if page.img2 %}{{ page.img2 }}{% endif %}")

    p_l3_c2 = c_l3_1.add_paragraph()
    p_l3_c2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l3_c2.paragraph_format.space_before = Pt(0)
    p_l3_c2.paragraph_format.space_after = Pt(2)
    r_l3_c2 = p_l3_c2.add_run("{% if page.cap2 %}{{ page.cap2 }}{% endif %}")
    r_l3_c2.font.name = "Calibri"
    r_l3_c2.font.size = Pt(8)

    # Right Bottom Photo
    p_l3_s3 = c_l3_2.paragraphs[0]
    p_l3_s3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l3_s3.paragraph_format.space_before = Pt(0)
    p_l3_s3.paragraph_format.space_after = Pt(2)
    r_l3_s3 = p_l3_s3.add_run("{% if page.sub3 %}{{ page.sub3 }}{% endif %}")
    r_l3_s3.font.name = "Calibri"
    r_l3_s3.font.size = Pt(9.5)
    r_l3_s3.font.bold = True

    p_l3_i3 = c_l3_2.add_paragraph()
    p_l3_i3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l3_i3.paragraph_format.space_before = Pt(0)
    p_l3_i3.paragraph_format.space_after = Pt(2)
    p_l3_i3.add_run("{% if page.img3 %}{{ page.img3 }}{% endif %}")

    p_l3_c3 = c_l3_2.add_paragraph()
    p_l3_c3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_l3_c3.paragraph_format.space_before = Pt(0)
    p_l3_c3.paragraph_format.space_after = Pt(2)
    r_l3_c3 = p_l3_c3.add_run("{% if page.cap3 %}{{ page.cap3 }}{% endif %}")
    r_l3_c3.font.name = "Calibri"
    r_l3_c3.font.size = Pt(8)

    p_l3_end = doc.add_paragraph()
    p_l3_end.add_run("{%p endif %}")

    # ================= LAYOUT 4: 4 PHOTOS (2x2 GRID) =================
    p_l4_if = doc.add_paragraph()
    p_l4_if.add_run("{%p if page.layout == '4_grid' %}")

    tbl_l4 = doc.add_table(rows=2, cols=2)
    tbl_l4.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_l4.autofit = False
    remove_table_borders(tbl_l4)

    # Setup cell widths and padding
    for r_i in range(2):
        for c_i in range(2):
            cell = tbl_l4.rows[r_i].cells[c_i]
            cell.width = Inches(3.52)
            set_cell_margins(cell, top=5, bottom=5, left=8, right=8)

    # Cell 1 (Row 0, Col 0): img1
    p_s1 = tbl_l4.rows[0].cells[0].paragraphs[0]
    p_s1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s = p_s1.add_run("{% if page.sub1 %}{{ page.sub1 }}{% endif %}")
    r_s.font.bold = True
    r_s.font.size = Pt(9)
    p_i = tbl_l4.rows[0].cells[0].add_paragraph()
    p_i.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_i.add_run("{% if page.img1 %}{{ page.img1 }}{% endif %}")
    p_c = tbl_l4.rows[0].cells[0].add_paragraph()
    p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_c = p_c.add_run("{% if page.cap1 %}{{ page.cap1 }}{% endif %}")
    r_c.font.size = Pt(8)

    # Cell 2 (Row 0, Col 1): img2
    p_s2 = tbl_l4.rows[0].cells[1].paragraphs[0]
    p_s2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s = p_s2.add_run("{% if page.sub2 %}{{ page.sub2 }}{% endif %}")
    r_s.font.bold = True
    r_s.font.size = Pt(9)
    p_i = tbl_l4.rows[0].cells[1].add_paragraph()
    p_i.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_i.add_run("{% if page.img2 %}{{ page.img2 }}{% endif %}")
    p_c = tbl_l4.rows[0].cells[1].add_paragraph()
    p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_c = p_c.add_run("{% if page.cap2 %}{{ page.cap2 }}{% endif %}")
    r_c.font.size = Pt(8)

    # Cell 3 (Row 1, Col 0): img3
    p_s3 = tbl_l4.rows[1].cells[0].paragraphs[0]
    p_s3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s = p_s3.add_run("{% if page.sub3 %}{{ page.sub3 }}{% endif %}")
    r_s.font.bold = True
    r_s.font.size = Pt(9)
    p_i = tbl_l4.rows[1].cells[0].add_paragraph()
    p_i.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_i.add_run("{% if page.img3 %}{{ page.img3 }}{% endif %}")
    p_c = tbl_l4.rows[1].cells[0].add_paragraph()
    p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_c = p_c.add_run("{% if page.cap3 %}{{ page.cap3 }}{% endif %}")
    r_c.font.size = Pt(8)

    # Cell 4 (Row 1, Col 1): img4
    p_s4 = tbl_l4.rows[1].cells[1].paragraphs[0]
    p_s4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s = p_s4.add_run("{% if page.sub4 %}{{ page.sub4 }}{% endif %}")
    r_s.font.bold = True
    r_s.font.size = Pt(9)
    p_i = tbl_l4.rows[1].cells[1].add_paragraph()
    p_i.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_i.add_run("{% if page.img4 %}{{ page.img4 }}{% endif %}")
    p_c = tbl_l4.rows[1].cells[1].add_paragraph()
    p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_c = p_c.add_run("{% if page.cap4 %}{{ page.cap4 }}{% endif %}")
    r_c.font.size = Pt(8)

    p_l4_end = doc.add_paragraph()
    p_l4_end.add_run("{%p endif %}")

    # ================= LAYOUT 5: 5 PHOTOS (2 TOP + 3 BOTTOM) =================
    p_l5_if = doc.add_paragraph()
    p_l5_if.add_run("{%p if page.layout == '5_grid' %}")

    tbl_l5_r1 = doc.add_table(rows=1, cols=2)
    tbl_l5_r1.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_l5_r1.autofit = False
    remove_table_borders(tbl_l5_r1)
    for c_i in range(2):
        cell = tbl_l5_r1.rows[0].cells[c_i]
        cell.width = Inches(3.52)
        set_cell_margins(cell, top=5, bottom=5, left=8, right=8)

    p_s = tbl_l5_r1.rows[0].cells[0].paragraphs[0]
    p_s.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_s.add_run("{% if page.sub1 %}{{ page.sub1 }}{% endif %}").font.size = Pt(9)
    p_i = tbl_l5_r1.rows[0].cells[0].add_paragraph()
    p_i.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_i.add_run("{% if page.img1 %}{{ page.img1 }}{% endif %}")
    cell = p_i._parent
    cell.add_paragraph("{% if page.cap1 %}{{ page.cap1 }}{% endif %}").alignment = WD_ALIGN_PARAGRAPH.CENTER

    p_s = tbl_l5_r1.rows[0].cells[1].paragraphs[0]
    p_s.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_s.add_run("{% if page.sub2 %}{{ page.sub2 }}{% endif %}").font.size = Pt(9)
    p_i = tbl_l5_r1.rows[0].cells[1].add_paragraph()
    p_i.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_i.add_run("{% if page.img2 %}{{ page.img2 }}{% endif %}")
    cell = p_i._parent
    cell.add_paragraph("{% if page.cap2 %}{{ page.cap2 }}{% endif %}").alignment = WD_ALIGN_PARAGRAPH.CENTER

    tbl_l5_r2 = doc.add_table(rows=1, cols=3)
    tbl_l5_r2.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_l5_r2.autofit = False
    remove_table_borders(tbl_l5_r2)
    for c_i in range(3):
        cell = tbl_l5_r2.rows[0].cells[c_i]
        cell.width = Inches(2.32)
        set_cell_margins(cell, top=5, bottom=5, left=5, right=5)

    p_s = tbl_l5_r2.rows[0].cells[0].paragraphs[0]
    p_s.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_s.add_run("{% if page.sub3 %}{{ page.sub3 }}{% endif %}").font.size = Pt(8.5)
    p_i = tbl_l5_r2.rows[0].cells[0].add_paragraph()
    p_i.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_i.add_run("{% if page.img3 %}{{ page.img3 }}{% endif %}")
    cell = p_i._parent
    cell.add_paragraph("{% if page.cap3 %}{{ page.cap3 }}{% endif %}").alignment = WD_ALIGN_PARAGRAPH.CENTER

    p_s = tbl_l5_r2.rows[0].cells[1].paragraphs[0]
    p_s.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_s.add_run("{% if page.sub4 %}{{ page.sub4 }}{% endif %}").font.size = Pt(8.5)
    p_i = tbl_l5_r2.rows[0].cells[1].add_paragraph()
    p_i.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_i.add_run("{% if page.img4 %}{{ page.img4 }}{% endif %}")
    cell = p_i._parent
    cell.add_paragraph("{% if page.cap4 %}{{ page.cap4 }}{% endif %}").alignment = WD_ALIGN_PARAGRAPH.CENTER

    p_s = tbl_l5_r2.rows[0].cells[2].paragraphs[0]
    p_s.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_s.add_run("{% if page.sub5 %}{{ page.sub5 }}{% endif %}").font.size = Pt(8.5)
    p_i = tbl_l5_r2.rows[0].cells[2].add_paragraph()
    p_i.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_i.add_run("{% if page.img5 %}{{ page.img5 }}{% endif %}")
    cell = p_i._parent
    cell.add_paragraph("{% if page.cap5 %}{{ page.cap5 }}{% endif %}").alignment = WD_ALIGN_PARAGRAPH.CENTER

    p_l5_end = doc.add_paragraph()
    p_l5_end.add_run("{%p endif %}")

    # ================= LAYOUT 6: 6 PHOTOS (2 ROWS OF 3) =================
    p_l6_if = doc.add_paragraph()
    p_l6_if.add_run("{%p if page.layout == '6_grid' %}")

    tbl_l6 = doc.add_table(rows=2, cols=3)
    tbl_l6.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_l6.autofit = False
    remove_table_borders(tbl_l6)
    for r_i in range(2):
        for c_i in range(3):
            cell = tbl_l6.rows[r_i].cells[c_i]
            cell.width = Inches(2.32)
            set_cell_margins(cell, top=5, bottom=5, left=5, right=5)

    # Row 1 (img1, img2, img3)
    for idx_c, idx_num in enumerate([1, 2, 3]):
        cell = tbl_l6.rows[0].cells[idx_c]
        p_s = cell.paragraphs[0]
        p_s.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_s.paragraph_format.space_before = Pt(0)
        p_s.paragraph_format.space_after = Pt(1)
        r_s = p_s.add_run(f"{{% if page.sub{idx_num} %}}{{{{ page.sub{idx_num} }}}}{{% endif %}}")
        r_s.font.name = "Calibri"
        r_s.font.size = Pt(8.5)
        r_s.font.bold = True

        p_i = cell.add_paragraph()
        p_i.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_i.paragraph_format.space_before = Pt(0)
        p_i.paragraph_format.space_after = Pt(1)
        p_i.add_run(f"{{% if page.img{idx_num} %}}{{{{ page.img{idx_num} }}}}{{% endif %}}")

        p_c = cell.add_paragraph()
        p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_c.paragraph_format.space_before = Pt(0)
        p_c.paragraph_format.space_after = Pt(2)
        r_c = p_c.add_run(f"{{% if page.cap{idx_num} %}}{{{{ page.cap{idx_num} }}}}{{% endif %}}")
        r_c.font.name = "Calibri"
        r_c.font.size = Pt(8)

    # Row 2 (img4, img5, img6)
    for idx_c, idx_num in enumerate([4, 5, 6]):
        cell = tbl_l6.rows[1].cells[idx_c]
        p_s = cell.paragraphs[0]
        p_s.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_s.paragraph_format.space_before = Pt(0)
        p_s.paragraph_format.space_after = Pt(1)
        r_s = p_s.add_run(f"{{% if page.sub{idx_num} %}}{{{{ page.sub{idx_num} }}}}{{% endif %}}")
        r_s.font.name = "Calibri"
        r_s.font.size = Pt(8.5)
        r_s.font.bold = True

        p_i = cell.add_paragraph()
        p_i.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_i.paragraph_format.space_before = Pt(0)
        p_i.paragraph_format.space_after = Pt(1)
        p_i.add_run(f"{{% if page.img{idx_num} %}}{{{{ page.img{idx_num} }}}}{{% endif %}}")

        p_c = cell.add_paragraph()
        p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_c.paragraph_format.space_before = Pt(0)
        p_c.paragraph_format.space_after = Pt(2)
        r_c = p_c.add_run(f"{{% if page.cap{idx_num} %}}{{{{ page.cap{idx_num} }}}}{{% endif %}}")
        r_c.font.name = "Calibri"
        r_c.font.size = Pt(8)

    p_l6_end = doc.add_paragraph()
    p_l6_end.add_run("{%p endif %}")

    # ================= LAYOUT GENERIC: GENERIC ROWS FALLBACK =================
    p_gen_if = doc.add_paragraph()
    p_gen_if.add_run("{%p if page.layout == 'generic' %}")
    p_gen_loop = doc.add_paragraph()
    p_gen_loop.add_run("{%p for row in page.generic_rows %}")

    tbl_gen = doc.add_table(rows=1, cols=2)
    tbl_gen.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_gen.autofit = False
    remove_table_borders(tbl_gen)
    c1, c2 = tbl_gen.rows[0].cells[0], tbl_gen.rows[0].cells[1]
    c1.width = Inches(3.55)
    c2.width = Inches(3.55)
    set_cell_margins(c1, top=10, bottom=15, left=15, right=15)
    set_cell_margins(c2, top=10, bottom=15, left=15, right=15)

    p_i1 = c1.paragraphs[0]
    p_i1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_i1.add_run("{% if row.sub1 %}{{ row.sub1 }}{% endif %}")
    c1.add_paragraph("{% if row.img1 %}{{ row.img1 }}{% endif %}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    c1.add_paragraph("{% if row.cap1 %}{{ row.cap1 }}{% endif %}").alignment = WD_ALIGN_PARAGRAPH.CENTER

    p_i2 = c2.paragraphs[0]
    p_i2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_i2.add_run("{% if row.sub2 %}{{ row.sub2 }}{% endif %}")
    c2.add_paragraph("{% if row.img2 %}{{ row.img2 }}{% endif %}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    c2.add_paragraph("{% if row.cap2 %}{{ row.cap2 }}{% endif %}").alignment = WD_ALIGN_PARAGRAPH.CENTER

    p_gen_endloop = doc.add_paragraph()
    p_gen_endloop.add_run("{%p endfor %}")
    p_gen_endif = doc.add_paragraph()
    p_gen_endif.add_run("{%p endif %}")

    p_pg_loop_end = doc.add_paragraph()
    p_pg_loop_end.add_run("{%p endfor %}")

    # ---------------- END OF PROCEDURE MARKER ----------------
    end_para = doc.add_paragraph()
    end_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_end = end_para.add_run("\n\n✰✰✰✰✰ END OF PROCEDURE ✰✰✰✰✰")
    r_end.font.name = "Calibri"
    r_end.font.size = Pt(11)
    r_end.font.bold = True

    # Fixed columns, compact paragraphs and unbroken photo rows.
    for table in doc.tables:
        for row in table.rows:
            row._tr.get_or_add_trPr().append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
            for cell in row.cells:
                cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
                for p in cell.paragraphs:
                    if "page.cap" in p.text or "row.cap" in p.text:
                        for run in p.runs:
                            run.font.name = "Calibri"
                            run.font.size = Pt(8.5)
                    p.paragraph_format.space_before = Pt(0)
                    p.paragraph_format.space_after = Pt(2)
    for p in doc.paragraphs:
        if '{{ page.img' in p.text or '{{ page.sub' in p.text:
            p.paragraph_format.keep_with_next = True
    doc.save(output_path)
    print(f"Successfully generated 100% photo-matched template DOCX at: {output_path}")


if __name__ == "__main__":
    create_template_docx()
