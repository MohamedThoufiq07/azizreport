import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, 
  FileText, 
  Plus, 
  Trash2, 
  Upload, 
  Download, 
  Camera, 
  RefreshCw, 
  FileDown, 
  CheckCircle2, 
  AlertCircle,
  ImageIcon,
  ShieldCheck,
  UserCheck,
  Layers,
  Sparkles,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  ArrowRight,
  Type,
  Crop,
  X,
  Check,
  Maximize2,
  Move,
  Smartphone
} from 'lucide-react';

const DEFAULT_SECTIONS = [
  "3. Civil",
  "3.2 Transformers",
  "4. Partial Discharge",
  "5. Thermal Image",
  "6. Photos of Defect Findings"
];

const ReportBuilder = () => {
  // ---------------- STATE ----------------
  const [formData, setFormData] = useState({
    project_name: "D-114980 - 2 YEAR LTRA FOR CONDITION MONITORING OF PRIMARY AND DISTRIBUTION SUBSTATIONS IN ABU DHABI, AL AIN AND AL DHAFRA REG",
    client: "TAQA DISTRIBUTION",
    contractor: "DELTA STAR POWER PROJECT SERVICES S.P.L.L.C",
    substation_id: "E19C106",
    work_order: "WO-984321",
    ewo: "EWO-54120",
    date_of_inspection: new Date().toISOString().split('T')[0],
    prepared_by: "Eng. Ahmed Hassan",
    verified_by: "Eng. Mohamed Al-Mazrouei",
    maximo_entry_by: "Eng. Sultan Al-Dhaheri",
    brief_text: "Visual Civil, Visual, Thermal & PD inspection conducted on primary transformer unit and switchgear panels.",
    summary_findings: "1. Transformer T1 oil level normal. Minor paint flaking on civil support pedestal.\n2. Thermal camera indicated 34°C normal operating temperature on red phase bushing.\n3. Partial Discharge (PD) readings well within allowable threshold (< 10 pC)."
  });

  const [sections, setSections] = useState(
    DEFAULT_SECTIONS.map((title, idx) => ({
      id: `sec_${Date.now()}_${idx}`,
      title,
      order: idx,
      notes: title.includes("Defect") ? [
        { id: `note_def_1`, text: "• SEVERELY FADED TRANSFORMER NAMEPLATE.", order: 0 },
        { id: `note_def_2`, text: "• LOOSE DISORGANIZED CABLES RESTING ON THE DIRTY FLOOR OF THE TRENCH BENEATH THE GRATING, WITH SEVERE PEELING PAINT AND WATER DAMAGE VISIBLE ON THE TRENCH WALL.", order: 3 }
      ] : [],
      images: []
    }))
  );

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);

  // Auto-dismiss status messages after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Hidden File Input References
  const replaceFileRef = useRef(null);
  const cameraFileRef = useRef(null);
  const [replaceTarget, setReplaceTarget] = useState({ sectionId: null, imageId: null });
  const [activeSectionIdForCamera, setActiveSectionIdForCamera] = useState(null);

  // Live Camera Stream Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment'); // 'environment' (rear) or 'user' (front)

  // Interactive Manual Crop Modal State
  const [cropModalState, setCropModalState] = useState({
    isOpen: false,
    sectionId: null,
    imageId: null,
    imageSrc: null,
    cropBox: { x: 5, y: 5, width: 90, height: 90 }
  });

  const cropContainerRef = useRef(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [activeHandle, setActiveHandle] = useState(null);

  // ---------------- FORM HANDLERS ----------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---------------- SECTION MANAGEMENT ----------------
  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    const newSec = {
      id: `sec_${Date.now()}`,
      title: newSectionTitle.trim(),
      order: sections.length,
      images: []
    };
    setSections([...sections, newSec]);
    setNewSectionTitle("");
  };

  const handleRemoveSection = (sectionId) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const handleSectionTitleChange = (sectionId, newTitle) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, title: newTitle } : s));
  };

  // ---------------- SECTION BULLET NOTES & SUBHEADINGS ----------------
  const handleAddSectionNote = (sectionId) => {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        const currentNotes = sec.notes || [];
        const newNote = {
          id: `note_${Date.now()}`,
          text: '• SEVERELY FADED TRANSFORMER NAMEPLATE.',
          order: currentNotes.length * 2
        };
        return {
          ...sec,
          notes: [...currentNotes, newNote]
        };
      }
      return sec;
    }));
  };

  const handleNoteTextChange = (sectionId, noteId, text) => {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          notes: (sec.notes || []).map(n => n.id === noteId ? { ...n, text } : n)
        };
      }
      return sec;
    }));
  };

  const handleReorderNote = (sectionId, noteIdx, delta) => {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        const notes = [...(sec.notes || [])];
        const targetIdx = noteIdx + delta;
        if (targetIdx < 0 || targetIdx >= notes.length) return sec;

        const temp = notes[noteIdx];
        notes[noteIdx] = notes[targetIdx];
        notes[targetIdx] = temp;

        notes.forEach((n, idx) => {
          n.order = idx * 2;
        });

        return { ...sec, notes };
      }
      return sec;
    }));
  };

  const handleRemoveNote = (sectionId, noteId) => {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          notes: (sec.notes || []).filter(n => n.id !== noteId)
        };
      }
      return sec;
    }));
  };

  // ---------------- LIVE & NATIVE CAMERA LOGIC ----------------
  const triggerNativeCamera = (sectionId) => {
    setActiveSectionIdForCamera(sectionId);
    if (cameraFileRef.current) {
      cameraFileRef.current.value = "";
      cameraFileRef.current.click();
    }
  };

  const startCameraStream = async (sectionId, mode = cameraFacingMode) => {
    setActiveSectionIdForCamera(sectionId);
    setIsCameraModalOpen(true);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: mode }, 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Direct MediaDevices stream unavailable. Triggering native mobile/device camera.", err);
      triggerNativeCamera(sectionId);
      setIsCameraModalOpen(false);
    }
  };

  const toggleCameraFacingMode = async () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    if (activeSectionIdForCamera) {
      await startCameraStream(activeSectionIdForCamera, nextMode);
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraModalOpen(false);
  };

  const capturePhotoFromStream = () => {
    if (!videoRef.current || !activeSectionIdForCamera) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `camera_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await handleAddImagesToSection(activeSectionIdForCamera, [file]);
      stopCameraStream();
    }, 'image/jpeg', 0.9);
  };

  // ---------------- CANVAS IMAGE TRANSFORMATION SUITE ----------------
  const processImageTransformations = (imageSource, rotation = 0, flipH = false, flipV = false, scale = 1.0, maxWidth = 1200) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let origW = img.width;
        let origH = img.height;

        let scaledW = origW * scale;
        let scaledH = origH * scale;

        const isRotated90 = (rotation / 90) % 2 !== 0;
        let canvasW = isRotated90 ? scaledH : scaledW;
        let canvasH = isRotated90 ? scaledW : scaledH;

        if (canvasW > maxWidth) {
          const ratio = maxWidth / canvasW;
          canvasW = maxWidth;
          canvasH = canvasH * ratio;
          scaledW = scaledW * ratio;
          scaledH = scaledH * ratio;
        }

        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');

        ctx.translate(canvasW / 2, canvasH / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.drawImage(img, -scaledW / 2, -scaledH / 2, scaledW, scaledH);

        canvas.toBlob((blob) => {
          const filename = imageSource.name || `photo_${Date.now()}.jpg`;
          const file = new File([blob], filename, { type: 'image/jpeg', lastModified: Date.now() });
          resolve({
            file,
            previewUrl: URL.createObjectURL(file)
          });
        }, 'image/jpeg', 0.88);
      };
    });
  };

  // ---------------- INTERACTIVE MANUAL CROP HANDLERS ----------------
  const openCropModal = (sectionId, imageId, imageSrc) => {
    setCropModalState({
      isOpen: true,
      sectionId,
      imageId,
      imageSrc,
      cropBox: { x: 5, y: 5, width: 90, height: 90 }
    });
  };

  const closeCropModal = () => {
    setCropModalState(prev => ({ ...prev, isOpen: false }));
    setIsDraggingCrop(false);
    setActiveHandle(null);
  };

  const handleCropMouseDown = (e, handle = 'move') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCrop(true);
    setActiveHandle(handle);
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleCropMouseMove = (e) => {
    if (!isDraggingCrop || !cropContainerRef.current) return;

    const containerRect = cropContainerRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - dragStartPos.x) / containerRect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartPos.y) / containerRect.height) * 100;

    setDragStartPos({ x: e.clientX, y: e.clientY });

    setCropModalState(prev => {
      let { x, y, width, height } = prev.cropBox;

      if (activeHandle === 'move') {
        x = Math.max(0, Math.min(100 - width, x + deltaXPercent));
        y = Math.max(0, Math.min(100 - height, y + deltaYPercent));
      } else if (activeHandle === 'br') {
        width = Math.max(10, Math.min(100 - x, width + deltaXPercent));
        height = Math.max(10, Math.min(100 - y, height + deltaYPercent));
      } else if (activeHandle === 'tl') {
        const newX = Math.max(0, Math.min(x + width - 10, x + deltaXPercent));
        const newY = Math.max(0, Math.min(y + height - 10, y + deltaYPercent));
        width += (x - newX);
        height += (y - newY);
        x = newX;
        y = newY;
      } else if (activeHandle === 'tr') {
        width = Math.max(10, Math.min(100 - x, width + deltaXPercent));
        const newY = Math.max(0, Math.min(y + height - 10, y + deltaYPercent));
        height += (y - newY);
        y = newY;
      } else if (activeHandle === 'bl') {
        const newX = Math.max(0, Math.min(x + width - 10, x + deltaXPercent));
        width += (x - newX);
        x = newX;
        height = Math.max(10, Math.min(100 - y, height + deltaYPercent));
      }

      return {
        ...prev,
        cropBox: { x, y, width, height }
      };
    });
  };

  const handleCropMouseUp = () => {
    setIsDraggingCrop(false);
    setActiveHandle(null);
  };

  useEffect(() => {
    if (isDraggingCrop) {
      window.addEventListener('mousemove', handleCropMouseMove);
      window.addEventListener('mouseup', handleCropMouseUp);
    } else {
      window.removeEventListener('mousemove', handleCropMouseMove);
      window.removeEventListener('mouseup', handleCropMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleCropMouseMove);
      window.removeEventListener('mouseup', handleCropMouseUp);
    };
  }, [isDraggingCrop, dragStartPos, activeHandle]);

  const applyCrop = () => {
    const { sectionId, imageId, imageSrc, cropBox } = cropModalState;
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const cropX = (cropBox.x / 100) * img.width;
      const cropY = (cropBox.y / 100) * img.height;
      const cropW = (cropBox.width / 100) * img.width;
      const cropH = (cropBox.height / 100) * img.height;

      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      canvas.toBlob((blob) => {
        const croppedFile = new File([blob], `manual_cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const croppedUrl = URL.createObjectURL(croppedFile);

        setSections(sections.map(sec => {
          if (sec.id === sectionId) {
            return {
              ...sec,
              images: sec.images.map(i => {
                if (i.id === imageId) {
                  return {
                    ...i,
                    file: croppedFile,
                    originalSource: croppedFile,
                    previewUrl: croppedUrl
                  };
                }
                return i;
              })
            };
          }
          return sec;
        }));

        closeCropModal();
      }, 'image/jpeg', 0.9);
    };
  };

  // ---------------- PHOTO ADDITION & REORDERING ----------------
  const handleAddImagesToSection = async (sectionId, files) => {
    if (!files || files.length === 0) return;

    const newImages = [];
    for (let i = 0; i < files.length; i++) {
      const processed = await processImageTransformations(files[i]);
      newImages.push({
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file: processed.file,
        originalSource: files[i],
        previewUrl: processed.previewUrl,
        subtitle: "",
        caption: "",
        rotation: 0,
        flipH: false,
        flipV: false,
        scale: 1.0,
        order: Date.now() + i
      });
    }

    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, images: [...sec.images, ...newImages] };
      }
      return sec;
    }));
  };

  const handleReorderImage = (sectionId, imageIndex, direction) => {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        const newImages = [...sec.images];
        const targetIndex = imageIndex + direction;
        if (targetIndex >= 0 && targetIndex < newImages.length) {
          const temp = newImages[imageIndex];
          newImages[imageIndex] = newImages[targetIndex];
          newImages[targetIndex] = temp;
        }
        return { ...sec, images: newImages };
      }
      return sec;
    }));
  };

  // ---------------- REAL-TIME SCALE & TRANSFORM UPDATES ----------------
  const handleApplyTransform = (sectionId, imageId, transformUpdates) => {
    setSections(currentSections => currentSections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          images: sec.images.map(img => {
            if (img.id === imageId) {
              const updated = { ...img, ...transformUpdates };
              
              processImageTransformations(
                img.originalSource || img.previewUrl,
                updated.rotation,
                updated.flipH,
                updated.flipV,
                updated.scale
              ).then(processed => {
                setSections(latestSections => latestSections.map(s => {
                  if (s.id === sectionId) {
                    return {
                      ...s,
                      images: s.images.map(i => i.id === imageId ? { ...i, file: processed.file } : i)
                    };
                  }
                  return s;
                }));
              });

              return updated;
            }
            return img;
          })
        };
      }
      return sec;
    }));
  };

  const handleRemoveImage = (sectionId, imageId) => {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, images: sec.images.filter(img => img.id !== imageId) };
      }
      return sec;
    }));
  };

  const handleTriggerReplace = (sectionId, imageId) => {
    setReplaceTarget({ sectionId, imageId });
    if (replaceFileRef.current) {
      replaceFileRef.current.click();
    }
  };

  const handleExecuteReplace = async (e) => {
    const file = e.target.files[0];
    if (!file || !replaceTarget.sectionId || !replaceTarget.imageId) return;

    const processed = await processImageTransformations(file);

    setSections(sections.map(sec => {
      if (sec.id === replaceTarget.sectionId) {
        return {
          ...sec,
          images: sec.images.map(img => {
            if (img.id === replaceTarget.imageId) {
              return {
                ...img,
                file: processed.file,
                originalSource: file,
                previewUrl: processed.previewUrl,
                rotation: 0,
                flipH: false,
                flipV: false,
                scale: 1.0
              };
            }
            return img;
          })
        };
      }
      return sec;
    }));

    setReplaceTarget({ sectionId: null, imageId: null });
    e.target.value = null;
  };

  const handleSaveToGallery = (previewUrl, filename) => {
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = filename || `inspection_photo_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSubtitleChange = (sectionId, imageId, subtitle) => {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          images: sec.images.map(img => img.id === imageId ? { ...img, subtitle } : img)
        };
      }
      return sec;
    }));
  };

  const handleCaptionChange = (sectionId, imageId, caption) => {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          images: sec.images.map(img => img.id === imageId ? { ...img, caption } : img)
        };
      }
      return sec;
    }));
  };

  // ---------------- API EXPORT & DIRECT BLOB DOWNLOAD HANDLERS ----------------
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const handleSubmitReport = async () => {
    if (!formData.substation_id.trim()) {
      setStatusMessage({ type: 'error', text: 'Substation ID is required!' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setStatusMessage(null);

    try {
      const payloadObj = {
        ...formData,
        sections: sections.map((sec, sIdx) => ({
          title: sec.title,
          order: sIdx,
          notes: (sec.notes || []).map((n, nIdx) => ({
            text: n.text,
            order: n.order !== undefined ? n.order : nIdx * 2
          })),
          images: sec.images.map((img, iIdx) => ({
            subtitle: img.subtitle,
            caption: img.caption,
            order: img.order !== undefined ? img.order : (iIdx * 2 + 1),
            file_key: `image_s${sIdx}_i${iIdx}`
          }))
        }))
      };

      const multipartData = new FormData();
      multipartData.append('payload', JSON.stringify(payloadObj));

      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        for (let iIdx = 0; iIdx < sec.images.length; iIdx++) {
          const img = sec.images[iIdx];
          let fileToUpload = img.file;

          if (!fileToUpload && img.previewUrl) {
            try {
              const res = await fetch(img.previewUrl);
              const blob = await res.blob();
              fileToUpload = new File([blob], `photo_s${sIdx}_i${iIdx}.jpg`, { type: 'image/jpeg' });
            } catch (fetchErr) {
              console.error("Failed to fetch image blob:", fetchErr);
            }
          }

          if (fileToUpload) {
            multipartData.append(`image_s${sIdx}_i${iIdx}`, fileToUpload);
          }
        }
      }

      const response = await axios.post(`${API_BASE}/api/reports/`, multipartData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      setGeneratedReport(response.data);
      setStatusMessage({ type: 'success', text: 'Report generated successfully! Click below to download Word or PDF directly.' });
    } catch (err) {
      console.error(err);
      setStatusMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Failed to submit inspection report. Please verify server connection.' 
      });
    } finally {
      setUploading(false);
    }
  };

  // DIRECT FILE DOWNLOAD WITHOUT PAGE NAVIGATION OR NEW TABS
  const handleDirectDownloadFile = async (format) => {
    if (!generatedReport) return;
    
    const rawUrl = format === 'docx' ? generatedReport.docx_url : generatedReport.pdf_url;
    const url = rawUrl.startsWith('http') ? rawUrl : `${API_BASE}${rawUrl}`;
    const defaultFilename = `InspectionReport_${generatedReport.substation_id}.${format}`;

    setDownloadingFormat(format);
    setStatusMessage(null);

    try {
      const response = await axios.get(url, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: format === 'docx' 
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
          : 'application/pdf'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', defaultFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setStatusMessage({ type: 'success', text: `${format.toUpperCase()} downloaded successfully to your device!` });
    } catch (err) {
      console.error(err);
      if (format === 'pdf') {
        setStatusMessage({ 
          type: 'error', 
          text: 'PDF conversion requires LibreOffice installed on host. You can download the Word (.docx) report directly!' 
        });
      } else {
        setStatusMessage({ 
          type: 'error', 
          text: `Failed to download ${format.toUpperCase()} file. Please check server.` 
        });
      }
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={replaceFileRef} 
        onChange={handleExecuteReplace} 
        accept="image/*" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={cameraFileRef} 
        accept="image/*" 
        capture="environment"
        onChange={(e) => activeSectionIdForCamera && handleAddImagesToSection(activeSectionIdForCamera, e.target.files)} 
        className="hidden" 
      />

      {/* HEADER BANNER */}
      <header className="glass-card p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden bg-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[#003366]">
                <Building2 className="w-7 h-7" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  Substation Condition Monitoring System
                  <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-[#003366] border border-blue-200">
                    TAQA & DELTA STAR Spec
                  </span>
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">
                  Site Inspection Data Portal & High-Resolution Report Engine (DOCX / PDF)
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleSubmitReport}
              disabled={uploading}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#003366] hover:bg-[#002244] text-white font-semibold rounded-xl shadow-md shadow-blue-900/10 transition-all disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Processing ({uploadProgress}%)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-blue-200" />
                  <span>Compile & Build Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* STATUS ALERTS WITH AUTO-DISMISS AFTER 3 SECONDS */}
      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 border transition-all animate-fade-in ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
            : 'bg-rose-50 border-rose-300 text-rose-800'
        }`}>
          <div className="flex items-center gap-3">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-600" /> : <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-600" />}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* DOWNLOAD ACTIONS BANNER IF GENERATED */}
      {generatedReport && (
        <div className="glass-card p-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Report Compiled Successfully!</h3>
              <p className="text-slate-600 text-sm">Substation ID: <strong className="text-emerald-800">{generatedReport.substation_id}</strong></p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => handleDirectDownloadFile('docx')}
              disabled={downloadingFormat === 'docx'}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-all disabled:opacity-50"
            >
              {downloadingFormat === 'docx' ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              <span>Download Word (.docx)</span>
            </button>
            <button
              onClick={() => handleDirectDownloadFile('pdf')}
              disabled={downloadingFormat === 'pdf'}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium shadow-sm transition-all disabled:opacity-50"
            >
              {downloadingFormat === 'pdf' ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: COVER DETAILS FORM */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-2xl space-y-5 bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <ShieldCheck className="w-5 h-5 text-[#003366]" />
              <h2 className="font-bold text-slate-900 text-lg">1. Cover Metadata</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Project Name</label>
                <input 
                  type="text" 
                  name="project_name" 
                  value={formData.project_name} 
                  onChange={handleInputChange} 
                  className="w-full px-3.5 py-2 rounded-lg glass-input text-xs font-medium" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Client</label>
                  <input 
                    type="text" 
                    name="client" 
                    value={formData.client} 
                    onChange={handleInputChange} 
                    className="w-full px-3.5 py-2 rounded-lg glass-input text-xs" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Contractor</label>
                  <input 
                    type="text" 
                    name="contractor" 
                    value={formData.contractor} 
                    onChange={handleInputChange} 
                    className="w-full px-3.5 py-2 rounded-lg glass-input text-xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Substation ID *</label>
                  <input 
                    type="text" 
                    name="substation_id" 
                    value={formData.substation_id} 
                    onChange={handleInputChange} 
                    placeholder="e.g. E19C106"
                    className="w-full px-3.5 py-2 rounded-lg glass-input text-sm font-bold text-[#003366]" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Inspection Date</label>
                  <input 
                    type="date" 
                    name="date_of_inspection" 
                    value={formData.date_of_inspection} 
                    onChange={handleInputChange} 
                    className="w-full px-3.5 py-2 rounded-lg glass-input text-xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Work Order</label>
                  <input 
                    type="text" 
                    name="work_order" 
                    value={formData.work_order} 
                    onChange={handleInputChange} 
                    className="w-full px-3.5 py-2 rounded-lg glass-input text-xs" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">EWO Number</label>
                  <input 
                    type="text" 
                    name="ewo" 
                    value={formData.ewo} 
                    onChange={handleInputChange} 
                    className="w-full px-3.5 py-2 rounded-lg glass-input text-xs" 
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 text-xs font-bold uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-[#003366]" />
                  <span>Personnel Approvals</span>
                </div>
                <div className="space-y-2">
                  <input 
                    type="text" 
                    name="prepared_by" 
                    value={formData.prepared_by} 
                    onChange={handleInputChange} 
                    placeholder="Prepared By" 
                    className="w-full px-3 py-1.5 rounded-lg glass-input text-xs" 
                  />
                  <input 
                    type="text" 
                    name="verified_by" 
                    value={formData.verified_by} 
                    onChange={handleInputChange} 
                    placeholder="Verified By" 
                    className="w-full px-3 py-1.5 rounded-lg glass-input text-xs" 
                  />
                  <input 
                    type="text" 
                    name="maximo_entry_by" 
                    value={formData.maximo_entry_by} 
                    onChange={handleInputChange} 
                    placeholder="MAXIMO Entry By" 
                    className="w-full px-3 py-1.5 rounded-lg glass-input text-xs" 
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Scope Brief (Section 1)</label>
                  <textarea 
                    name="brief_text" 
                    value={formData.brief_text} 
                    onChange={handleInputChange} 
                    rows={2} 
                    className="w-full px-3.5 py-2 rounded-lg glass-input text-xs resize-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Summary Findings (Section 2)</label>
                  <textarea 
                    name="summary_findings" 
                    value={formData.summary_findings} 
                    onChange={handleInputChange} 
                    rows={4} 
                    className="w-full px-3.5 py-2 rounded-lg glass-input text-xs resize-none" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DYNAMIC SECTIONS & PHOTO MANIPULATION SUITE */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#003366]" />
                <h2 className="font-bold text-slate-900 text-lg">2. Report Sections & Photo Evidence</h2>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input 
                  type="text" 
                  value={newSectionTitle} 
                  onChange={(e) => setNewSectionTitle(e.target.value)} 
                  placeholder="New Section Title..." 
                  className="px-3 py-1.5 rounded-lg glass-input text-xs w-full sm:w-48" 
                />
                <button 
                  onClick={handleAddSection} 
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-all flex-shrink-0 shadow-sm"
                >
                  <Plus className="w-4 h-4 text-blue-300" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* SECTION CARDS */}
            <div className="space-y-6">
              {sections.map((section, sIdx) => (
                <div key={section.id} className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-6 h-6 rounded-md bg-blue-100 text-[#003366] font-bold text-xs flex items-center justify-center border border-blue-200">
                        {sIdx + 1}
                      </span>
                      <input 
                        type="text" 
                        value={section.title} 
                        onChange={(e) => handleSectionTitleChange(section.id, e.target.value)} 
                        className="bg-transparent text-slate-900 font-bold text-base focus:outline-none focus:border-b focus:border-[#003366] px-1 py-0.5 w-full" 
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddSectionNote(section.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-all shadow-sm"
                        title="Add Subheading, Bullet Point or Text Block"
                      >
                        <Type className="w-4 h-4 text-emerald-600" />
                        <span className="hidden sm:inline">+ Bullet / Note</span>
                      </button>

                      <button
                        onClick={() => handleRemoveSection(section.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* SECTION SUBHEADINGS & BULLET POINT NOTES */}
                  {section.notes && section.notes.length > 0 && (
                    <div className="space-y-2 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <Type className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Section Subheadings & Bullet Points</span>
                      </div>
                      {section.notes.map((note, nIdx) => (
                        <div key={note.id} className="flex items-start gap-2 bg-emerald-50/60 border border-emerald-200 rounded-lg p-2.5">
                          <span className="text-emerald-700 font-bold text-sm flex-shrink-0 mt-1">•</span>
                          <textarea
                            value={note.text}
                            onChange={(e) => handleNoteTextChange(section.id, note.id, e.target.value)}
                            placeholder="Type bullet point (•), subheading, or text note..."
                            rows={2}
                            className="flex-1 bg-white border border-emerald-200 rounded-md p-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
                          />
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleReorderNote(section.id, nIdx, -1)}
                              disabled={nIdx === 0}
                              className="p-1 text-slate-500 hover:text-emerald-700 disabled:opacity-30 rounded hover:bg-emerald-100/50"
                              title="Move Up"
                            >
                              <ArrowLeft className="w-3.5 h-3.5 rotate-90" />
                            </button>
                            <button
                              onClick={() => handleReorderNote(section.id, nIdx, 1)}
                              disabled={nIdx === section.notes.length - 1}
                              className="p-1 text-slate-500 hover:text-emerald-700 disabled:opacity-30 rounded hover:bg-emerald-100/50"
                              title="Move Down"
                            >
                              <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveNote(section.id, note.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0"
                            title="Remove Note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PHOTO GRID CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.images.map((img, imgIdx) => (
                      <div key={img.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between space-y-3 p-3">
                        {/* OPTIONAL SUB-HEADING / NAME ON TOP */}
                        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                          <Type className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <input
                            type="text"
                            value={img.subtitle || ''}
                            onChange={(e) => handleSubtitleChange(section.id, img.id, e.target.value)}
                            placeholder="Photo Name / Sub-heading (e.g. KTR01, 3.1 Substation)..."
                            className="w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-none border-b border-transparent focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
                          />
                        </div>

                        {/* IMAGE CONTAINER & LIVE DYNAMIC CSS TRANSFORM DISPLAY */}
                        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                          <img 
                            src={img.previewUrl} 
                            alt="Inspection evidence" 
                            style={{
                              transform: `scale(${img.scale}) rotate(${img.rotation}deg) ${img.flipH ? 'scaleX(-1)' : ''} ${img.flipV ? 'scaleY(-1)' : ''}`,
                              transition: 'transform 0.15s ease-out'
                            }}
                            className="max-w-full max-h-full object-contain" 
                          />

                          {/* REORDER BUTTONS */}
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-lg border border-slate-200 shadow-sm z-10">
                            <button
                              onClick={() => handleReorderImage(section.id, imgIdx, -1)}
                              disabled={imgIdx === 0}
                              className="p-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-30 transition-colors"
                              title="Move Left / Previous"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-bold text-slate-500 px-1">{imgIdx + 1}</span>
                            <button
                              onClick={() => handleReorderImage(section.id, imgIdx, 1)}
                              disabled={imgIdx === section.images.length - 1}
                              className="p-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-30 transition-colors"
                              title="Move Right / Next"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* TOP-RIGHT ACTIONS */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-lg border border-slate-200 shadow-sm z-10">
                            <button
                              onClick={() => openCropModal(section.id, img.id, img.previewUrl)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                              title="Crop Photo"
                            >
                              <Crop className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleTriggerReplace(section.id, img.id)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                              title="Replace Image"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleSaveToGallery(img.previewUrl, `inspection_${section.title.replace(/[^a-zA-Z0-9]/g, '_')}_${img.id}.jpg`)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              title="Save to Device Gallery"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveImage(section.id, img.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* TRANSFORM TOOLBAR */}
                          <div className="absolute bottom-2 inset-x-2 flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-white border border-slate-700 shadow-lg z-10">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleApplyTransform(section.id, img.id, { rotation: (img.rotation + 90) % 360 })}
                                className="p-1 hover:bg-slate-700 rounded text-slate-200 hover:text-white transition-colors"
                                title="Rotate 90° Clockwise"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleApplyTransform(section.id, img.id, { flipH: !img.flipH })}
                                className={`p-1 rounded transition-colors ${img.flipH ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-200'}`}
                                title="Flip Horizontal"
                              >
                                <FlipHorizontal className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleApplyTransform(section.id, img.id, { flipV: !img.flipV })}
                                className={`p-1 rounded transition-colors ${img.flipV ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-200'}`}
                                title="Flip Vertical"
                              >
                                <FlipVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* ZOOM IN & ZOOM OUT CONTROLS */}
                            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                              <button
                                onClick={() => {
                                  const newScale = Math.max(0.3, Math.round((img.scale - 0.15) * 100) / 100);
                                  handleApplyTransform(section.id, img.id, { scale: newScale });
                                }}
                                className="p-1 hover:bg-slate-600 active:bg-blue-600 rounded text-slate-200 hover:text-white transition-colors"
                                title="Zoom Out (Decrease Size)"
                              >
                                <ZoomOut className="w-3.5 h-3.5" />
                              </button>

                              <span className="text-[11px] font-mono font-semibold text-slate-200 min-w-[36px] text-center">
                                {Math.round(img.scale * 100)}%
                              </span>

                              <button
                                onClick={() => {
                                  const newScale = Math.min(2.5, Math.round((img.scale + 0.15) * 100) / 100);
                                  handleApplyTransform(section.id, img.id, { scale: newScale });
                                }}
                                className="p-1 hover:bg-slate-600 active:bg-blue-600 rounded text-slate-200 hover:text-white transition-colors"
                                title="Zoom In (Increase Size)"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div>
                          <textarea
                            value={img.caption}
                            onChange={(e) => handleCaptionChange(section.id, img.id, e.target.value)}
                            placeholder="Defect or Component Description..."
                            rows={2}
                            className="w-full px-3 py-1.5 rounded-lg glass-input text-xs resize-none"
                          />
                        </div>
                      </div>
                    ))}

                    {/* UPLOAD / CAMERA TRIGGER BOX */}
                    <div className="border-2 border-dashed border-slate-300 hover:border-[#003366] bg-white hover:bg-blue-50/40 transition-all rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 relative min-h-[240px]">
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={(e) => handleAddImagesToSection(section.id, e.target.files)} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                      />
                      <div className="p-3 bg-blue-50 text-[#003366] rounded-full border border-blue-200">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Click or drag photos here
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Supports multi-file upload & direct mobile camera
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2 mt-3 relative z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerNativeCamera(section.id);
                          }}
                          className="px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Open native mobile/laptop camera app directly"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-blue-200" />
                          <span>Native Device Camera</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startCameraStream(section.id);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Open live web camera preview modal"
                        >
                          <Camera className="w-3.5 h-3.5 text-slate-600" />
                          <span>Live Preview WebCam</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LIVE CAMERA WEBCAM MODAL */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-[#003366] rounded-lg">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Live Device Camera Capture</h3>
                  <p className="text-xs text-slate-500">
                    Active Mode: <span className="font-semibold text-[#003366] uppercase">{cameraFacingMode === 'environment' ? 'Rear / Back Camera' : 'Front / Selfie Camera'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleCameraFacingMode}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Switch between Front and Rear camera"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#003366]" />
                  <span>Switch Front/Back</span>
                </button>

                <button 
                  onClick={stopCameraStream} 
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Feed Area - Large & Responsive */}
            <div className="relative bg-black flex items-center justify-center overflow-hidden flex-1 min-h-[350px] max-h-[60vh]">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-contain" 
              />
              <div className="absolute top-3 left-3 bg-black/60 text-white text-[11px] px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span>Live Stream ({cameraFacingMode === 'environment' ? 'Back' : 'Front'})</span>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  if (activeSectionIdForCamera) {
                    triggerNativeCamera(activeSectionIdForCamera);
                  }
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-[#003366]" />
                <span>Open Mobile Native Camera App</span>
              </button>

              <div className="flex items-center gap-3">
                <button 
                  onClick={stopCameraStream} 
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={capturePhotoFromStream} 
                  className="px-5 py-2.5 bg-[#003366] hover:bg-[#002244] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Snapshot</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE MANUAL CROP MODAL */}
      {cropModalState.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-[#003366]" />
                <h3 className="font-bold text-slate-900 text-base">Interactive Manual Photo Cropper</h3>
              </div>
              <button 
                onClick={closeCropModal} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Drag the crop window or resize its corner handles manually to frame your photo:
            </p>

            <div 
              ref={cropContainerRef}
              className="relative aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center select-none cursor-crosshair"
            >
              <img 
                src={cropModalState.imageSrc} 
                alt="Crop target" 
                className="w-full h-full object-contain opacity-40 pointer-events-none" 
              />
              
              <div 
                onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                className="absolute border-2 border-dashed border-sky-400 bg-sky-400/25 shadow-2xl rounded-sm cursor-move flex items-center justify-center"
                style={{
                  top: `${cropModalState.cropBox.y}%`,
                  left: `${cropModalState.cropBox.x}%`,
                  width: `${cropModalState.cropBox.width}%`,
                  height: `${cropModalState.cropBox.height}%`
                }}
              >
                <span className="bg-sky-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none flex items-center gap-1">
                  <Move className="w-3 h-3" />
                  <span>Drag & Resize Area</span>
                </span>

                <div 
                  onMouseDown={(e) => handleCropMouseDown(e, 'tl')}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-600 rounded-sm cursor-nwse-resize shadow"
                />
                <div 
                  onMouseDown={(e) => handleCropMouseDown(e, 'tr')}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-600 rounded-sm cursor-nesw-resize shadow"
                />
                <div 
                  onMouseDown={(e) => handleCropMouseDown(e, 'bl')}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-600 rounded-sm cursor-nesw-resize shadow"
                />
                <div 
                  onMouseDown={(e) => handleCropMouseDown(e, 'br')}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-600 rounded-sm cursor-nwse-resize shadow"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 text-xs">
              <button
                onClick={() => setCropModalState(prev => ({ ...prev, cropBox: { x: 5, y: 5, width: 90, height: 90 } }))}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Full Frame</span>
              </button>

              <span className="text-[11px] font-mono text-slate-400">
                Box: {Math.round(cropModalState.cropBox.width)}% × {Math.round(cropModalState.cropBox.height)}%
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button 
                onClick={closeCropModal} 
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={applyCrop} 
                className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Apply Crop</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportBuilder;
