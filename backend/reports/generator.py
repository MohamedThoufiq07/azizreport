import os
import shutil
import subprocess
import uuid
from pathlib import Path
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Inches


def find_libreoffice_executable():
    """Find the path to LibreOffice executable across Windows, Linux, and macOS."""
    # Windows standard installation paths
    win_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    ]
    for p in win_paths:
        if os.path.exists(p):
            return p

    for cmd in ['soffice', 'libreoffice', 'soffice.exe']:
        path = shutil.which(cmd)
        if path:
            return path

    unix_paths = [
        "/usr/bin/libreoffice",
        "/usr/bin/soffice",
        "/Applications/LibreOffice.app/Contents/MacOS/soffice"
    ]
    for p in unix_paths:
        if os.path.exists(p):
            return p

    return None


def generate_report_docx(report, template_path, output_docx_path):
    """
    Renders an InspectionReport model instance into output_docx_path using docxtpl.
    Formats section images in 2-column inline pairs with optional photo subtitles.
    """
    doc = DocxTemplate(template_path)

    sections_data = []
    for sec in report.sections.all().order_by('order'):
        top_notes = []
        bottom_notes = []
        row_notes = {}

        for n in sec.notes.all().order_by('order'):
            raw_text = n.text.strip()
            lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
            for line in lines:
                text_val = line
                if text_val and not (text_val.startswith('•') or text_val.startswith('-') or (len(text_val) > 2 and text_val[0].isdigit() and text_val[1] in ['.', ')'])):
                    text_val = f"•  {text_val}"

                pos = getattr(n, 'position', 'top') or 'top'
                note_obj = {'text': text_val}
                
                if pos in ['bottom', 'after_images']:
                    bottom_notes.append(note_obj)
                elif pos.startswith('after_row_'):
                    try:
                        r_idx = int(pos.replace('after_row_', ''))
                        row_notes.setdefault(r_idx, []).append(note_obj)
                    except ValueError:
                        bottom_notes.append(note_obj)
                else:
                    top_notes.append(note_obj)

        images = list(sec.images.all().order_by('order'))
        image_rows = []

        for i in range(0, len(images), 2):
            img_item1 = images[i]
            img_item2 = images[i + 1] if (i + 1) < len(images) else None

            inline_img1 = None
            if img_item1 and img_item1.image and os.path.exists(img_item1.image.path):
                inline_img1 = InlineImage(doc, img_item1.image.path, width=Inches(3.3), height=Inches(2.1))

            inline_img2 = None
            if img_item2 and img_item2.image and os.path.exists(img_item2.image.path):
                inline_img2 = InlineImage(doc, img_item2.image.path, width=Inches(3.3), height=Inches(2.1))

            image_rows.append({
                'sub1': img_item1.subtitle if img_item1 else "",
                'img1': inline_img1,
                'cap1': img_item1.caption if img_item1 else "",
                'sub2': img_item2.subtitle if img_item2 else "",
                'img2': inline_img2,
                'cap2': img_item2.caption if img_item2 else ""
            })

        blocks = []
        if top_notes:
            blocks.append({'type': 'notes', 'notes_list': top_notes})

        for r_idx, r_data in enumerate(image_rows):
            blocks.append({'type': 'image_row', **r_data})
            if r_idx in row_notes:
                blocks.append({'type': 'notes', 'notes_list': row_notes[r_idx]})

        if bottom_notes:
            blocks.append({'type': 'notes', 'notes_list': bottom_notes})

        all_notes = top_notes + [n for r_list in row_notes.values() for n in r_list] + bottom_notes

        sections_data.append({
            'title': sec.title,
            'notes': all_notes,
            'image_rows': image_rows,
            'blocks': blocks
        })

    date_str = str(report.date_of_inspection) if report.date_of_inspection else ""

    context = {
        'project_name': report.project_name,
        'client': report.client,
        'contractor': report.contractor,
        'substation_id': report.substation_id,
        'work_order': report.work_order,
        'ewo': report.ewo,
        'date_of_issue': date_str,
        'date_of_inspection': date_str,
        'prepared_by': report.prepared_by or "DELTA",
        'verified_by': report.verified_by or "DELTA",
        'maximo_entry_by': report.maximo_entry_by or "DELTA",
        'brief_text': report.brief_text,
        'summary_findings': report.summary_findings,
        'sections': sections_data,
    }

    doc.render(context)
    
    # Ensure directory exists and safe save
    os.makedirs(os.path.dirname(output_docx_path), exist_ok=True)
    if os.path.exists(output_docx_path):
        try:
            os.remove(output_docx_path)
        except OSError:
            pass

    doc.save(output_docx_path)
    return output_docx_path


def convert_docx_to_pdf(docx_path, output_dir):
    """
    Converts a DOCX file to PDF using headless LibreOffice.
    Returns path to compiled PDF.
    """
    docx_path = os.path.abspath(docx_path)
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    filename = Path(docx_path).stem + ".pdf"
    expected_pdf_path = os.path.join(output_dir, filename)

    # Engine 1: Headless LibreOffice (Primary Engine)
    libreoffice_bin = find_libreoffice_executable()
    if libreoffice_bin:
        cmd = [
            libreoffice_bin,
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', output_dir,
            docx_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode == 0 and os.path.exists(expected_pdf_path):
            print(f"✅ Successfully converted PDF via LibreOffice: {expected_pdf_path}")
            return expected_pdf_path

    # Engine 2: Fallback to docx2pdf if LibreOffice is missing
    try:
        from docx2pdf import convert
        convert(docx_path, expected_pdf_path)
        if os.path.exists(expected_pdf_path):
            print(f"✅ Successfully converted PDF via docx2pdf: {expected_pdf_path}")
            return expected_pdf_path
    except Exception as e:
        print(f"Notice: docx2pdf engine attempt: {e}")

    raise RuntimeError(
        "PDF conversion requires LibreOffice installed on system. "
        "Please verify LibreOffice installation."
    )
