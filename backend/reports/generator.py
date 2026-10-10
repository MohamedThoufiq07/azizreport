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


from PIL import Image as PILImage


def fit_image_dims(image_path, max_w_in, max_h_in, crop_to_fill=False):
    """
    Computes proportional width and height preserving aspect ratio
    strictly bounded by max_w_in and max_h_in so content never overflows the page.
    If crop_to_fill is True, crops the image from center to match target bounding ratio.
    """
    try:
        if crop_to_fill:
            target_aspect = max_w_in / float(max_h_in)
            with PILImage.open(image_path) as im:
                orig_w, orig_h = im.size
                orig_aspect = orig_w / float(orig_h)

                if abs(orig_aspect - target_aspect) > 0.05:
                    if orig_aspect > target_aspect:
                        # Image is wider than target ratio -> crop left & right
                        new_w = int(orig_h * target_aspect)
                        left = (orig_w - new_w) // 2
                        box = (left, 0, left + new_w, orig_h)
                    else:
                        # Image is taller than target ratio -> crop top & bottom
                        new_h = int(orig_w / target_aspect)
                        top = (orig_h - new_h) // 2
                        box = (0, top, orig_w, top + new_h)

                    cropped_im = im.crop(box)
                    cropped_path = image_path.rsplit('.', 1)[0] + '_fitcrop.jpg'
                    cropped_im.save(cropped_path, 'JPEG', quality=95)
                    image_path = cropped_path

        with PILImage.open(image_path) as im:
            orig_w, orig_h = im.size
        aspect = orig_w / float(orig_h)
        w = max_w_in
        h = w / aspect
        if h > max_h_in:
            h = max_h_in
            w = h * aspect
        return Inches(round(w, 2)), Inches(round(h, 2)), image_path
    except Exception as e:
        print(f"Notice: Failed to calculate image aspect ratio for {image_path}: {e}")
        return Inches(max_w_in), Inches(max_h_in), image_path


