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
  ChevronUp,
  ChevronDown,
  Type,
  Crop,
  X,
  Check,
  Smartphone,
  Copy,
  BookOpen,
  LayoutGrid
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : 'https://azizreport-backend.onrender.com'
);

const INITIAL_SECTIONS_CONFIG = [
  {
    title: "3. Civil",
    pages: [
      { subtitle: "3.1 Substation Outside" }
    ]
  },
  {
    title: "3.2 Transformers",
    pages: [
      { subtitle: "3.2.1 Unit Overview" }
    ]
  },
  {
    title: "3.3 Switchgear",
    pages: [
      { subtitle: "3.2 SWITCH GEAR" }
    ]
  },
  {
    title: "4. Partial Discharge",
    pages: [
      { subtitle: "4.1 PD Activity Testing" }
    ]
  },
  {
    title: "5. Thermal Image",
    pages: [
      { subtitle: "5.1 Thermal Scanning" }
    ]
  },
  {
    title: "6. Photos of Defect Findings",
    pages: [
      {
        subtitle: "6.1 Defect Observations",
        notes: [
          { id: "note_def_1", text: "• SEVERELY FADED TRANSFORMER NAMEPLATE.", order: 0 },
          { id: "note_def_2", text: "• LOOSE DISORGANIZED CABLES RESTING ON THE DIRTY FLOOR OF THE TRENCH BENEATH THE GRATING.", order: 1 }
        ]
      }
    ]
  }
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
    INITIAL_SECTIONS_CONFIG.map((cfg, sIdx) => ({
      id: `sec_${Date.now()}_${sIdx}`,
      title: cfg.title,
      order: sIdx,
      pages: cfg.pages.map((pCfg, pIdx) => ({
        id: `page_${Date.now()}_${sIdx}_${pIdx}`,
        pageNumber: pIdx + 1,
        subtitle: pCfg.subtitle || "",
        notes: pCfg.notes || [],
        images: []
      }))
    }))
  );

  // Active page selected tab per section { [sectionId]: pageId }
  const [activePageIdPerSection, setActivePageIdPerSection] = useState({});

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);

  // Hidden File Input References
  const replaceFileRef = useRef(null);
  const cameraFileRef = useRef(null);
  const [replaceTarget, setReplaceTarget] = useState({ sectionId: null, pageId: null, imageId: null });
  const [activeTargetForCamera, setActiveTargetForCamera] = useState({ sectionId: null, pageId: null });

  // Live Camera Stream Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment'); // 'environment' (rear) or 'user' (front)

  // Interactive Manual Crop Modal State
  const [cropModalState, setCropModalState] = useState({
    isOpen: false,
    sectionId: null,
    pageId: null,
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
    const newSecId = `sec_${Date.now()}`;
    const newPageId = `page_${Date.now()}_0`;
    const newSec = {
      id: newSecId,
      title: newSectionTitle.trim(),
      order: sections.length,
      pages: [
        {
          id: newPageId,
          pageNumber: 1,
          subtitle: "",
          notes: [],
          images: []
        }
      ]
    };
    setSections([...sections, newSec]);
    setActivePageIdPerSection(prev => ({ ...prev, [newSecId]: newPageId }));
    setNewSectionTitle("");
  };

  const handleRemoveSection = (sectionId) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const handleSectionTitleChange = (sectionId, newTitle) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, title: newTitle } : s));
  };

  const handleReorderSection = (sIdx, direction) => {
    const targetIdx = sIdx + direction;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const updated = [...sections];
    const temp = updated[sIdx];
    updated[sIdx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSections(updated.map((sec, idx) => ({ ...sec, order: idx })));
  };

  // ---------------- PAGE MANAGEMENT PER SECTION ----------------
  const getActivePageId = (section) => {
    if (!section.pages || section.pages.length === 0) return null;
    const currentActive = activePageIdPerSection[section.id];
    if (currentActive && section.pages.some(p => p.id === currentActive)) {
      return currentActive;
    }
    return section.pages[0].id;
  };

  const handleSelectPageTab = (sectionId, pageId) => {
    setActivePageIdPerSection(prev => ({ ...prev, [sectionId]: pageId }));
  };

  const handleAddPageToSection = (sectionId) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        const nextNum = (sec.pages?.length || 0) + 1;
        const newPageId = `page_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const newPage = {
          id: newPageId,
          pageNumber: nextNum,
          subtitle: "",
          notes: [],
          images: []
        };
        setActivePageIdPerSection(curr => ({ ...curr, [sectionId]: newPageId }));
        return {
          ...sec,
          pages: [...(sec.pages || []), newPage]
        };
      }
      return sec;
    }));
  };

  const handleRemovePage = (sectionId, pageId) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        if (sec.pages.length <= 1) {
          // If only 1 page, reset images and subtitle rather than deleting the last page
          return {
            ...sec,
            pages: [{
              ...sec.pages[0],
              subtitle: "",
              notes: [],
              images: []
            }]
          };
        }
        const filtered = sec.pages.filter(p => p.id !== pageId);
        const renumbered = filtered.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
        setActivePageIdPerSection(curr => ({ ...curr, [sectionId]: renumbered[0].id }));
        return { ...sec, pages: renumbered };
      }
      return sec;
    }));
  };

  const handleReorderPage = (sectionId, pageIdx, direction) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        const targetIdx = pageIdx + direction;
        if (targetIdx < 0 || targetIdx >= sec.pages.length) return sec;
        const updated = [...sec.pages];
        const temp = updated[pageIdx];
        updated[pageIdx] = updated[targetIdx];
        updated[targetIdx] = temp;
        const renumbered = updated.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
        return { ...sec, pages: renumbered };
      }
      return sec;
    }));
  };

  const handlePageSubtitleChange = (sectionId, pageId, subtitle) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          pages: sec.pages.map(p => p.id === pageId ? { ...p, subtitle } : p)
        };
      }
      return sec;
    }));
  };

  // ---------------- PAGE NOTES & BULLETS ----------------
  const handleAddPageNote = (sectionId, pageId) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          pages: sec.pages.map(p => {
            if (p.id === pageId) {
              const currentNotes = p.notes || [];
              const newNote = {
                id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                text: '• ',
                order: currentNotes.length
              };
              return { ...p, notes: [...currentNotes, newNote] };
            }
            return p;
          })
        };
      }
      return sec;
    }));
  };

  const handlePageNoteTextChange = (sectionId, pageId, noteId, text) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          pages: sec.pages.map(p => {
            if (p.id === pageId) {
              return {
                ...p,
                notes: (p.notes || []).map(n => n.id === noteId ? { ...n, text } : n)
              };
            }
            return p;
          })
        };
      }
      return sec;
    }));
  };

  const handleRemovePageNote = (sectionId, pageId, noteId) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          pages: sec.pages.map(p => {
            if (p.id === pageId) {
              return {
                ...p,
                notes: (p.notes || []).filter(n => n.id !== noteId)
              };
            }
            return p;
          })
        };
      }
      return sec;
    }));
  };

  // ---------------- LIVE & NATIVE CAMERA LOGIC ----------------
  const triggerNativeCamera = (sectionId, pageId) => {
    setActiveTargetForCamera({ sectionId, pageId });
    if (cameraFileRef.current) {
      cameraFileRef.current.value = "";
      cameraFileRef.current.click();
    }
  };

  const startCameraStream = async (sectionId, pageId, mode = cameraFacingMode) => {
    setActiveTargetForCamera({ sectionId, pageId });
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
      triggerNativeCamera(sectionId, pageId);
      setIsCameraModalOpen(false);
    }
  };

  const toggleCameraFacingMode = async () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    if (activeTargetForCamera.sectionId && activeTargetForCamera.pageId) {
      await startCameraStream(activeTargetForCamera.sectionId, activeTargetForCamera.pageId, nextMode);
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
    if (!videoRef.current || !activeTargetForCamera.sectionId || !activeTargetForCamera.pageId) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `camera_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await handleAddImagesToPage(activeTargetForCamera.sectionId, activeTargetForCamera.pageId, [file]);
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
  const openCropModal = (sectionId, pageId, imageId, imageSrc) => {
    setCropModalState({
      isOpen: true,
      sectionId,
      pageId,
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

  const getEventClientPos = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX || 0, y: e.clientY || 0 };
  };

  const handleCropStart = (e, handle = 'move') => {
    e.stopPropagation();
    const pos = getEventClientPos(e);
    setIsDraggingCrop(true);
    setActiveHandle(handle);
    setDragStartPos(pos);
  };

  const handleCropMove = (e) => {
    if (!isDraggingCrop || !cropContainerRef.current) return;
    if (e.cancelable && e.type.startsWith('touch')) {
      e.preventDefault();
    }

    const pos = getEventClientPos(e);
    const containerRect = cropContainerRef.current.getBoundingClientRect();
    if (!containerRect.width || !containerRect.height) return;

    const deltaXPercent = ((pos.x - dragStartPos.x) / containerRect.width) * 100;
    const deltaYPercent = ((pos.y - dragStartPos.y) / containerRect.height) * 100;

    setDragStartPos(pos);

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

  const handleCropEnd = () => {
    setIsDraggingCrop(false);
    setActiveHandle(null);
  };

  useEffect(() => {
    if (isDraggingCrop) {
      window.addEventListener('mousemove', handleCropMove);
      window.addEventListener('mouseup', handleCropEnd);
      window.addEventListener('touchmove', handleCropMove, { passive: false });
      window.addEventListener('touchend', handleCropEnd);
      window.addEventListener('touchcancel', handleCropEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleCropMove);
      window.removeEventListener('mouseup', handleCropEnd);
      window.removeEventListener('touchmove', handleCropMove);
      window.removeEventListener('touchend', handleCropEnd);
      window.removeEventListener('touchcancel', handleCropEnd);
    };
  }, [isDraggingCrop, dragStartPos, activeHandle]);

  const applyCrop = () => {
    const { sectionId, pageId, imageId, imageSrc, cropBox } = cropModalState;
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

        setSections(prev => prev.map(sec => {
          if (sec.id === sectionId) {
            return {
              ...sec,
              pages: sec.pages.map(p => {
                if (p.id === pageId) {
                  return {
                    ...p,
                    images: p.images.map(i => {
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
                return p;
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
  const handleAddImagesToPage = async (sectionId, pageId, files) => {
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

    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          pages: sec.pages.map(p => {
            if (p.id === pageId) {
              return { ...p, images: [...p.images, ...newImages] };
            }
            return p;
          })
        };
      }
      return sec;
    }));
  };

  const handleReorderImage = (sectionId, pageId, imageIndex, direction) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          pages: sec.pages.map(p => {
            if (p.id === pageId) {
              const newImages = [...p.images];
              const targetIndex = imageIndex + direction;
              if (targetIndex >= 0 && targetIndex < newImages.length) {
                const temp = newImages[imageIndex];
                newImages[imageIndex] = newImages[targetIndex];
                newImages[targetIndex] = temp;
              }
              return { ...p, images: newImages };
            }
            return p;
          })
        };
      }
      return sec;
    }));
  };

  const handleMoveImageToPage = (sectionId, fromPageId, toPageId, imageId) => {
    if (fromPageId === toPageId) return;
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        let movedImage = null;
        const updatedPages = sec.pages.map(p => {
          if (p.id === fromPageId) {
            movedImage = p.images.find(img => img.id === imageId);
            return { ...p, images: p.images.filter(img => img.id !== imageId) };
          }
          return p;
        });

        if (movedImage) {
          return {
            ...sec,
            pages: updatedPages.map(p => {
              if (p.id === toPageId) {
                return { ...p, images: [...p.images, movedImage] };
              }
              return p;
            })
          };
        }
      }
      return sec;
    }));
  };

  const handleRemoveImage = (sectionId, pageId, imageId) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          pages: sec.pages.map(p => {
            if (p.id === pageId) {
              return { ...p, images: p.images.filter(img => img.id !== imageId) };
            }
            return p;
          })
        };
      }
      return sec;
    }));
  };

  // ---------------- REAL-TIME SCALE & TRANSFORM UPDATES ----------------
  const handleApplyTransform = (sectionId, pageId, imageId, transformUpdates) => {
    setSections(currentSections => currentSections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          pages: sec.pages.map(p => {
            if (p.id === pageId) {
              return {
                ...p,
                images: p.images.map(img => {
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
                            pages: s.pages.map(pg => {
                              if (pg.id === pageId) {
                                return {
                                  ...pg,
                                  images: pg.images.map(i => i.id === imageId ? { ...i, file: processed.file } : i)
                                };
                              }
                              return pg;
                            })
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
            return p;
          })
        };
      }
      return sec;
    }));
  };

  // ---------------- IMAGE REPLACEMENT ----------------
  const handleTriggerReplace = (sectionId, pageId, imageId) => {
    setReplaceTarget({ sectionId, pageId, imageId });
    if (replaceFileRef.current) {
      replaceFileRef.current.value = "";
      replaceFileRef.current.click();
    }
  };

  const handleExecuteReplace = async (e) => {
    const file = e.target.files?.[0];
    const { sectionId, pageId, imageId } = replaceTarget;
    if (!file || !sectionId || !pageId || !imageId) return;

    const processed = await processImageTransformations(file);

    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          pages: sec.pages.map(p => {
            if (p.id === pageId) {
              return {
                ...p,
                images: p.images.map(img => {
                  if (img.id === imageId) {
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
            return p;
          })
        };
      }
      return sec;
    }));

    setReplaceTarget({ sectionId: null, pageId: null, imageId: null });
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

  const handleSubtitleChange = (sectionId, pageId, imageId, subtitle) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          pages: sec.pages.map(p => {
            if (p.id === pageId) {
              return {
                ...p,
                images: p.images.map(img => img.id === imageId ? { ...img, subtitle } : img)
              };
            }
            return p;
          })
        };
      }
      return sec;
    }));
  };

  const handleCaptionChange = (sectionId, pageId, imageId, caption) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          pages: sec.pages.map(p => {
            if (p.id === pageId) {
              return {
                ...p,
                images: p.images.map(img => img.id === imageId ? { ...img, caption } : img)
              };
            }
            return p;
          })
        };
      }
      return sec;
    }));
  };

  // ---------------- AUTO-FIT LAYOUT INFO COMPUTATION ----------------
  const getLayoutDetails = (imgCount) => {
    if (imgCount === 0) return {
      title: "No Photos Yet",
      desc: "Upload photos below to auto-fit onto this page",
      badge: "Empty"
    };
    if (imgCount === 1) return {
      title: "1 Photo Auto-Fit",
      desc: "Single prominent photo centered with full-width fit",
      badge: "1 Large"
    };
    if (imgCount === 2) return {
      title: "2 Photos Stacked (Screenshot 2 Match)",
      desc: "Photo 1 on top, Photo 2 below — large vertical fit within single page with uniform gap",
      badge: "2 Stacked"
    };
    if (imgCount === 3) return {
      title: "3 Photos Hybrid (Screenshot 3 Match)",
      desc: "1 large photo on top + 2 photos side-by-side below — perfectly fits single page",
      badge: "3 Hybrid"
    };
    if (imgCount === 4) return {
      title: "4 Photos (2x2 Grid)",
      desc: "2 rows of 2 photos side-by-side — autofitted strictly inside single page",
      badge: "2x2 Grid"
    };
    if (imgCount === 5) return {
      title: "5 Photos (2 Top + 3 Bottom)",
      desc: "2 photos in top row + 3 photos in bottom row — autofitted within page bounds",
      badge: "2+3 Grid"
    };
    if (imgCount === 6) return {
      title: "6 Photos (2x3 Grid)",
      desc: "2 rows of 3 photos each — perfectly scaled to prevent page overflow",
      badge: "2x3 Grid"
    };
    return {
      title: `${imgCount} Photos Multi-Row Grid`,
      desc: "Auto-scaled multi-row layout fitted proportionally",
      badge: "Multi-Row"
    };
  };

  // ---------------- API EXPORT & DIRECT BLOB DOWNLOAD HANDLERS ----------------
  const handleSubmitReport = async () => {
    setStatusMessage(null);
    if (!formData.substation_id.trim()) {
      setStatusMessage({ type: 'error', text: 'Substation ID is required!' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setStatusMessage(null);
    setGeneratedReport(null);

    try {
      const payloadObj = {
        ...formData,
        sections: sections.map((sec, sIdx) => ({
          title: sec.title,
          order: sIdx,
          pages: (sec.pages || []).map((pg, pIdx) => ({
            page_number: pIdx + 1,
            subtitle: pg.subtitle || '',
            notes: (pg.notes || []).map((n, nIdx) => ({
              text: n.text,
              order: n.order !== undefined ? n.order : nIdx,
              position: n.position || 'top'
            })),
            images: (pg.images || []).map((img, iIdx) => ({
              subtitle: img.subtitle || '',
              caption: img.caption || '',
              order: img.order !== undefined ? img.order : iIdx,
              file_key: `image_s${sIdx}_p${pIdx}_i${iIdx}`
            }))
          }))
        }))
      };

      const multipartData = new FormData();
      multipartData.append('payload', JSON.stringify(payloadObj));

      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        const pagesList = sec.pages || [];
        for (let pIdx = 0; pIdx < pagesList.length; pIdx++) {
          const pg = pagesList[pIdx];
          const imgList = pg.images || [];
          for (let iIdx = 0; iIdx < imgList.length; iIdx++) {
            const img = imgList[iIdx];
            let fileToUpload = img.file;

            if (!fileToUpload && img.previewUrl && (img.previewUrl.startsWith('blob:') || img.previewUrl.startsWith('data:'))) {
              try {
                const res = await fetch(img.previewUrl);
                if (res.ok) {
                  const blob = await res.blob();
                  fileToUpload = new File([blob], `photo_s${sIdx}_p${pIdx}_i${iIdx}.jpg`, { type: 'image/jpeg' });
                }
              } catch (fetchErr) {
                console.error("Failed to fetch image blob:", fetchErr);
              }
            }

            if (fileToUpload) {
              multipartData.append(`image_s${sIdx}_p${pIdx}_i${iIdx}`, fileToUpload);
            }
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
      setStatusMessage({ type: 'success', text: 'Report generated successfully with auto-fit page layouts! Click below to download Word or PDF.' });
    } catch (err) {
      console.error("Submission error:", err);
      let errorText = 'Failed to submit inspection report. Please verify server connection.';
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          errorText = err.response.data;
        } else if (err.response.data.error) {
          errorText = err.response.data.error;
        } else if (err.response.data.detail) {
          errorText = err.response.data.detail;
        } else {
          errorText = JSON.stringify(err.response.data);
        }
      }
      setStatusMessage({ 
        type: 'error', 
        text: errorText 
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
      console.error("Download error:", err);
      let errorMsg = `Failed to download ${format.toUpperCase()} file. Please check server.`;
      if (err.response && err.response.status === 404) {
        errorMsg = `Report record not found in database. Please click 'Compile & Build Report' to generate a fresh report.`;
      } else if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.error) {
            errorMsg = parsed.error;
          } else if (parsed.detail) {
            errorMsg = parsed.detail;
          }
        } catch (e) {
          // ignore parsing error
        }
      }
      setStatusMessage({ 
        type: 'error', 
        text: errorMsg
      });
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
        onChange={(e) => activeTargetForCamera.sectionId && activeTargetForCamera.pageId && handleAddImagesToPage(activeTargetForCamera.sectionId, activeTargetForCamera.pageId, e.target.files)} 
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
                  Multi-Page Section Engine • Dynamic Photo Auto-Fit Layouts (DOCX / PDF)
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleSubmitReport}
              disabled={uploading}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#003366] hover:bg-[#002244] text-white font-semibold rounded-xl shadow-md shadow-blue-900/10 transition-all disabled:opacity-50 cursor-pointer"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Compiling Report ({uploadProgress}%)</span>
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

      {/* STATUS ALERTS */}
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
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {downloadingFormat === 'docx' ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              <span>Download Word (.docx)</span>
            </button>
            <button
              onClick={() => handleDirectDownloadFile('pdf')}
              disabled={downloadingFormat === 'pdf'}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium shadow-sm transition-all disabled:opacity-50 cursor-pointer"
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
                    className="w-full px-3.5 py-2 rounded-lg glass-input text-xs font-bold text-[#003366]" 
                    required 
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

        {/* RIGHT COLUMN: PER-TITLE DYNAMIC PAGES & AUTO-FIT PHOTO SUITE */}
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
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-all flex-shrink-0 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-blue-300" />
                  <span>Add Section</span>
                </button>
              </div>
            </div>

            {/* SECTIONS LIST */}
            <div className="space-y-8">
              {sections.map((section, sIdx) => {
                const activePageId = getActivePageId(section);
                const activePage = section.pages?.find(p => p.id === activePageId) || section.pages?.[0];
                const activePageIdx = section.pages?.findIndex(p => p.id === activePageId) ?? 0;
                const activePageImgCount = activePage?.images?.length || 0;
                const layoutInfo = getLayoutDetails(activePageImgCount);

                return (
                  <div key={section.id} className="bg-slate-50/80 rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
                    {/* SECTION TITLE HEADER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="w-7 h-7 rounded-lg bg-blue-100 text-[#003366] font-bold text-xs flex items-center justify-center border border-blue-200 shadow-xs flex-shrink-0">
                          {sIdx + 1}
                        </span>
                        <input 
                          type="text" 
                          value={section.title} 
                          onChange={(e) => handleSectionTitleChange(section.id, e.target.value)} 
                          className="bg-transparent text-slate-900 font-bold text-lg focus:outline-none focus:border-b-2 focus:border-[#003366] px-1 py-0.5 w-full" 
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {/* + ADD PAGE TO THIS SECTION BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleAddPageToSection(section.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                          title="Add another page under this section"
                        >
                          <Plus className="w-3.5 h-3.5 text-blue-200" />
                          <span>+ Add Page</span>
                        </button>

                        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
                          <button
                            onClick={() => handleReorderSection(sIdx, -1)}
                            disabled={sIdx === 0}
                            className="p-1 text-slate-600 hover:text-[#003366] hover:bg-blue-50 disabled:opacity-25 rounded transition-colors"
                            title="Move Section Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReorderSection(sIdx, 1)}
                            disabled={sIdx === sections.length - 1}
                            className="p-1 text-slate-600 hover:text-[#003366] hover:bg-blue-50 disabled:opacity-25 rounded transition-colors"
                            title="Move Section Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveSection(section.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remove Section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* PAGES TAB BAR (IF MULTIPLE PAGES) */}
                    <div className="flex flex-wrap items-center gap-2 bg-white/70 p-1.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2">
                        Pages ({section.pages?.length || 1}):
                      </span>
                      {section.pages?.map((p, pIdx) => {
                        const isActive = p.id === activePageId;
                        const pImgCount = p.images?.length || 0;
                        const pLayout = getLayoutDetails(pImgCount);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPageTab(section.id, p.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isActive 
                                ? 'bg-[#003366] text-white shadow-xs' 
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5 opacity-80" />
                            <span>Page {pIdx + 1}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {pImgCount} {pImgCount === 1 ? 'img' : 'imgs'}
                            </span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => handleAddPageToSection(section.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-[#003366] hover:bg-blue-50 border border-dashed border-slate-300 hover:border-blue-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        title="Add New Page to this Section"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Page</span>
                      </button>
                    </div>

                    {/* ACTIVE PAGE CONTAINER */}
                    {activePage && (
                      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5 shadow-2xs">
                        {/* PAGE SUBTITLE & CONTROLS */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#003366] font-bold text-xs">
                              Page {activePageIdx + 1} of {section.pages.length}
                            </span>
                            <input 
                              type="text"
                              value={activePage.subtitle || ''}
                              onChange={(e) => handlePageSubtitleChange(section.id, activePage.id, e.target.value)}
                              placeholder="Page Subtitle / Sub-heading (e.g. 3.1 Substation Outside, 3.2 SWITCH GEAR)..."
                              className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg px-3 py-1.5 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAddPageNote(section.id, activePage.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
                              title="Add bullet point note to this page"
                            >
                              <Type className="w-3.5 h-3.5 text-emerald-600" />
                              <span>+ Bullet / Note</span>
                            </button>

                            <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => handleReorderPage(section.id, activePageIdx, -1)}
                                disabled={activePageIdx === 0}
                                className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-25 rounded hover:bg-white transition-colors"
                                title="Move Page Up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReorderPage(section.id, activePageIdx, 1)}
                                disabled={activePageIdx === section.pages.length - 1}
                                className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-25 rounded hover:bg-white transition-colors"
                                title="Move Page Down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {section.pages.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemovePage(section.id, activePage.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete this Page"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* PAGE BULLET NOTES (IF ANY) */}
                        {activePage.notes && activePage.notes.length > 0 && (
                          <div className="space-y-2 bg-emerald-50/50 border border-emerald-200 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                              <Type className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Page Bullet Points & Notes</span>
                            </div>
                            {activePage.notes.map((note) => (
                              <div key={note.id} className="flex items-center gap-2">
                                <span className="text-emerald-700 font-bold">•</span>
                                <input
                                  type="text"
                                  value={note.text}
                                  onChange={(e) => handlePageNoteTextChange(section.id, activePage.id, note.id, e.target.value)}
                                  placeholder="Enter note or observation..."
                                  className="w-full bg-white border border-emerald-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePageNote(section.id, activePage.id, note.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                  title="Remove note"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* INTERACTIVE LIVE DOCUMENT PAGE PREVIEW (A4 PROPORTIONS & MATCHING SCREENSHOTS) */}
                        <div className="bg-slate-50/90 rounded-xl border border-blue-200 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#003366]" />
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Live Document Page Preview (A4 Page Fit)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#003366] border border-blue-200">
                                {layoutInfo.title}
                              </span>
                            </div>
                          </div>

                          {/* A4 DOCUMENT PAGE CONTAINER */}
                          <div className="bg-white rounded-lg border-2 border-[#00AEEF] p-4 shadow-sm relative overflow-hidden text-slate-800 text-[11px] max-w-xl mx-auto">
                            {/* Page Header Table Mockup */}
                            <div className="border border-slate-900 grid grid-cols-12 text-center text-[9px] font-bold mb-3 bg-white">
                              <div className="col-span-4 p-1.5 border-r border-slate-900 text-rose-700 flex flex-col justify-center">
                                DELTA STAR POWER
                              </div>
                              <div className="col-span-6 p-1.5 border-r border-slate-900 text-slate-700 leading-tight flex items-center justify-center">
                                {formData.project_name || "D-114980 LTRA CONDITION MONITORING"}
                              </div>
                              <div className="col-span-2 p-1.5 text-teal-700 flex items-center justify-center">
                                TAQA
                              </div>
                            </div>

                            {/* Section Title Banner (Rendered on Page 1) */}
                            {activePageIdx === 0 && (
                              <div className="bg-[#B4C6E7] text-slate-900 font-bold px-3 py-1 rounded-xs mb-1.5 max-w-[85%] text-xs border border-blue-300">
                                {section.title}
                              </div>
                            )}

                            {/* Subtitle Banner (Matching Screenshot 2 & 3) */}
                            {activePage.subtitle && (
                              <div className="bg-[#B4C6E7] text-slate-900 font-bold px-3 py-1 rounded-xs mb-2 max-w-[80%] text-[11px] border border-blue-300">
                                {activePage.subtitle}
                              </div>
                            )}

                            {/* Clear margin gap between title and content - never merge title with content */}
                            <div className="h-2"></div>

                            {/* Notes preview if any */}
                            {activePage.notes && activePage.notes.length > 0 && (
                              <div className="mb-2 space-y-0.5 text-[10px] font-semibold text-slate-700">
                                {activePage.notes.map((n, i) => (
                                  <div key={i}>{n.text}</div>
                                ))}
                              </div>
                            )}

                            {/* Dynamic Photo Layout matching Screenshots */}
                            {activePageImgCount === 0 ? (
                              <div className="h-32 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-xs text-center p-4">
                                No photos added to Page {activePageIdx + 1} yet.<br />Use the uploader below to add photos.
                              </div>
                            ) : activePageImgCount === 1 ? (
                              /* 1 Photo: Full page large centered */
                              <div className="w-full h-56 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                                <img src={activePage.images[0].previewUrl} alt="Page Photo" className="w-full h-full object-cover" />
                              </div>
                            ) : activePageImgCount === 2 ? (
                              /* 2 Photos: 2 Stacked Photos Vertically (Exact match for Screenshot 2) */
                              <div className="space-y-2">
                                <div className="w-full h-36 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                  <img src={activePage.images[0].previewUrl} alt="Photo 1" className="w-full h-full object-cover" />
                                </div>
                                <div className="w-full h-36 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                  <img src={activePage.images[1].previewUrl} alt="Photo 2" className="w-full h-full object-cover" />
                                </div>
                              </div>
                            ) : activePageImgCount === 3 ? (
                              /* 3 Photos: 1 Top + 2 Bottom Side-by-Side (Exact match for Screenshot 3) */
                              <div className="space-y-2">
                                <div className="w-full h-36 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                  <img src={activePage.images[0].previewUrl} alt="Photo 1" className="w-full h-full object-cover" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="h-28 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                    <img src={activePage.images[1].previewUrl} alt="Photo 2" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="h-28 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                    <img src={activePage.images[2].previewUrl} alt="Photo 3" className="w-full h-full object-cover" />
                                  </div>
                                </div>
                              </div>
                            ) : activePageImgCount === 4 ? (
                              /* 4 Photos: 2x2 Grid */
                              <div className="grid grid-cols-2 gap-2">
                                {activePage.images.slice(0, 4).map((img, idx) => (
                                  <div key={idx} className="h-28 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                    <img src={img.previewUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            ) : activePageImgCount === 5 ? (
                              /* 5 Photos: 2 Top + 3 Bottom */
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  {activePage.images.slice(0, 2).map((img, idx) => (
                                    <div key={idx} className="h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                      <img src={img.previewUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {activePage.images.slice(2, 5).map((img, idx) => (
                                    <div key={idx} className="h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                      <img src={img.previewUrl} alt={`Photo ${idx + 3}`} className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              /* 6 Photos: 2x3 Grid */
                              <div className="grid grid-cols-3 gap-2">
                                {activePage.images.slice(0, 6).map((img, idx) => (
                                  <div key={idx} className="h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                    <img src={img.previewUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Page Footer Mockup */}
                            <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-500 font-medium">
                              <span>D – 114980</span>
                              <span className="text-right">
                                Page {activePageIdx + 1} of {section.pages.length}<br />
                                <strong className="text-rose-600">DELTA STAR</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* PHOTO CARDS & UPLOAD AREA FOR THIS PAGE */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4 text-[#003366]" />
                              <span>Photos on Page {activePageIdx + 1} ({activePageImgCount})</span>
                            </h4>
                            <span className="text-xs text-slate-500">
                              {layoutInfo.desc}
                            </span>
                          </div>

                          {/* PHOTO GRID CARDS */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activePage.images.map((img, imgIdx) => (
                              <div key={img.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between space-y-3 p-3">
                                {/* PHOTO SUB-HEADING INPUT */}
                                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                  <Type className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  <input
                                    type="text"
                                    value={img.subtitle || ''}
                                    onChange={(e) => handleSubtitleChange(section.id, activePage.id, img.id, e.target.value)}
                                    placeholder="Photo Label / Title (e.g. 1. Nameplate, Outside View)..."
                                    className="w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-none border-b border-transparent focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
                                  />
                                </div>

                                {/* IMAGE THUMBNAIL CONTAINER WITH CSS TRANSFORM */}
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                                  <img 
                                    src={img.previewUrl} 
                                    alt="Inspection evidence" 
                                    style={{
                                      transform: `scale(${img.scale}) rotate(${img.rotation}deg) ${img.flipH ? 'scaleX(-1)' : ''} ${img.flipV ? 'scaleY(-1)' : ''}`,
                                      transition: 'transform 0.15s ease-out'
                                    }}
                                    className="w-full h-full object-cover" 
                                  />

                                  {/* REORDER BUTTONS */}
                                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-lg border border-slate-200 shadow-xs z-10">
                                    <button
                                      type="button"
                                      onClick={() => handleReorderImage(section.id, activePage.id, imgIdx, -1)}
                                      disabled={imgIdx === 0}
                                      className="p-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-30 transition-colors cursor-pointer"
                                      title="Move Left / Previous"
                                    >
                                      <ArrowLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[10px] font-bold text-slate-500 px-1">{imgIdx + 1}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleReorderImage(section.id, activePage.id, imgIdx, 1)}
                                      disabled={imgIdx === activePage.images.length - 1}
                                      className="p-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-30 transition-colors cursor-pointer"
                                      title="Move Right / Next"
                                    >
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* TOP-RIGHT ACTIONS */}
                                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-lg border border-slate-200 shadow-xs z-10">
                                    <button
                                      type="button"
                                      onClick={() => openCropModal(section.id, activePage.id, img.id, img.previewUrl)}
                                      className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                      title="Crop Photo"
                                    >
                                      <Crop className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleTriggerReplace(section.id, activePage.id, img.id)}
                                      className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                      title="Replace Image"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveToGallery(img.previewUrl, `inspection_${section.title.replace(/[^a-zA-Z0-9]/g, '_')}_p${activePageIdx + 1}_${img.id}.jpg`)}
                                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                      title="Save to Device Gallery"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveImage(section.id, activePage.id, img.id)}
                                      className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                      title="Delete Image"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* TRANSFORM TOOLBAR */}
                                  <div className="absolute bottom-2 inset-x-2 flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-white border border-slate-700 shadow-md z-10">
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleApplyTransform(section.id, activePage.id, img.id, { rotation: (img.rotation + 90) % 360 })}
                                        className="p-1 hover:bg-slate-700 rounded text-slate-200 hover:text-white transition-colors cursor-pointer"
                                        title="Rotate 90° Clockwise"
                                      >
                                        <RotateCw className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleApplyTransform(section.id, activePage.id, img.id, { flipH: !img.flipH })}
                                        className={`p-1 rounded transition-colors cursor-pointer ${img.flipH ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-200'}`}
                                        title="Flip Horizontal"
                                      >
                                        <FlipHorizontal className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleApplyTransform(section.id, activePage.id, img.id, { flipV: !img.flipV })}
                                        className={`p-1 rounded transition-colors cursor-pointer ${img.flipV ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-200'}`}
                                        title="Flip Vertical"
                                      >
                                        <FlipVertical className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* ZOOM IN & ZOOM OUT */}
                                    <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newScale = Math.max(0.3, Math.round((img.scale - 0.15) * 100) / 100);
                                          handleApplyTransform(section.id, activePage.id, img.id, { scale: newScale });
                                        }}
                                        className="p-1 hover:bg-slate-600 active:bg-blue-600 rounded text-slate-200 hover:text-white transition-colors cursor-pointer"
                                        title="Zoom Out"
                                      >
                                        <ZoomOut className="w-3.5 h-3.5" />
                                      </button>

                                      <span className="text-[11px] font-mono font-semibold text-slate-200 min-w-[36px] text-center">
                                        {Math.round(img.scale * 100)}%
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newScale = Math.min(2.5, Math.round((img.scale + 0.15) * 100) / 100);
                                          handleApplyTransform(section.id, activePage.id, img.id, { scale: newScale });
                                        }}
                                        className="p-1 hover:bg-slate-600 active:bg-blue-600 rounded text-slate-200 hover:text-white transition-colors cursor-pointer"
                                        title="Zoom In"
                                      >
                                        <ZoomIn className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* MOVE TO DIFFERENT PAGE OPTION */}
                                {section.pages.length > 1 && (
                                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                    <span className="text-[11px]">Move photo to:</span>
                                    <select
                                      value={activePage.id}
                                      onChange={(e) => handleMoveImageToPage(section.id, activePage.id, e.target.value, img.id)}
                                      className="text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-slate-700 focus:outline-none"
                                    >
                                      {section.pages.map((p, idx) => (
                                        <option key={p.id} value={p.id}>
                                          Page {idx + 1} {p.subtitle ? `(${p.subtitle})` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {/* CAPTION TEXTAREA */}
                                <div>
                                  <textarea
                                    value={img.caption || ''}
                                    onChange={(e) => handleCaptionChange(section.id, activePage.id, img.id, e.target.value)}
                                    placeholder="Defect or Component Description..."
                                    rows={2}
                                    className="w-full px-3 py-1.5 rounded-lg glass-input text-xs resize-none"
                                  />
                                </div>
                              </div>
                            ))}

                            {/* UPLOAD BOX FOR THIS PAGE */}
                            <div className="border-2 border-dashed border-slate-300 hover:border-[#003366] bg-white hover:bg-blue-50/40 transition-all rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 relative min-h-[220px]">
                              <input 
                                type="file" 
                                multiple 
                                accept="image/*" 
                                onChange={(e) => handleAddImagesToPage(section.id, activePage.id, e.target.files)} 
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                              />
                              <div className="p-3 bg-blue-50 text-[#003366] rounded-full border border-blue-200">
                                <Camera className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  Click or drag photos to Page {activePageIdx + 1}
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
                                    triggerNativeCamera(section.id, activePage.id);
                                  }}
                                  className="px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                  title="Open native mobile/laptop camera app directly"
                                >
                                  <Smartphone className="w-3.5 h-3.5 text-blue-200" />
                                  <span>Native Device Camera</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startCameraStream(section.id, activePage.id);
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                  title="Open live web camera preview modal"
                                >
                                  <Camera className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Live Preview WebCam</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* BOTTOM BUTTON: ADD ANOTHER PAGE TO THIS SECTION */}
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleAddPageToSection(section.id)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-blue-50 text-[#003366] border border-blue-300 rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-[#003366]" />
                        <span>Add Page to "{section.title}"</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* LIVE CAMERA WEBCAM MODAL */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
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
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Switch between Front and Rear camera"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#003366]" />
                  <span>Switch Front/Back</span>
                </button>

                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Close Camera Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center relative flex-1 min-h-[360px] overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">Click Capture to take high-resolution photo</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhotoFromStream}
                  className="px-5 py-2.5 bg-[#003366] hover:bg-[#002244] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-blue-200" />
                  <span>Capture Photo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE MANUAL CROP MODAL */}
      {cropModalState.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-[#003366]" />
                <h3 className="font-bold text-slate-900 text-base">Crop Inspection Evidence</h3>
              </div>
              <button 
                type="button"
                onClick={closeCropModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center relative flex-1 min-h-[320px] overflow-hidden select-none">
              <div ref={cropContainerRef} className="relative inline-block max-w-full max-h-[60vh]">
                <img 
                  src={cropModalState.imageSrc} 
                  alt="Crop Source" 
                  className="max-w-full max-h-[60vh] object-contain block pointer-events-none" 
                />

                {/* Crop Box Overlay */}
                <div 
                  style={{
                    left: `${cropModalState.cropBox.x}%`,
                    top: `${cropModalState.cropBox.y}%`,
                    width: `${cropModalState.cropBox.width}%`,
                    height: `${cropModalState.cropBox.height}%`
                  }}
                  onMouseDown={(e) => handleCropStart(e, 'move')}
                  onTouchStart={(e) => handleCropStart(e, 'move')}
                  className="absolute border-2 border-blue-400 bg-blue-500/20 shadow-2xl cursor-move touch-none"
                >
                  <div 
                    onMouseDown={(e) => handleCropStart(e, 'tl')}
                    onTouchStart={(e) => handleCropStart(e, 'tl')}
                    className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-20 touch-none" 
                  />
                  <div 
                    onMouseDown={(e) => handleCropStart(e, 'tr')}
                    onTouchStart={(e) => handleCropStart(e, 'tr')}
                    className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-20 touch-none" 
                  />
                  <div 
                    onMouseDown={(e) => handleCropStart(e, 'bl')}
                    onTouchStart={(e) => handleCropStart(e, 'bl')}
                    className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-20 touch-none" 
                  />
                  <div 
                    onMouseDown={(e) => handleCropStart(e, 'br')}
                    onTouchStart={(e) => handleCropStart(e, 'br')}
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-20 touch-none" 
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">Drag box to reposition • Drag corner dots to resize</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeCropModal}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyCrop}
                  className="px-5 py-2.5 bg-[#003366] hover:bg-[#002244] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Apply Crop</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportBuilder;
