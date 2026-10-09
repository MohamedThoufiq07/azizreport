import os
import django
import json
from io import BytesIO
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from reports.models import InspectionReport

def test_e2e():
    print("=== RUNNING FULL END-TO-END DJANGO TEST ===")
    client = APIClient()

    def make_file(name, w, h, color):
        b = BytesIO()
        Image.new('RGB', (w, h), color=color).save(b, format='JPEG')
        b.seek(0)
        return SimpleUploadedFile(name, b.read(), content_type="image/jpeg")

    payload = {
        "project_name": "D-114980 - 2 YEAR LTRA FOR CONDITION MONITORING OF PRIMARY AND DISTRIBUTION SUBSTATIONS IN ABU DHABI, AL AIN AND AL DHAFRA REG",
        "client": "TAQA DISTRIBUTION",
        "contractor": "DELTA STAR POWER PROJECT SERVICES S.P.L.L.C",
        "substation_id": "E19C106",
        "work_order": "WO-984321",
        "ewo": "EWO-54120",
        "date_of_inspection": "2026-10-08",
        "prepared_by": "Eng. Ahmed Hassan",
        "verified_by": "Eng. Mohamed Al-Mazrouei",
        "maximo_entry_by": "Eng. Sultan Al-Dhaheri",
        "brief_text": "Visual Civil, Visual, Thermal & PD inspection conducted.",
        "summary_findings": "All equipment in good condition.",
        "sections": [
            {
                "title": "3. Civil",
                "order": 0,
                "pages": [
                    {
                        "page_number": 1,
                        "subtitle": "3.1 Substation Outside",
                        "notes": [],
                        "images": [
                            {"subtitle": "3.1 Substation Outside", "caption": "Civil exterior facade", "order": 0, "file_key": "image_s0_p0_i0"},
                            {"subtitle": "", "caption": "Substation identification plate", "order": 1, "file_key": "image_s0_p0_i1"}
                        ]
                    },
                    {
                        "page_number": 2,
                        "subtitle": "3.2 SWITCH GEAR",
                        "notes": [],
                        "images": [
                            {"subtitle": "3.2 SWITCH GEAR", "caption": "Switchgear apparatus overview", "order": 0, "file_key": "image_s0_p1_i0"},
                            {"subtitle": "", "caption": "Technical rating plate", "order": 1, "file_key": "image_s0_p1_i1"},
                            {"subtitle": "", "caption": "Control unit panel face", "order": 2, "file_key": "image_s0_p1_i2"}
                        ]
                    }
                ]
            }
        ]
    }

    data = {
        'payload': json.dumps(payload),
        'image_s0_p0_i0': make_file("facade.jpg", 800, 600, (30, 80, 140)),
        'image_s0_p0_i1': make_file("plate.jpg", 800, 500, (140, 60, 40)),
        'image_s0_p1_i0': make_file("switchgear.jpg", 600, 800, (40, 140, 60)),
        'image_s0_p1_i1': make_file("nameplate.jpg", 600, 600, (100, 100, 50)),
        'image_s0_p1_i2': make_file("panel.jpg", 600, 700, (50, 100, 120)),
    }

    res = client.post('/api/reports/', data=data, format='multipart')
    print(f"API Post Status: {res.status_code}")
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.data}"

    rep_id = res.data['id']
    print(f"Created InspectionReport ID: {rep_id}")

    # Test download DOCX
    res_docx = client.get(f'/api/reports/{rep_id}/download-docx/')
    print(f"Download DOCX Status: {res_docx.status_code}")
    assert res_docx.status_code == 200

    # Test download PDF
    res_pdf = client.get(f'/api/reports/{rep_id}/download-pdf/')
    print(f"Download PDF Status: {res_pdf.status_code}")
    assert res_pdf.status_code == 200

    print("=== [SUCCESS] ALL END-TO-END TESTS PASSED WITH 100% SUCCESS! ===")

if __name__ == '__main__':
    test_e2e()