def generate_report_docx(report, template_path, output_docx_path):
    """
    Renders an InspectionReport model instance into output_docx_path using docxtpl.
    Auto-fits images per page according to photo counts (1, 2, 3, 4, 5, 6+):
    - 1 Photo: 1 Large centered full-page photo
    - 2 Photos: 2 Stacked large photos fitting page vertically (Screenshot 2)
    - 3 Photos: 1 Top centered photo + 2 bottom side-by-side photos (Screenshot 3)
    - 4 Photos: 2x2 Grid fitting single page
    - 5 Photos: 2 Top + 3 Bottom Grid
    - 6 Photos: 2 Rows of 3 Grid
    """
    doc = DocxTemplate(template_path)

    pages_data = []

    for sec in report.sections.all().order_by('order'):
        all_notes = list(sec.notes.all().order_by('page_number', 'order'))
        all_images = list(sec.images.all().order_by('page_number', 'order'))

        # Group by page_number
        page_nums = sorted(list(set(
            [n.page_number for n in all_notes] + 
            [i.page_number for i in all_images]
        )))
        if not page_nums:
            page_nums = [1]

        for p_idx, p_num in enumerate(page_nums):
            p_notes = [n for n in all_notes if n.page_number == p_num]
            p_images = [i for i in all_images if i.page_number == p_num]

            # Format bullet notes
            formatted_notes = []
            for n in p_notes:
                raw_text = n.text.strip()
                lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
                for line in lines:
                    text_val = line
                    if text_val and not (text_val.startswith('•') or text_val.startswith('-') or (len(text_val) > 2 and text_val[0].isdigit() and text_val[1] in ['.', ')'])):
                        text_val = f"•  {text_val}"
                    formatted_notes.append({'text': text_val})

            # Derive subtitle for this page
            subtitle = ""
            for img_item in p_images:
                if getattr(img_item, 'page_subtitle', '').strip():
                    subtitle = img_item.page_subtitle.strip()
                    break

            is_first_page_of_section = (p_idx == 0)

            # Valid image items that exist on disk and are readable images
            valid_images = []
            for img in p_images:
                if img.image and os.path.exists(img.image.path):
                    try:
                        with PILImage.open(img.image.path) as im:
                            im.verify()
                        valid_images.append(img)
                    except Exception as img_err:
                        print(f"Notice: Image file {img.image.path} is invalid/corrupted: {img_err}")

            num_imgs = len(valid_images)

            page_dict = {
                'page_num': p_num,
                'is_first_page_of_section': is_first_page_of_section,
                'section_title': sec.title,
                'subtitle': subtitle,
                'notes': formatted_notes,
            }

            if num_imgs == 1:
                page_dict['layout'] = '1_full'
                i1 = valid_images[0]
                w, h, img_path = fit_image_dims(i1.image.path, 6.5, 6.0, crop_to_fill=False)
                page_dict['img1'] = InlineImage(doc, img_path, width=w, height=h)
                page_dict['sub1'] = i1.subtitle or ""
                page_dict['cap1'] = i1.caption or ""

            elif num_imgs == 2:
                # 2 Photos Stacked Vertically (Matches Screenshot 2 & User Image 1)
                page_dict['layout'] = '2_stack'
                i1, i2 = valid_images[0], valid_images[1]
                w1, h1, path1 = fit_image_dims(i1.image.path, 6.5, 3.4, crop_to_fill=False)
                w2, h2, path2 = fit_image_dims(i2.image.path, 6.5, 3.4, crop_to_fill=False)
                page_dict['img1'] = InlineImage(doc, path1, width=w1, height=h1)
                page_dict['sub1'] = i1.subtitle or ""
                page_dict['cap1'] = i1.caption or ""
                page_dict['img2'] = InlineImage(doc, path2, width=w2, height=h2)
                page_dict['sub2'] = i2.subtitle or ""
                page_dict['cap2'] = i2.caption or ""

            elif num_imgs == 3:
                # 3 Photos Hybrid: 1 Top + 2 Bottom Side-by-Side (Matches Screenshot 3 & User Image 3)
                page_dict['layout'] = '3_hybrid'
                i1, i2, i3 = valid_images[0], valid_images[1], valid_images[2]
                w1, h1, path1 = fit_image_dims(i1.image.path, 6.5, 3.5, crop_to_fill=False)
                w2, h2, path2 = fit_image_dims(i2.image.path, 3.1, 2.8, crop_to_fill=True)
                w3, h3, path3 = fit_image_dims(i3.image.path, 3.1, 2.8, crop_to_fill=True)
                page_dict['img1'] = InlineImage(doc, path1, width=w1, height=h1)
                page_dict['sub1'] = i1.subtitle or ""
                page_dict['cap1'] = i1.caption or ""
                page_dict['img2'] = InlineImage(doc, path2, width=w2, height=h2)
                page_dict['sub2'] = i2.subtitle or ""
                page_dict['cap2'] = i2.caption or ""
                page_dict['img3'] = InlineImage(doc, path3, width=w3, height=h3)
                page_dict['sub3'] = i3.subtitle or ""
                page_dict['cap3'] = i3.caption or ""

            elif num_imgs == 4:
                # 4 Photos 2x2 Grid
                page_dict['layout'] = '4_grid'
                for idx_k, img_item in enumerate(valid_images[:4]):
                    w, h, final_path = fit_image_dims(img_item.image.path, 3.1, 3.2, crop_to_fill=True)
                    page_dict[f'img{idx_k + 1}'] = InlineImage(doc, final_path, width=w, height=h)
                    page_dict[f'sub{idx_k + 1}'] = img_item.subtitle or ""
                    page_dict[f'cap{idx_k + 1}'] = img_item.caption or ""

            elif num_imgs == 5:
                # 5 Photos: 2 Top + 3 Bottom
                page_dict['layout'] = '5_grid'
                for idx_k in range(2):
                    img_item = valid_images[idx_k]
                    w, h, final_path = fit_image_dims(img_item.image.path, 3.1, 2.8, crop_to_fill=True)
                    page_dict[f'img{idx_k + 1}'] = InlineImage(doc, final_path, width=w, height=h)
                    page_dict[f'sub{idx_k + 1}'] = img_item.subtitle or ""
                    page_dict[f'cap{idx_k + 1}'] = img_item.caption or ""
                for idx_k in range(2, 5):
                    img_item = valid_images[idx_k]
                    w, h, final_path = fit_image_dims(img_item.image.path, 2.0, 2.5, crop_to_fill=True)
                    page_dict[f'img{idx_k + 1}'] = InlineImage(doc, final_path, width=w, height=h)
                    page_dict[f'sub{idx_k + 1}'] = img_item.subtitle or ""
                    page_dict[f'cap{idx_k + 1}'] = img_item.caption or ""

            elif num_imgs == 6:
                # 6 Photos: 2 Rows of 3 (Matches User Image 2)
                page_dict['layout'] = '6_grid'
                for idx_k in range(6):
                    img_item = valid_images[idx_k]
                    w, h, final_path = fit_image_dims(img_item.image.path, 2.1, 2.8, crop_to_fill=True)
                    page_dict[f'img{idx_k + 1}'] = InlineImage(doc, final_path, width=w, height=h)
                    page_dict[f'sub{idx_k + 1}'] = img_item.subtitle or ""
                    page_dict[f'cap{idx_k + 1}'] = img_item.caption or ""

            elif num_imgs > 6:
                # Generic fallback: rows of 2
                page_dict['layout'] = 'generic'
                gen_rows = []
                for r_i in range(0, num_imgs, 2):
                    row_data = {}
                    i_a = valid_images[r_i]
                    i_b = valid_images[r_i + 1] if (r_i + 1) < num_imgs else None
                    w_a, h_a, path_a = fit_image_dims(i_a.image.path, 3.1, 3.0, crop_to_fill=True)
                    row_data['img1'] = InlineImage(doc, path_a, width=w_a, height=h_a)
                    if i_b:
                        w_b, h_b, path_b = fit_image_dims(i_b.image.path, 3.1, 3.0, crop_to_fill=True)
                        row_data['img2'] = InlineImage(doc, path_b, width=w_b, height=h_b)
                    gen_rows.append(row_data)
                page_dict['generic_rows'] = gen_rows
            else:
                # 0 photos (notes only page)
                page_dict['layout'] = '1_full'
                page_dict['img1'] = None

            pages_data.append(page_dict)

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
        'pages': pages_data,
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
        import tempfile
        import urllib.parse
        profile_dir = os.path.join(tempfile.gettempdir(), 'lo_pdf_profile').replace('\\', '/')
        profile_url = f"file:///{urllib.parse.quote(profile_dir, safe=':/')}"
        cmd = [
            libreoffice_bin,
            '--headless',
            '--norestore',
            '--nodefault',
            f'-env:UserInstallation={profile_url}',
            '--convert-to', 'pdf',
            '--outdir', output_dir,
            docx_path
        ]
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
            if result.returncode == 0 and os.path.exists(expected_pdf_path):
                print(f"[SUCCESS] Successfully converted PDF via LibreOffice: {expected_pdf_path}")
                return expected_pdf_path
            else:
                print(f"LibreOffice profile run failed (rc={result.returncode}), attempting simple run...")
        except Exception as err:
            print(f"LibreOffice profile run exception: {err}")

        # Fallback 1b: Simple LibreOffice command without custom profile
        cmd_simple = [
            libreoffice_bin,
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', output_dir,
            docx_path
        ]
        try:
            result_s = subprocess.run(cmd_simple, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
            if result_s.returncode == 0 and os.path.exists(expected_pdf_path):
                print(f"[SUCCESS] Successfully converted PDF via simple LibreOffice: {expected_pdf_path}")
                return expected_pdf_path
        except Exception as err:
            print(f"LibreOffice simple run exception: {err}")

    # Engine 2: Fallback to docx2pdf (MS Word automation)
    try:
        from docx2pdf import convert
        convert(docx_path, expected_pdf_path)
        if os.path.exists(expected_pdf_path):
            print(f"✅ Successfully converted PDF via docx2pdf: {expected_pdf_path}")
            return expected_pdf_path
    except Exception as e:
        print(f"Notice: docx2pdf engine attempt: {e}")

    if os.path.exists(expected_pdf_path):
        return expected_pdf_path

    raise RuntimeError(
        "PDF conversion requires LibreOffice or MS Word installed on host system."
    )
