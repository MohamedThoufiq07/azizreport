from django.db import models


class InspectionReport(models.Model):
    DEFAULT_PROJECT = "D-114980 - 2 YEAR LTRA FOR CONDITION MONITORING OF PRIMARY AND DISTRIBUTION SUBSTATIONS IN ABU DHABI, AL AIN AND AL DHAFRA REG"
    DEFAULT_CLIENT = "TAQA DISTRIBUTION"
    DEFAULT_CONTRACTOR = "DELTA STAR POWER PROJECT SERVICES S.P.L.L.C"
    DEFAULT_BRIEF = "Visual Civil, Visual, Thermal & PD"

    project_name = models.CharField(max_length=500, default=DEFAULT_PROJECT)
    client = models.CharField(max_length=255, default=DEFAULT_CLIENT)
    contractor = models.CharField(max_length=255, default=DEFAULT_CONTRACTOR)
    
    substation_id = models.CharField(max_length=100)
    work_order = models.CharField(max_length=100, blank=True, default="")
    ewo = models.CharField(max_length=100, blank=True, default="")
    date_of_inspection = models.DateField()
    
    prepared_by = models.CharField(max_length=255, blank=True, default="")
    verified_by = models.CharField(max_length=255, blank=True, default="")
    maximo_entry_by = models.CharField(max_length=255, blank=True, default="")
    
    brief_text = models.TextField(default=DEFAULT_BRIEF)
    summary_findings = models.TextField(blank=True, default="")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.substation_id} - {self.date_of_inspection}"


class ReportSection(models.Model):
    report = models.ForeignKey(
        InspectionReport, 
        on_delete=models.CASCADE, 
        related_name='sections'
    )
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.report.substation_id} - {self.title}"


class SectionNote(models.Model):
    section = models.ForeignKey(
        ReportSection, 
        on_delete=models.CASCADE, 
        related_name='notes'
    )
    text = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Note #{self.order} for {self.section.title}"


class SectionImage(models.Model):
    section = models.ForeignKey(
        ReportSection, 
        on_delete=models.CASCADE, 
        related_name='images'
    )
    image = models.ImageField(upload_to='uploads/inspection_images/')
    subtitle = models.CharField(max_length=255, blank=True, default="")
    caption = models.TextField(blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Image #{self.order} for {self.section.title}"

