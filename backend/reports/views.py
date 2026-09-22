import os
import json
from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .models import InspectionReport, ReportSection, SectionNote, SectionImage
from .serializers import InspectionReportSerializer
from .generator import generate_report_docx, convert_docx_to_pdf
from .build_template import create_template_docx


def get_template_path():
    template_dir = os.path.join(settings.BASE_DIR, 'reports', 'templates_docx')
    os.makedirs(template_dir, exist_ok=True)
    template_path = os.path.join(template_dir, 'template.docx')
    create_template_docx(template_path)
    return template_path


def get_generated_dir():
    generated_dir = os.path.join(settings.MEDIA_ROOT, 'generated_reports')
    os.makedirs(generated_dir, exist_ok=True)
    return generated_dir


class InspectionReportViewSet(viewsets.ModelViewSet):
    queryset = InspectionReport.objects.all()
    serializer_class = InspectionReportSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request, *args, **kwargs):
        """
        Handles creation of InspectionReport with nested sections, text notes, and multipart images.
        Payload can contain metadata JSON string in `payload` or direct form fields.
        """
        raw_payload = request.data.get('payload')
        if raw_payload:
            if isinstance(raw_payload, str):
                data = json.loads(raw_payload)
            else:
                data = raw_payload
        else:
            data = request.data

        report = InspectionReport.objects.create(
            project_name=data.get('project_name', InspectionReport.DEFAULT_PROJECT),
            client=data.get('client', InspectionReport.DEFAULT_CLIENT),
            contractor=data.get('contractor', InspectionReport.DEFAULT_CONTRACTOR),
            substation_id=data.get('substation_id', ''),
            work_order=data.get('work_order', ''),
            ewo=data.get('ewo', ''),
            date_of_inspection=data.get('date_of_inspection'),
            prepared_by=data.get('prepared_by', ''),
            verified_by=data.get('verified_by', ''),
            maximo_entry_by=data.get('maximo_entry_by', ''),
            brief_text=data.get('brief_text', InspectionReport.DEFAULT_BRIEF),
            summary_findings=data.get('summary_findings', '')
        )

        sections_data = data.get('sections', [])
        for s_idx, sec_dict in enumerate(sections_data):
            section_title = sec_dict.get('title', f"Section {s_idx + 1}")
            section = ReportSection.objects.create(
                report=report,
                title=section_title,
                order=sec_dict.get('order', s_idx)
            )

            # Create text notes/bullet points
            notes_meta = sec_dict.get('notes', [])
            for n_idx, note_item in enumerate(notes_meta):
                if isinstance(note_item, dict):
                    note_text = note_item.get('text', '')
                    note_order = note_item.get('order', n_idx)
                else:
                    note_text = str(note_item)
                    note_order = n_idx

                if note_text.strip():
                    SectionNote.objects.create(
                        section=section,
                        text=note_text.strip(),
                        order=note_order
                    )

            images_meta = sec_dict.get('images', [])
            for img_idx, img_meta in enumerate(images_meta):
                file_key = img_meta.get('file_key') or f"image_s{s_idx}_i{img_idx}"
                image_file = request.FILES.get(file_key)
                
                # Robust fallback: search by key pattern if exact key missing
                if not image_file:
                    for k, f in request.FILES.items():
                        if f"s{s_idx}_i{img_idx}" in k or f"s_{s_idx}_i_{img_idx}" in k:
                            image_file = f
                            break

                if image_file:
                    created_img = SectionImage.objects.create(
                        section=section,
                        image=image_file,
                        subtitle=img_meta.get('subtitle', ''),
                        caption=img_meta.get('caption', ''),
                        order=img_meta.get('order', img_idx)
                    )
                    print(f"✅ Created SectionImage #{created_img.id}: {created_img.image.path}")
                else:
                    print(f"⚠️ Image file missing for key '{file_key}' in Section '{section.title}'")

        serializer = self.get_serializer(report)
        response_data = serializer.data
        response_data['docx_url'] = f"/api/reports/{report.id}/download-docx/"
        response_data['pdf_url'] = f"/api/reports/{report.id}/download-pdf/"

        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='download-docx')
    def download_docx(self, request, pk=None):
        report = self.get_object()
        template_path = get_template_path()
        output_dir = get_generated_dir()
        
        docx_filename = f"InspectionReport_{report.substation_id}_{report.id}.docx"
        docx_path = os.path.join(output_dir, docx_filename)

        generate_report_docx(report, template_path, docx_path)

        if not os.path.exists(docx_path):
            raise Http404("DOCX file generation failed.")

        return FileResponse(
            open(docx_path, 'rb'),
            as_attachment=True,
            filename=docx_filename,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        report = self.get_object()
        template_path = get_template_path()
        output_dir = get_generated_dir()

        docx_filename = f"InspectionReport_{report.substation_id}_{report.id}.docx"
        docx_path = os.path.join(output_dir, docx_filename)

        # Generate DOCX first
        generate_report_docx(report, template_path, docx_path)

        # Convert to PDF using headless LibreOffice
        try:
            pdf_path = convert_docx_to_pdf(docx_path, output_dir)
        except Exception as e:
            # Fallback or error response if LibreOffice binary is missing/errored
            return Response(
                {"error": f"PDF conversion failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        pdf_filename = f"InspectionReport_{report.substation_id}_{report.id}.pdf"
        return FileResponse(
            open(pdf_path, 'rb'),
            as_attachment=True,
            filename=pdf_filename,
            content_type='application/pdf'
        )
