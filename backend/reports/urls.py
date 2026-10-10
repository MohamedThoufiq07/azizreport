from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InspectionReportViewSet

router = DefaultRouter()
router.register(r'reports', InspectionReportViewSet, basename='inspection-report')

urlpatterns = [
    path('reports/', InspectionReportViewSet.as_view({'post': 'create', 'get': 'list'})),
    path('reports', InspectionReportViewSet.as_view({'post': 'create', 'get': 'list'})),
    path('reports/<int:pk>/download-docx/', InspectionReportViewSet.as_view({'get': 'download_docx'})),
    path('reports/<int:pk>/download-docx', InspectionReportViewSet.as_view({'get': 'download_docx'})),
    path('reports/<int:pk>/download-pdf/', InspectionReportViewSet.as_view({'get': 'download_pdf'})),
    path('reports/<int:pk>/download-pdf', InspectionReportViewSet.as_view({'get': 'download_pdf'})),
    path('', include(router.urls)),
]
