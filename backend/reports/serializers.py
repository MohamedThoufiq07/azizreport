from rest_framework import serializers
from .models import InspectionReport, ReportSection, SectionNote, SectionImage


class SectionNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SectionNote
        fields = ['id', 'text', 'order']


class SectionImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SectionImage
        fields = ['id', 'image', 'subtitle', 'caption', 'order']


class ReportSectionSerializer(serializers.ModelSerializer):
    images = SectionImageSerializer(many=True, read_only=True)
    notes = SectionNoteSerializer(many=True, read_only=True)

    class Meta:
        model = ReportSection
        fields = ['id', 'title', 'order', 'notes', 'images']


class InspectionReportSerializer(serializers.ModelSerializer):
    sections = ReportSectionSerializer(many=True, read_only=True)

    class Meta:
        model = InspectionReport
        fields = [
            'id', 'project_name', 'client', 'contractor',
            'substation_id', 'work_order', 'ewo', 'date_of_inspection',
            'prepared_by', 'verified_by', 'maximo_entry_by',
            'brief_text', 'summary_findings', 'sections',
            'created_at', 'updated_at'
        ]
