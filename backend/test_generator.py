import os
import django
from PIL import Image

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from reports.models import InspectionReport, ReportSection, SectionNote, SectionImage
from reports.generator import generate_report_docx, convert_docx_to_pdf, find_libreoffice_executable
from reports.views import get_template_path, get_generated_dir


def test_generator():
    print("=== Testing Substation Report Generator ===")
    
    # Create sample dummy image
    sample_img_dir = os.path.join(os.path.dirname(__file__), 'media', 'uploads', 'inspection_images')
    os.makedirs(sample_img_dir, exist_ok=True)
    sample_img_path = os.path.join(sample_img_dir, 'test_sample.jpg')
    
    img = Image.new('RGB', (800, 600), color=(10, 37, 64))
    img.save(sample_img_path)

    report = InspectionReport.objects.create(
        substation_id="E19C106",
        work_order="WO-984321",
        ewo="EWO-54120",
        date_of_inspection="2026-09-22",
        prepared_by="Eng. Ahmed Hassan",
        verified_by="Eng. Mohamed Al-Mazrouei",
        maximo_entry_by="Eng. Sultan Al-Dhaheri",
        summary_findings="1. Civil foundation paint intact.\n2. Transformer T1 thermal reading at 34°C normal."
    )

    sec1 = ReportSection.objects.create(report=report, title="3. Civil", order=0)
    # Page 1: 3.1 Substation Outside (2 photos)
    SectionImage.objects.create(
        section=sec1, 
        image="uploads/inspection_images/test_sample.jpg", 
        subtitle="3.1 Substation Outside", 
        caption="Civil exterior facade", 
        order=0,
        page_number=1,
        page_subtitle="3.1 Substation Outside"
    )
    SectionImage.objects.create(
        section=sec1, 
        image="uploads/inspection_images/test_sample.jpg", 
        subtitle="", 
        caption="Substation plate closeup", 
        order=1,
        page_number=1,
        page_subtitle="3.1 Substation Outside"
    )

    # Page 2: 3.2 SWITCH GEAR (3 photos)
    SectionImage.objects.create(
        section=sec1, 
        image="uploads/inspection_images/test_sample.jpg", 
        subtitle="3.2 SWITCH GEAR", 
        caption="Switchgear overview", 
        order=0,
        page_number=2,
        page_subtitle="3.2 SWITCH GEAR"
    )
    SectionImage.objects.create(
        section=sec1, 
        image="uploads/inspection_images/test_sample.jpg", 
        subtitle="", 
        caption="Nameplate details", 
        order=1,
        page_number=2,
        page_subtitle="3.2 SWITCH GEAR"
    )
    SectionImage.objects.create(
        section=sec1, 
        image="uploads/inspection_images/test_sample.jpg", 
        subtitle="", 
        caption="Control panel face", 
        order=2,
        page_number=2,
        page_subtitle="3.2 SWITCH GEAR"
    )

    template_path = get_template_path()
    output_dir = get_generated_dir()
    docx_path = os.path.join(output_dir, f"Test_Report_{report.substation_id}.docx")

    print(f"Rendering DOCX to: {docx_path}")
    generate_report_docx(report, template_path, docx_path)
    assert os.path.exists(docx_path), "DOCX file generation failed!"
    print("[SUCCESS] DOCX Generation Successful!")

    libreoffice_bin = find_libreoffice_executable()
    print(f"LibreOffice Executable path: {libreoffice_bin}")
    if libreoffice_bin:
        pdf_path = convert_docx_to_pdf(docx_path, output_dir)
        print(f"Compiled PDF path: {pdf_path}")
        assert os.path.exists(pdf_path), "PDF file conversion failed!"
        print("[SUCCESS] Headless LibreOffice PDF Compilation Successful!")
    else:
        print("[NOTICE] LibreOffice not found, DOCX verified.")

if __name__ == "__main__":
    test_generator()
