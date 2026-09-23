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
    SectionNote.objects.create(section=sec1, text="SEVERELY FADED TRANSFORMER NAMEPLATE.", order=0)
    SectionImage.objects.create(section=sec1, image="uploads/inspection_images/test_sample.jpg", subtitle="1. Nameplate", caption="Civil foundation structure view", order=1)
    SectionImage.objects.create(section=sec1, image="uploads/inspection_images/test_sample.jpg", subtitle="2. Trench Wall", caption="Civil drainage and trench cover", order=2)
    SectionNote.objects.create(section=sec1, text="LOOSE DISORGANIZED CABLES RESTING ON THE DIRTY FLOOR OF THE TRENCH BENEATH THE GRATING.", order=3)

    sec2 = ReportSection.objects.create(report=report, title="3.2 Transformers", order=1)
    SectionImage.objects.create(section=sec2, image="uploads/inspection_images/test_sample.jpg", caption="Transformer T1 Red Phase Bushing", order=0)

    sec3 = ReportSection.objects.create(report=report, title="3.3 Switchgear", order=2)

    template_path = get_template_path()
    output_dir = get_generated_dir()
    docx_path = os.path.join(output_dir, f"Test_Report_{report.substation_id}.docx")

    print(f"Rendering DOCX to: {docx_path}")
    generate_report_docx(report, template_path, docx_path)
    assert os.path.exists(docx_path), "DOCX file generation failed!"
    print("✅ DOCX Generation Successful!")

    libreoffice_bin = find_libreoffice_executable()
    print(f"LibreOffice Executable path: {libreoffice_bin}")
    if libreoffice_bin:
        pdf_path = convert_docx_to_pdf(docx_path, output_dir)
        print(f"Compiled PDF path: {pdf_path}")
        assert os.path.exists(pdf_path), "PDF file conversion failed!"
        print("✅ Headless LibreOffice PDF Compilation Successful!")
    else:
        print("⚠️ LibreOffice executable not found on host environment. DOCX compilation verified. Install LibreOffice for PDF compilation.")

if __name__ == "__main__":
    test_generator()
