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
    Positioned relative to text (offsetFrom="text") so top border line moves DOWN right next to header table,
    and bottom border line moves UP right next to footer text.
    """
    sectPr = section._sectPr
    pgBorders = parse_xml(
        f'<w:pgBorders {nsdecls("w")} w:offsetFrom="text">'
        f'  <w:top w:val="double" w:sz="6" w:space="14" w:color="00AEEF"/>'
        f'  <w:left w:val="double" w:sz="6" w:space="14" w:color="00AEEF"/>'
        f'  <w:bottom w:val="double" w:sz="6" w:space="14" w:color="00AEEF"/>'
        f'  <w:right w:val="double" w:sz="6" w:space="14" w:color="00AEEF"/>'
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


def add_blue_section_banner(doc, title_text):
    """
    Adds soft blue section banner matching reference screenshots 1 & 2.
    Width: 5.6" left-aligned banner (not full width), positioned near header.
    """
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    remove_table_borders(table)
    cell = table.rows[0].cells[0]
    cell.width = Inches(5.6)
    set_cell_background(cell, "B4C6E7") # Soft pastel blue matching photo 1 & 2
    set_cell_margins(cell, top=60, bottom=60, left=140, right=140)
    
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run(title_text)
    run.font.name = "Calibri"
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0, 0, 0)
    
    p_after = doc.add_paragraph() # Spacing after banner
    p_after.paragraph_format.space_before = Pt(2)
    p_after.paragraph_format.space_after = Pt(4)


def get_logo_paths():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.abspath(os.path.join(base_dir, '..', 'frontend', 'src', 'assets'))
    
    left_logo = os.path.join(assets_dir, 'report left side logo.png')
    right_logo = os.path.join(assets_dir, 'report right side logo.png')
    
    return left_logo if os.path.exists(left_logo) else None, right_logo if os.path.exists(right_logo) else None


def create_template_docx(output_path="template.docx"):
    doc = Document()
    
    # Page setup - Standard A4 with exact tight top/bottom margins matching reference photos 1 & 2
    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.4)
    section.bottom_margin = Inches(0.4)
    section.left_margin = Inches(0.5)
    section.right_margin = Inches(0.5)
    section.header_distance = Inches(0.28)
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

    # ---------------- FOOTER TAB STOP SETUP (100% TABLE-FREE, ZERO GRIDLINES) ----------------
    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.LEFT
    fp.paragraph_format.line_spacing = 1.15
    fp.paragraph_format.space_before = Pt(0)
    fp.paragraph_format.space_after = Pt(0)
    fp.paragraph_format.tab_stops.add_tab_stop(Inches(7.17), WD_TAB_ALIGNMENT.RIGHT)

    # Left Footer: D– 114980
    f_run1 = fp.add_run("D– 114980")
    f_run1.font.name = "Calibri"
    f_run1.font.size = Pt(9.5)
    f_run1.font.color.rgb = RGBColor(89, 89, 89)

    # Right Footer: Page X of Y & DELTA STAR
    f_tab = fp.add_run("\tPage")
    f_tab.font.name = "Calibri"
    f_tab.font.size = Pt(9.5)
    f_tab.font.color.rgb = RGBColor(89, 89, 89)

    add_word_field(fp, "PAGE")

    f_of = fp.add_run("of")
    f_of.font.name = "Calibri"
    f_of.font.size = Pt(9.5)
    f_of.font.color.rgb = RGBColor(89, 89, 89)

    add_word_field(fp, "NUMPAGES")

    r_ds_label = fp.add_run("\n\tDELTA STAR")
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

    # ---------------- PAGE 3+: DYNAMIC SECTIONS & PHOTO EVIDENCE (100% TABLE-FREE) ----------------
    p_sec_loop_start = doc.add_paragraph()
    p_sec_loop_start.add_run("{% for section in sections %}")

    doc.add_page_break()

    add_blue_section_banner(doc, "{{ section.title }}")

    # Dynamic blocks loop (Notes & Image Rows rendered in position order)
    p_blk_start = doc.add_paragraph()
    p_blk_start.add_run("{% for block in section.blocks %}")

    # --- NOTES BLOCK ---
    p_if_notes = doc.add_paragraph()
    p_if_notes.add_run("{% if block.type == 'notes' %}")

    p_note_start = doc.add_paragraph()
    p_note_start.add_run("{% for note in block.notes_list %}")

    p_note = doc.add_paragraph()
    p_note.paragraph_format.space_before = Pt(2)
    p_note.paragraph_format.space_after = Pt(4)
    p_note.paragraph_format.left_indent = Inches(0.3)
    r_note = p_note.add_run("{{ note.text }}")
    r_note.font.name = "Calibri"
    r_note.font.size = Pt(11)
    r_note.font.bold = True

    p_note_end = doc.add_paragraph()
    p_note_end.add_run("{% endfor %}")

    p_endif_notes = doc.add_paragraph()
    p_endif_notes.add_run("{% endif %}")

    # --- IMAGE ROW BLOCK ---
    p_if_img = doc.add_paragraph()
    p_if_img.add_run("{% if block.type == 'image_row' %}")

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(2)
    p_sub.paragraph_format.space_after = Pt(2)
    r_sub = p_sub.add_run("{% if block.sub1 %}{{ block.sub1 }}{% endif %}              {% if block.sub2 %}{{ block.sub2 }}{% endif %}")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(10)
    r_sub.font.bold = True

    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(2)
    p_img.paragraph_format.space_after = Pt(2)
    p_img.add_run("{% if block.img1 %}{{ block.img1 }}{% endif %}    {% if block.img2 %}{{ block.img2 }}{% endif %}")

    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(0)
    p_cap.paragraph_format.space_after = Pt(6)
    r_cap = p_cap.add_run("{% if block.cap1 %}{{ block.cap1 }}{% endif %}      {% if block.cap2 %}{{ block.cap2 }}{% endif %}")
    r_cap.font.name = "Calibri"
    r_cap.font.size = Pt(8.5)

    p_endif_img = doc.add_paragraph()
    p_endif_img.add_run("{% endif %}")

    p_blk_end = doc.add_paragraph()
    p_blk_end.add_run("{% endfor %}")

    p_sec_loop_end = doc.add_paragraph()
    p_sec_loop_end.add_run("{% endfor %}")

    # ---------------- END OF PROCEDURE MARKER ----------------
    end_para = doc.add_paragraph()
    end_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_end = end_para.add_run("\n\n✰✰✰✰✰ END OF PROCEDURE ✰✰✰✰✰")
    r_end.font.name = "Calibri"
    r_end.font.size = Pt(11)
    r_end.font.bold = True

    doc.save(output_path)
    print(f"Successfully generated 100% photo-matched template DOCX at: {output_path}")


if __name__ == "__main__":
    create_template_docx()
