import React, { useState, useRef, useEffect } from 'react';
import API from '../api/axios';
import { Download, MapPin, User, Briefcase, Mail, Send, X, Loader2, Image as ImageIcon, FileSpreadsheet, Upload, CheckCircle, ExternalLink, FileDown } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useEditable } from '../context/EditableContext';
import * as XLSX from 'xlsx';

const ProbationConfirmationEditor = () => {
    const { isEditable, customLogo, setCustomLogo, customSign, setCustomSign } = useEditable();
    const logoInputRef = useRef();
    const signInputRef = useRef();
    const photoInputRef = useRef();
    const bulkUploadRef = useRef();
    const savedFormDataRef = useRef(null);

    const handleCustomImageUpload = (e, setter) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setter(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    const [formData, setFormData] = useState({
        toName: '',
        doorNo: '',
        street: '',
        addressLine1: '',
        addressLine2: '',
        district: '',
        state: '',
        pincode: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        annualHike: '8',
        designation: '',
        reportingManager: '',
        annualPackage: '',
        plannedLeaves: '3',
        photo: null
    });

    const [showMailModal, setShowMailModal] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [mailStatus, setMailStatus] = useState({ type: '', message: '' });
    const [coverLetter, setCoverLetter] = useState('');
    const [selectedMailItem, setSelectedMailItem] = useState(null);

    // Bulk upload state
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const [bulkResults, setBulkResults] = useState(null);
    const [showBulkResults, setShowBulkResults] = useState(false);

    const previewRef = useRef();

    // Sync Cover Letter with Form Data
    useEffect(() => {
        const formattedDate = formData.effectiveDate
            ? new Date(formData.effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : '24 April 2025';

        setCoverLetter(`Dear ${formData.toName || 'Mr. Syed'},

Greetings from VTAB Square Pvt Ltd.

We are pleased to inform you that you have successfully completed your training and probation period with the organization. Your performance during this period has been appreciated by the management.

Please find attached your Probation Confirmation Letter for your reference. As mentioned in the letter, your designation has been confirmed as ${formData.designation || 'Power Platform Developer'}, and you will continue reporting to ${formData.reportingManager || 'Bala'}.

Your compensation has also been revised with an annual hike of ${formData.annualHike || '8'}%, and the revised salary structure will be effective from ${formattedDate}.

We appreciate your dedication and contributions to the organization and look forward to your continued success and growth with VTAB Square Pvt Ltd.

If you have any questions or require further clarification, please feel free to contact the HR Department.

Congratulations and best wishes for your continued journey with us.

Best Regards,
Vimala C
Managing Director
Authorized Signatory
VTAB Square Pvt Ltd
(Now Part of Siroco)`);
    }, [formData.toName, formData.designation, formData.reportingManager, formData.annualHike, formData.effectiveDate]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photo: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const validateForm = () => {
        if (isEditable) return true;
        const requiredFields = [
            'toName', 'doorNo', 'street', 'addressLine1', 'addressLine2',
            'district', 'state', 'pincode', 'effectiveDate', 'designation',
            'reportingManager', 'annualPackage', 'photo'
        ];

        const missingFields = requiredFields.filter(field => !formData[field]);
        if (missingFields.length > 0) {
            alert('Please fill in all mandatory fields (including employee photo) before proceeding.');
            return false;
        }

        const alphaOnly = /^[a-zA-Z\s.,''()-]+$/;
        const numericOnly = /^\d+(\.\d+)?$/;

        if (!alphaOnly.test(formData.toName)) {
            alert('Employee Name must contain alphabets only.');
            return false;
        }
        if (!alphaOnly.test(formData.designation)) {
            alert('Designation must contain alphabets only.');
            return false;
        }
        if (!alphaOnly.test(formData.reportingManager)) {
            alert('Reporting Manager must contain alphabets only.');
            return false;
        }
        if (!formData.doorNo) {
            alert('Door No is required.');
            return false;
        }
        if (!alphaOnly.test(formData.district)) {
            alert('District must contain alphabets only.');
            return false;
        }
        if (!alphaOnly.test(formData.state)) {
            alert('State must contain alphabets only.');
            return false;
        }
        if (!numericOnly.test(formData.pincode)) {
            alert('Pincode must contain numbers only.');
            return false;
        }
        if (!numericOnly.test(formData.annualPackage)) {
            alert('Revised Annual Package must be a number.');
            return false;
        }

        return true;
    };

    // ── DOWNLOAD TEMPLATE ──────────────────────────────────────────────
    const downloadTemplate = () => {
        const headers = [
            'Employee Name', 'Effective Date', 'Door No', 'Street',
            'Address Line 1', 'Address Line 2', 'District', 'State',
            'Pincode', 'Designation', 'Reporting Manager',
            'Annual Hike (%)', 'Planned Leaves', 'Revised Annual Package', 'Employee Photo URL'
        ];
        const sample = [
            'Mr.Syed', '2026-03-20', '12', 'Main Street',
            'Anna Nagar', 'Near Bus Stand', 'Coimbatore', 'Tamil Nadu',
            '641001', 'Power Platform Developer', 'Bala',
            '8', '3', '14000', 'https://drive.google.com/...'
        ];
        const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
        ws['!cols'] = headers.map(() => ({ wch: 22 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Probation Confirmation');
        XLSX.writeFile(wb, 'Probation_Confirmation_Template.xlsx');
    };

    // ── CAPTURE PREVIEW AS PDF BASE64 ──────────────────────────────────
    const capturePreviewAsPdfBase64 = async () => {
        const element = previewRef.current;
        if (!element) return null;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pages = element.children;
        for (let i = 0; i < pages.length; i++) {
            if (i > 0) pdf.addPage();
            const sanitize = (el) => {
                const elements = el.querySelectorAll('*');
                [el, ...elements].forEach(node => {
                    if (node.nodeType !== 1) return;
                    const style = window.getComputedStyle(node);
                    ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'].forEach(prop => {
                        const val = style[prop];
                        if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix'))) {
                            node.style[prop] = val;
                        }
                    });
                });
            };
            sanitize(pages[i]);
            const dataUrl = await toJpeg(pages[i], { quality: 0.85, pixelRatio: 1.5, skipFonts: true });
            pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        }
        return pdf.output('datauristring');
    };

    // ── LOAD PHOTO FROM DRIVE URL (Direct CORS bypass) ─────────────────
    const loadPhotoFromUrl = async (url) => {
        if (!url) return null;
        try {
            // Extract Google Drive file ID from share URL
            const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (!driveMatch) return null;
            const fileId = driveMatch[1];
            
            // Use Google's lh3 image hosting which allows CORS for public files
            const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
            
            const res = await fetch(directUrl);
            const blob = await res.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.error('Failed to load photo:', err.message);
            return null;
        }
    };

    // ── BULK UPLOAD ────────────────────────────────────────────────────
    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        setIsBulkProcessing(true);
        setBulkProgress({ current: 0, total: 0 });
        setBulkResults(null);
        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (rows.length < 2) { alert('No data rows found.'); setIsBulkProcessing(false); return; }
            const hdr = rows[0].map(h => String(h || '').trim());
            const col = (name) => hdr.findIndex(h => h.toLowerCase() === name.toLowerCase());
            const colMap = {
                employeeName: col('Employee Name'), effectiveDate: col('Effective Date'),
                doorNo: col('Door No'), street: col('Street'),
                addressLine1: col('Address Line 1'), addressLine2: col('Address Line 2'),
                district: col('District'), state: col('State'), pincode: col('Pincode'),
                designation: col('Designation'), reportingManager: col('Reporting Manager'),
                annualHike: col('Annual Hike (%)'), plannedLeaves: col('Planned Leaves'),
                annualPackage: col('Revised Annual Package'), photoUrl: col('Employee Photo URL'),
            };
            const dataRows = rows.slice(1).filter(r => r.some(c => c !== undefined && c !== ''));
            if (dataRows.length === 0) { alert('No valid data rows.'); setIsBulkProcessing(false); return; }
            savedFormDataRef.current = { ...formData };
            setBulkProgress({ current: 0, total: dataRows.length });
            const candidatesArr = [];
            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                const get = (idx) => idx >= 0 && row[idx] !== undefined ? String(row[idx]).trim() : '';
                const employeeName = get(colMap.employeeName);
                if (!employeeName) continue;
                const photoUrl = get(colMap.photoUrl);
                const photoBase64 = photoUrl ? await loadPhotoFromUrl(photoUrl) : null;
                const rowData = {
                    toName: employeeName, effectiveDate: get(colMap.effectiveDate),
                    doorNo: get(colMap.doorNo), street: get(colMap.street),
                    addressLine1: get(colMap.addressLine1), addressLine2: get(colMap.addressLine2),
                    district: get(colMap.district), state: get(colMap.state),
                    pincode: get(colMap.pincode), designation: get(colMap.designation),
                    reportingManager: get(colMap.reportingManager), annualHike: get(colMap.annualHike) || '8',
                    plannedLeaves: get(colMap.plannedLeaves) || '3',
                    annualPackage: get(colMap.annualPackage), photo: photoBase64,
                };
                setFormData(rowData);
                await new Promise(r => setTimeout(r, 500));
                const pdfDataUri = await capturePreviewAsPdfBase64();
                if (pdfDataUri) {
                    candidatesArr.push({
                        employeeName, effectiveDate: rowData.effectiveDate,
                        doorNo: rowData.doorNo, street: rowData.street,
                        addressLine1: rowData.addressLine1, addressLine2: rowData.addressLine2,
                        district: rowData.district, state: rowData.state, pincode: rowData.pincode,
                        designation: rowData.designation, reportingManager: rowData.reportingManager,
                        annualHike: rowData.annualHike, plannedLeaves: rowData.plannedLeaves,
                        annualPackage: rowData.annualPackage, pdfBase64: pdfDataUri,
                    });
                }
                setBulkProgress({ current: i + 1, total: dataRows.length });
            }
            if (savedFormDataRef.current) setFormData(savedFormDataRef.current);
            if (candidatesArr.length === 0) { alert('No valid candidates found.'); setIsBulkProcessing(false); return; }
            const response = await API.post('/probation/bulk-upload', { candidates: candidatesArr });
            const { results, total } = response.data;
            const enriched = results.map(r => ({ ...r, ...(candidatesArr.find(c => c.employeeName === r.candidateName) || {}) }));
            setBulkResults({ total, results: enriched });
            setShowBulkResults(true);
        } catch (err) {
            alert(`Bulk upload failed: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const downloadPDF = async () => {
        if (!validateForm()) return;
        try {
            const element = previewRef.current;
            if (!element) return;

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pages = element.children;

            for (let i = 0; i < pages.length; i++) {
                if (i > 0) pdf.addPage();

                const sanitize = (el) => {
                    const elements = el.querySelectorAll('*');
                    [el, ...elements].forEach(node => {
                        if (node.nodeType !== 1) return;
                        const style = window.getComputedStyle(node);
                        ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'].forEach(prop => {
                            const val = style[prop];
                            if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix'))) {
                                node.style[prop] = val;
                            }
                        });
                    });
                };

                sanitize(pages[i]);

                const dataUrl = await toJpeg(pages[i], {
                    quality: 0.8,
                    pixelRatio: 1.5,
                    skipFonts: true,
                });

                pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            }
            pdf.save(`Probation_Confirmation_Letter_${formData.toName || 'Employee'}.pdf`);
        } catch (error) {
            console.error('PDF download error:', error);
            alert('Failed to generate PDF. Attempting alternative method...');
            window.print();
        }
    };

    const generatePDFBlob = async () => {
        try {
            const element = previewRef.current;
            if (!element) return null;

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pages = element.children;

            for (let i = 0; i < pages.length; i++) {
                if (i > 0) pdf.addPage();

                const sanitize = (el) => {
                    const elements = el.querySelectorAll('*');
                    [el, ...elements].forEach(node => {
                        if (node.nodeType !== 1) return;
                        const style = window.getComputedStyle(node);
                        ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'].forEach(prop => {
                            const val = style[prop];
                            if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix'))) {
                                node.style[prop] = val;
                            }
                        });
                    });
                };

                sanitize(pages[i]);

                const dataUrl = await toJpeg(pages[i], {
                    quality: 0.7,
                    pixelRatio: 1.2,
                    skipFonts: true,
                });

                pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            }

            return pdf.output('datauristring');
        } catch (error) {
            console.error('PDF generation error:', error);
            return null;
        }
    };

    const handleSendMail = async (e) => {
        e.preventDefault();
        if (!selectedMailItem && !validateForm()) return;
        setIsSending(true);
        setMailStatus({ type: '', message: '' });
        try {
            let pdfDataUri = null;
            let employeeName = formData.toName || 'Employee';
            let designation = formData.designation || 'Power Platform Developer';
            let reportingManager = formData.reportingManager || 'Bala';
            let annualHike = formData.annualHike || '8';
            let effectiveDate = formData.effectiveDate;
            if (selectedMailItem) {
                pdfDataUri = selectedMailItem.pdfBase64;
                employeeName = selectedMailItem.employeeName || selectedMailItem.candidateName || 'Employee';
                designation = selectedMailItem.designation || designation;
                reportingManager = selectedMailItem.reportingManager || reportingManager;
                annualHike = selectedMailItem.annualHike || annualHike;
                effectiveDate = selectedMailItem.effectiveDate || effectiveDate;
            } else {
                pdfDataUri = await generatePDFBlob();
            }
            if (!pdfDataUri) throw new Error('Failed to generate PDF');
            const formattedDate = effectiveDate
                ? new Date(effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            const dynamicCoverLetter = `Dear ${employeeName},

Greetings from VTAB Square Pvt Ltd.

We are pleased to inform you that you have successfully completed your training and probation period with the organization. Your performance during this period has been appreciated by the management.

Please find attached your Probation Confirmation Letter for your reference. As mentioned in the letter, your designation has been confirmed as ${designation}, and you will continue reporting to ${reportingManager}.

Your compensation has also been revised with an annual hike of ${annualHike}%, and the revised salary structure will be effective from ${formattedDate}.

We appreciate your dedication and contributions to the organization and look forward to your continued success and growth with VTAB Square Pvt Ltd.

If you have any questions or require further clarification, please feel free to contact the HR Department.

Congratulations and best wishes for your continued journey with us.

Best Regards,
Vimala C
Managing Director
Authorized Signatory
VTAB Square Pvt Ltd
(Now Part of Siroco)`;
            const response = await API.post('/probation/send-email', {
                toEmail: recipientEmail,
                candidateName: employeeName,
                customSubject: `Probation Confirmation Letter – ${employeeName}`,
                customFileName: `Probation_Confirmation_Letter_${employeeName}.pdf`,
                customMailContent: dynamicCoverLetter,
                pdfBase64: pdfDataUri,
            });
            if (response.data.success) {
                setMailStatus({ type: 'success', message: 'Email sent successfully!' });
                setTimeout(() => {
                    setShowMailModal(false);
                    setSelectedMailItem(null);
                    setRecipientEmail('');
                    setMailStatus({ type: '', message: '' });
                }, 2000);
            }
        } catch (error) {
            console.error('Email send error:', error);
            if (error.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; return; }
            setMailStatus({ type: 'error', message: error.response?.data?.message || error.message || 'Failed to send email' });
        } finally {
            setIsSending(false);
        }
    };

    const inputClass = "w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all shadow-sm";
    const labelClass = "block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider ml-1";

    return (
        <div className="flex-1 flex flex-col font-sans min-h-0">
            {/* Hidden File Inputs */}
            <input
                type="file"
                ref={logoInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleCustomImageUpload(e, setCustomLogo)}
            />
            <input
                type="file"
                ref={signInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleCustomImageUpload(e, setCustomSign)}
            />
            <input
                type="file"
                ref={photoInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />
            <input
                type="file"
                ref={bulkUploadRef}
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleBulkUpload}
            />

            {/* Header */}
            <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div>
                    <h1 className="text-base md:text-lg font-bold text-slate-900 leading-none">Probation Confirmation Editor</h1>
                    <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">VTAB Square Admin Portal</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <button
                        onClick={downloadPDF}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-indigo-100 transform active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Download PDF</span>
                    </button>
                    <button
                        onClick={() => { setSelectedMailItem(null); setShowMailModal(true); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-emerald-100 transform active:scale-95"
                    >
                        <Mail className="w-4 h-4" />
                        <span className="hidden sm:inline">Send Mail</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Editor Panel */}
                <div className="w-full md:w-[340px] lg:w-[400px] bg-white border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto p-5 md:p-8 custom-scrollbar shadow-sm z-40 flex-shrink-0">
                    <div className="space-y-10">
                        {/* Basic Info */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <User className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Employee Details</h3>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className={labelClass}>Employee Name (e.g. Mr.Syed)</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. Mr.Syed"
                                        value={formData.toName}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, toName: filteredValue });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Employee Photo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50">
                                            {formData.photo ? (
                                                <img src={formData.photo} alt="Employee" className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-6 h-6 text-slate-300" />
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Effective Date</label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        value={formData.effectiveDate}
                                        onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Address Details */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <MapPin className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Address Details</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className={labelClass}>Door No</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. WD02, 123, AER"
                                        value={formData.doorNo}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z0-9]/g, '');
                                            setFormData({ ...formData, doorNo: filteredValue });
                                        }}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className={labelClass}>Street</label>
                                    <input type="text" className={inputClass} value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>Address Line 1</label>
                                    <input type="text" className={inputClass} value={formData.addressLine1} onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>Address Line 2</label>
                                    <input type="text" className={inputClass} value={formData.addressLine2} onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelClass}>District</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={formData.district}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, district: filteredValue });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>State</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={formData.state}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, state: filteredValue });
                                        }}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>Pincode</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={formData.pincode}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/\D/g, '');
                                            setFormData({ ...formData, pincode: filteredValue });
                                        }}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Employment Details */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Briefcase className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Employment & Financials</h3>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className={labelClass}>Designation</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. Power Platform Developer"
                                        value={formData.designation}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, designation: filteredValue });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Reporting Manager</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. Bala"
                                        value={formData.reportingManager}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, reportingManager: filteredValue });
                                        }}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Annual Hike (%)</label>
                                        <input type="number" className={inputClass} value={formData.annualHike} onChange={(e) => setFormData({ ...formData, annualHike: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Planned Leaves</label>
                                        <input type="number" className={inputClass} value={formData.plannedLeaves} onChange={(e) => setFormData({ ...formData, plannedLeaves: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Revised Annual Package</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. 14000"
                                        value={formData.annualPackage}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/\D/g, '');
                                            setFormData({ ...formData, annualPackage: filteredValue });
                                        }}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Cover Letter Editor - Commented out as requested
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Mail className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Cover Letter</h3>
                            </div>
                            <div className="space-y-4">
                                <p className="text-[10px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                    This content will be used as the body of the email when sending the letter.
                                </p>
                                <div>
                                    <label className={labelClass}>Email Body Preview</label>
                                    <textarea
                                        className={`${inputClass} min-h-[400px] resize-none text-[13px] leading-relaxed font-serif`}
                                        value={coverLetter}
                                        onChange={(e) => setCoverLetter(e.target.value)}
                                        placeholder="Enter the email body..."
                                    />
                                </div>
                            </div>
                        </section>
                        */}

                        {/* ── Bulk Upload Section ── */}
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-violet-50 rounded-lg">
                                    <FileSpreadsheet className="w-4 h-4 text-violet-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Bulk Generation</h3>
                            </div>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                Download the template, fill in multiple candidates, then upload to generate & save all PDFs to Google Drive.
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={downloadTemplate}
                                    className="w-full flex items-center justify-center gap-2 border-2 border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl py-2.5 px-4 text-sm font-semibold transition-all active:scale-[0.98]"
                                >
                                    <FileDown className="w-4 h-4" />
                                    Download Template
                                </button>
                                <button
                                    onClick={() => bulkUploadRef.current?.click()}
                                    disabled={isBulkProcessing}
                                    className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl py-2.5 px-4 text-sm font-semibold transition-all shadow-lg shadow-violet-100 active:scale-[0.98]"
                                >
                                    {isBulkProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing {bulkProgress.current}/{bulkProgress.total}...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />
                                            Bulk Upload
                                        </>
                                    )}
                                </button>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Live Preview Pane */}
                <div className="flex-1 bg-slate-200 overflow-y-auto overflow-x-hidden p-4 md:p-12 flex justify-center custom-scrollbar">
                    <div className="origin-top scale-[0.4] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.6] xl:scale-[0.85] 2xl:scale-100 mb-20 transition-transform duration-300">
                        <div id="capture-area" ref={previewRef} className="w-[210mm] bg-white" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                            {/* PAGE 1: COVER */}
                            <div className="relative h-[297mm] bg-[#0A2458] overflow-hidden flex flex-col">
                                <div className="flex justify-between items-start pt-12 px-12 pb-20">
                                    <div
                                        className={`text-white text-[10px] leading-tight font-light border border-transparent ${isEditable ? 'outline-none hover:bg-white/10 focus:bg-white/20' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        www.sirocotech.com<br />
                                        sales@sirocollc.com<br />
                                        US: (844) 708-0008<br />
                                        IND: (996) 259-7975
                                    </div>
                                    <div className={`flex flex-col items-center justify-center border border-transparent ${isEditable ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''}`} onClick={() => isEditable && logoInputRef.current.click()}>
                                        {customLogo ? (
                                            <img src={customLogo} alt="Custom Logo" className="max-h-24 w-auto object-contain" />
                                        ) : (
                                            <>
                                                <div className="mb-2 bg-white p-2 w-18 h-18 flex items-center justify-center">
                                                    <img src="/vtab.jpg" alt="VTAB" className="w-10 h-10 object-contain" />
                                                </div>
                                                <div className="text-[10px] font-bold tracking-widest uppercase text-white opacity-80 mb-2">Now part of</div>
                                                <img src="/siroco.jpeg" alt="SIROCO" className="h-8 object-contain" />
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col items-center justify-center text-center px-12 min-h-[400px]">
                                    <div
                                        className={`text-white text-2xl font-medium mb-6 uppercase tracking-[0.2em] opacity-90 text-[14px] border border-transparent ${isEditable ? 'outline-none hover:bg-white/10 focus:bg-white/20' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        Prepared for
                                    </div>
                                    <div className="w-64 h-[1px] bg-white/20 mb-8"></div>
                                    <div
                                        className={`text-white text-xl font-light tracking-[0.15em] uppercase leading-relaxed text-[16px] border border-transparent ${isEditable ? 'outline-none hover:bg-white/10 focus:bg-white/20' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        Probation Confirmation Letter
                                    </div>
                                </div>

                                <div className="bg-white pt-10 px-12 pb-12 mt-auto min-h-[140px]">
                                    <h4
                                        className={`text-[#0A2458] font-bold text-xs mb-1 text-center italic border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        Statement of Confidentiality
                                    </h4>
                                    <p
                                        className={`text-[10px] leading-relaxed text-slate-800 text-center font-medium opacity-80 border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        This proposal has been distributed on a confidential basis for your information only. By accepting it, you agree not to disseminate it to any other person or entity in any manner and not to use the information for any purpose other than considering opportunities for a cooperative business relationship with owner of portfolio.
                                    </p>
                                </div>
                            </div>

                            {/* PAGE 2: MAIN LETTER */}
                            <div className="relative h-[297mm] bg-white overflow-hidden flex flex-col">
                                <div className="bg-[#0A2458] flex justify-between items-start pt-8 px-12 pb-8">
                                    <div
                                        className={`text-white text-[10px] leading-tight font-light ${isEditable ? 'outline-none hover:bg-white/10 focus:bg-white/20' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        www.sirocotech.com<br />
                                        sales@sirocollc.com<br />
                                        US: (844) 708-0008<br />
                                        IND: (996) 259-7975
                                    </div>
                                    <div className={`flex flex-col items-center justify-center border border-transparent ${isEditable ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''}`} onClick={() => isEditable && logoInputRef.current.click()}>
                                        {customLogo ? (
                                            <img src={customLogo} alt="Custom Logo" className="max-h-20 w-auto object-contain" />
                                        ) : (
                                            <>
                                                <div className="mb-2 bg-white p-2 w-14 h-14 flex items-center justify-center">
                                                    <img src="/vtab.jpg" alt="VTAB" className="w-10 h-10 object-contain" />
                                                </div>
                                                <div className="text-[8px] font-bold tracking-widest uppercase text-white opacity-80">Now part of</div>
                                                <img src="/siroco.jpeg" alt="SIROCO" className="w-28 object-contain" />
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 px-16 pt-6 pb-12 font-sans text-gray-900">
                                    <h2
                                        className={`text-[20px] font-bold mb-8 text-center text-black border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 transition-colors' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        Probation Confirmation Letter
                                    </h2>

                                    <div className="flex justify-between items-start mb-8">
                                        {/* Address Block */}
                                        <div
                                            className={`text-[12px] leading-relaxed max-w-[60%] border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            <div className="text-xl font-bold mb-4">Dear {formData.toName || 'Mr.[Name]'},</div>
                                            <div className="font-bold underline mb-2">Address:</div>
                                            <div>
                                                {formData.doorNo && <span>{formData.doorNo}, </span>}
                                                {formData.street && <span>{formData.street}, </span>}
                                                {formData.addressLine1 && <span>{formData.addressLine1}, </span>}
                                                {formData.addressLine2 && <span>{formData.addressLine2}, </span>}
                                                {formData.district && <span>{formData.district}, </span>}
                                                {formData.state && <span>{formData.state} - </span>}
                                                {formData.pincode && <span>{formData.pincode}</span>}
                                            </div>
                                        </div>

                                        {/* Photo Block */}
                                        <div className="flex flex-col items-center mr-8">
                                            <div
                                                className={`w-24 h-24 bg-slate-100 flex items-center justify-center overflow-hidden border transition-colors ${
                                                    isEditable
                                                        ? 'border-indigo-300 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50'
                                                        : 'border-slate-300'
                                                }`}
                                                onClick={() => isEditable && photoInputRef.current?.click()}
                                                title={isEditable ? 'Click to upload photo' : ''}
                                            >
                                                {formData.photo ? (
                                                    <img src={formData.photo} alt="Employee" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[10px] text-slate-400">Photo</span>
                                                        {isEditable && <span className="text-[9px] text-indigo-400 font-medium">Click to upload</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="font-bold text-[11px] mt-2">
                                                {formData.effectiveDate ? formData.effectiveDate.split('-').reverse().join('/') : '[Date]'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Body Text */}
                                    <div className="text-[11.5px] leading-relaxed space-y-5 text-black">
                                        <p
                                            className={`border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            We are glad to inform you that our company is very happy with your performance During Training & Probation period. We are offering you an Annual Hike of <strong>{formData.annualHike || '[Hike]'}%</strong>. Your Designation will be <strong>{formData.designation || '[Designation]'}</strong> Reporting to <strong>{formData.reportingManager || '[Manager]'}</strong> in the Ninja.
                                        </p>
                                        <p
                                            className={`border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            Your annual package has been revised to <strong>{formData.annualPackage || '[Package]'} Lakhs per year</strong> and which all the allowance and deductions. Your Role and salary revision are Effective from <strong>{formData.effectiveDate || '[Effective Date]'}</strong>.
                                        </p>
                                        <p
                                            className={`border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            PS: <strong>{formData.plannedLeaves || '[Leaves]'} planned leaves</strong> for this year effective from <strong>{formData.effectiveDate || '[Effective Date]'}</strong> until . Leaves will not encashed or carried forward to next Year. Wish you a stroke of good luck.
                                        </p>
                                    </div>

                                    {/* Signature */}
                                    <div className="mt-12 text-[11px]">
                                        <div className={`mb-2 inline-block ${isEditable ? 'cursor-pointer hover:bg-indigo-50/50 focus:bg-indigo-50 transition-all' : ''}`} onClick={() => isEditable && signInputRef.current.click()}>
                                            <img src={customSign || "/sign.jpeg"} alt="Signature" className="h-[70px] w-auto object-contain mix-blend-multiply" />
                                        </div>
                                        <div
                                            className={`border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 transition-colors' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            Sincerely,
                                        </div>
                                        <div className="w-52 border-b border-slate-300 mt-2 mb-2"></div>
                                        <div
                                            className={`border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 leading-relaxed' : 'leading-relaxed'}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            Authorized Signatory<br />
                                            Vimala C.<br />
                                            Managing Director<br />
                                            VTAB Square Pvt Ltd (Now Part of Siroco)
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0A2458] py-4 px-12 mt-auto">
                                    <img src="/siroco.jpeg" alt="SIROCO" className="w-28 object-contain" />
                                </div>
                            </div>

                            {/* PAGE 3: CONTACT */}
                            <div className="relative h-[297mm] bg-white overflow-hidden flex flex-col">
                                <div className="bg-[#E2E8F0] h-6 mb-6"></div>
                                <div className="px-12 mb-6 text-gray-900">
                                    <h3 className="text-xl font-bold text-[#0A2458]">Contact Us</h3>
                                </div>

                                <div className="px-12 space-y-8 flex-1">
                                    {/* USA */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <div
                                            className={`bg-[#D14343] text-white py-2 text-lg font-bold uppercase tracking-widest text-center ${isEditable ? 'outline-none hover:bg-white/10' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            USA
                                        </div>
                                        <div className="p-8 grid grid-cols-2 bg-slate-50 text-[13px] leading-relaxed border-t border-slate-200">
                                            <div
                                                className={`${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 transition-all' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="text-[#0A2458] font-bold uppercase tracking-wider mb-2">SIROCo Corporate Office</p>
                                                <p className="font-bold">6800 Weiskopf Avenue,<br />Suite 150 McKinney,<br />TX 75070 USA</p>
                                                <p className="mt-4 font-bold">Phone: <span className="font-normal">(844) 708-0008</span></p>
                                                <p className="font-bold">Email: <span className="font-normal">sales@sirocollc.com</span></p>
                                            </div>
                                            <div
                                                className={`pl-8 ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 transition-all' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="text-[#0A2458] font-bold uppercase tracking-wider mb-2">Regional Offices</p>
                                                <p className="font-bold">Atlanta</p>
                                                <p className="font-bold">Houston</p>
                                                <p className="font-bold">Jacksonville</p>
                                                <p className="font-bold">San Diego</p>
                                                <p className="font-bold">Orland Park</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* India */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <div
                                            className={`bg-[#EFA740] text-white py-2 text-lg font-bold uppercase tracking-widest text-center ${isEditable ? 'outline-none hover:bg-white/10' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            India
                                        </div>
                                        <div className="p-8 grid grid-cols-2 bg-slate-50 text-[13px] leading-relaxed border-t border-slate-200">
                                            <div
                                                className={`pr-4 border-r border-slate-200 ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 transition-all' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="text-[#0A2458] font-bold uppercase tracking-wider mb-2">Development Innovation Center</p>
                                                <p className="font-bold">Module 12, Thejaswini Building,<br />Technopark, Karyavattom – 695581<br />Kerala, INDIA</p>
                                                <p className="mt-4 font-bold">Phone: <span className="font-normal">+91 80868 00199</span></p>
                                                <p className="font-bold">Email: <span className="font-normal">info@sirocotech.com</span></p>
                                            </div>
                                            <div
                                                className={`pl-4 ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 transition-all' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="text-[#0A2458] font-bold uppercase tracking-wider mb-2">IT DEVELOPMENT CENTER</p>
                                                <p className="font-bold">17/99, 5th street 2nd Floor, lyyappa Nagar<br />Vijayalakshmi Mills, Kuniyamuthur, Palakkad<br />Main Road, Coimbatore 641008, Tamil Nadu, India</p>
                                                <p className="mt-4 font-bold">Mail id: <span className="font-normal">Information@vtabsquare.com</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MENA */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <div
                                            className={`bg-[#5C945E] text-white py-2 text-lg font-bold uppercase tracking-widest text-center ${isEditable ? 'outline-none hover:bg-white/10' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            MENA
                                        </div>
                                        <div className="p-8 bg-slate-50 text-[13px] leading-relaxed border-t border-slate-200">
                                            <div
                                                className={`${isEditable ? 'outline-none focus:ring-1 focus:ring-indigo-100 p-2 rounded' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="text-[#0A2458] font-bold uppercase tracking-wider mb-2">Regional Office</p>
                                                <p className="font-bold">Amman Jordan</p>
                                                <p className="mt-4 font-bold">Phone: <span className="font-normal">+962 65737421</span></p>
                                                <p className="font-bold">Email: <span className="font-normal">sales@sirocomena.com</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0A2458] py-4 px-10 mt-auto">
                                    <img src="/siroco.jpeg" alt="SIROCO" className="w-28 object-contain" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                `}</style>

                {showBulkResults && bulkResults && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden transform animate-in zoom-in-95 duration-300">
                            <div className="bg-indigo-600 px-8 py-10 text-white relative">
                                <button onClick={() => { setShowBulkResults(false); setBulkResults(null); }} className="absolute right-8 top-8 text-white/50 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="flex flex-col items-start gap-4">
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                        <FileSpreadsheet className="w-7 h-7 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-tight">Bulk Upload Complete</h2>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <div className="bg-white/20 rounded-2xl p-4 flex flex-col items-center min-w-[70px]">
                                        <span className="text-2xl font-bold leading-none">{bulkResults?.total}</span>
                                        <span className="text-[10px] font-medium text-indigo-100 mt-1 uppercase tracking-wider">Total</span>
                                    </div>
                                    <div className="bg-white/20 rounded-2xl p-4 flex flex-col items-center min-w-[70px]">
                                        <span className="text-2xl font-bold leading-none">{bulkResults?.results?.filter(r => r.success).length}</span>
                                        <span className="text-[10px] font-medium text-indigo-100 mt-1 uppercase tracking-wider">Uploaded</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 max-h-[340px] custom-scrollbar">
                                <div className="space-y-3">
                                    {bulkResults.results.map((res, idx) => (
                                        <div key={idx} className={`border rounded-3xl p-4 flex items-center justify-between ${res.success ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm border ${res.success ? 'bg-white text-emerald-500 border-emerald-50' : 'bg-white text-red-400 border-red-50'}`}>
                                                    <CheckCircle className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-900 text-sm">{res.candidateName}</span>
                                                    {!res.success && res.error && <p className="text-xs text-red-500 mt-0.5">{res.error}</p>}
                                                    {res.message && <p className="text-xs text-indigo-500 mt-0.5">{res.message}</p>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {res.driveLink && (
                                                    <a href={res.driveLink} target="_blank" rel="noopener noreferrer"
                                                        className="bg-white hover:bg-slate-50 text-emerald-600 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold border border-emerald-100 shadow-sm">
                                                        <ExternalLink className="w-3.5 h-3.5" /> Open
                                                    </a>
                                                )}
                                                {res.success && (
                                                    <button
                                                        onClick={() => { setSelectedMailItem(res); setRecipientEmail(''); setMailStatus({ type: '', message: '' }); setShowMailModal(true); }}
                                                        className="bg-white hover:bg-slate-50 text-indigo-600 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold border border-indigo-100 shadow-sm">
                                                        <Mail className="w-3.5 h-3.5" /> Mail
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-6 pt-0 bg-slate-50/30">
                                <button onClick={() => { setShowBulkResults(false); setBulkResults(null); }}
                                    className="w-full bg-[#1E293B] hover:bg-[#0F172A] text-white py-4 rounded-2xl text-sm font-bold transition-all shadow-xl active:scale-95">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showMailModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-300">
                            <div className="bg-indigo-600 px-8 py-8 text-white relative">
                                <button onClick={() => { setShowMailModal(false); setSelectedMailItem(null); }} className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                                    <Mail className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight">Send Probation Letter</h2>
                                <p className="text-indigo-100 text-xs mt-1 font-medium italic">
                                    To: {selectedMailItem ? (selectedMailItem.employeeName || selectedMailItem.candidateName) : (formData.toName || 'Employee')}
                                </p>
                            </div>
                            <form onSubmit={handleSendMail} className="p-8 space-y-6 bg-white">
                                <div>
                                    <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-3 ml-1">Recipient Email Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-indigo-400">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="email" required
                                            className="w-full bg-[#EEF2FF] border-none rounded-2xl py-4 pl-12 pr-4 text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-indigo-300 font-medium"
                                            placeholder="employee@example.com"
                                            value={recipientEmail}
                                            onChange={(e) => setRecipientEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {mailStatus.message && (
                                    <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${mailStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        <div className={`w-2 h-2 rounded-full ${mailStatus.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
                                        <p className="text-sm font-semibold">{mailStatus.message}</p>
                                    </div>
                                )}
                                <button type="submit" disabled={isSending}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98] group">
                                    {isSending ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Generating & Sending...</span></>) : (<><Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /><span>Send Official Email</span></>)}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProbationConfirmationEditor;



