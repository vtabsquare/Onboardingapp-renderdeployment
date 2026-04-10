import React, { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { Download, LogOut, ChevronRight, MapPin, Building2, User, Calendar, Briefcase, Mail, Send, X, Loader2, Upload, DollarSign, FileSpreadsheet, CheckCircle, ExternalLink, FileDown } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { useEditable } from '../context/EditableContext';
import OtpModal from '../components/OtpModal';

const SalaryHikeEditor = () => {
    const { isEditable, customLogo, setCustomLogo, customSign, setCustomSign } = useEditable();
    const logoInputRef = useRef();
    const signInputRef = useRef();

    const handleImageUpload = (e, setter) => {
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
        date: new Date().toISOString().split('T')[0],
        employeeName: '',
        doorNo: '',
        street: '',
        addressLine1: '',
        addressLine2: '',
        district: '',
        state: '',
        pincode: '',
        newSalary: '20000',
        effectiveDate: '2025-04-24',
        photo: null
    });
    const [showMailModal, setShowMailModal] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [mailStatus, setMailStatus] = useState({ type: '', message: '' });
    const [coverLetter, setCoverLetter] = useState('');
    const [selectedMailItem, setSelectedMailItem] = useState(null);

    // OTP State
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    // Bulk upload state
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const [bulkResults, setBulkResults] = useState(null);
    const [showBulkResults, setShowBulkResults] = useState(false);

    const previewRef = useRef();
    const photoInputRef = useRef();
    const bulkUploadRef = useRef();
    const savedFormDataRef = useRef(null);

    // Sync Cover Letter with Form Data
    useEffect(() => {
        const formattedDate = formData.effectiveDate
            ? new Date(formData.effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : '24 April 2025';

        setCoverLetter(`Subject: Salary Hike Notification

Dear Mr. ${formData.employeeName || 'Syed'},

Greetings from VTAB Square Pvt Ltd.

We are pleased to inform you that, based on your outstanding performance and valuable contributions to the organization, your compensation has been reviewed and revised.

Please find attached your Salary Hike Notification Letter for your reference. As per the revision, your new annual salary will be INR ${formData.newSalary || '20,000'} per annum, and the updated compensation will be effective from ${formattedDate}.

We appreciate your hard work, dedication, and the value you bring to the organization. This revision reflects our recognition of your efforts and commitment to the continued success of VTAB Square Pvt Ltd.

Your revised salary will be reflected in your payroll from the effective date mentioned above.

If you have any questions regarding this revision, please feel free to contact the HR Department.

Congratulations on this well-deserved salary hike, and we look forward to your continued contributions to the growth and success of the organization.

Best Regards,
Vimala C
Managing Director
Authorized Signatory
VTAB Square Pvt Ltd
(Now Part of Siroco)`);
    }, [formData.employeeName, formData.newSalary, formData.effectiveDate]);

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const validateForm = () => {
        if (isEditable) return true;
        const requiredFields = [
            'employeeName', 'doorNo', 'street', 'addressLine1',
            'district', 'state', 'pincode', 'newSalary', 'effectiveDate'
        ];

        const missingFields = requiredFields.filter(field => !formData[field]);
        if (missingFields.length > 0) {
            alert('Please fill in all mandatory fields before proceeding.');
            return false;
        }

        const alphaOnly = /^[a-zA-Z\s.,''()-]+$/;
        const numericOnly = /^\d+(\.\d+)?$/;

        if (!alphaOnly.test(formData.employeeName)) {
            alert('Employee Name must contain alphabets only.');
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
        if (!numericOnly.test(formData.newSalary)) {
            alert('New Salary (INR) must be a number.');
            return false;
        }

        return true;
    };

    const handleDownloadClick = () => {
        if (!validateForm()) return;
        setPendingAction('download');
        setIsOtpModalOpen(true);
    };

    const handleMailClick = () => {
        setPendingAction('mail');
        setIsOtpModalOpen(true);
    };

    const handleOtpVerified = () => {
        setIsOtpModalOpen(false);
        if (pendingAction === 'download') {
            downloadPDF();
        } else if (pendingAction === 'mail') {
            setSelectedMailItem(null);
            setShowMailModal(true);
        }
    };

    const downloadTemplate = () => {
        const wsData = [
            ['Issue Date', 'Employee Name', 'Door No', 'Street', 'Address Line 1', 'Address Line 2', 'District', 'State', 'Pincode', 'New Salary (INR) *', 'Effective Date', 'Employee Photo URL'],
            ['2025-05-01', 'John Doe', '12', 'Main Street', 'Apt 4B', 'Building Complex', 'Chennai', 'Tamil Nadu', '600001', '250000', '2025-06-01', 'https://drive.google.com/file/d/.../view']
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [
            { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 40 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Salary Hike');
        XLSX.writeFile(wb, 'Salary_Hike_Template.xlsx');
    };

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

    const loadPhotoFromUrl = async (url) => {
        if (!url) return null;
        try {
            const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (!driveMatch) return null;
            const fileId = driveMatch[1];
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
                date: col('Issue Date'),
                employeeName: col('Employee Name'),
                doorNo: col('Door No'),
                street: col('Street'),
                addressLine1: col('Address Line 1'),
                addressLine2: col('Address Line 2'),
                district: col('District'),
                state: col('State'),
                pincode: col('Pincode'),
                newSalary: col('New Salary (INR) *'),
                effectiveDate: col('Effective Date'),
                photoUrl: col('Employee Photo URL')
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
                    date: get(colMap.date) || new Date().toISOString().split('T')[0],
                    employeeName,
                    doorNo: get(colMap.doorNo),
                    street: get(colMap.street),
                    addressLine1: get(colMap.addressLine1),
                    addressLine2: get(colMap.addressLine2),
                    district: get(colMap.district),
                    state: get(colMap.state),
                    pincode: get(colMap.pincode),
                    newSalary: get(colMap.newSalary) || '20000',
                    effectiveDate: get(colMap.effectiveDate),
                    photo: photoBase64
                };

                setFormData(rowData);
                await new Promise(r => setTimeout(r, 500));

                const pdfDataUri = await capturePreviewAsPdfBase64();
                if (pdfDataUri) {
                    candidatesArr.push({
                        date: rowData.date,
                        employeeName: rowData.employeeName,
                        doorNo: rowData.doorNo,
                        street: rowData.street,
                        addressLine1: rowData.addressLine1,
                        addressLine2: rowData.addressLine2,
                        district: rowData.district,
                        state: rowData.state,
                        pincode: rowData.pincode,
                        newSalary: rowData.newSalary,
                        effectiveDate: rowData.effectiveDate,
                        pdfBase64: pdfDataUri
                    });
                }
                setBulkProgress({ current: i + 1, total: dataRows.length });
            }

            if (savedFormDataRef.current) setFormData(savedFormDataRef.current);
            if (candidatesArr.length === 0) { alert('No valid candidates found.'); setIsBulkProcessing(false); return; }

            const response = await API.post('/salary-hike/bulk-upload', { candidates: candidatesArr });
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
            pdf.save(`Salary_Hike_Notification_${formData.employeeName || 'Employee'}.pdf`);
        } catch (error) {
            console.error('PDF download error:', error);
            alert('Failed to generate PDF.');
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
            console.error('PDF generation for email error:', error);
            return null;
        }
    };

    const handleSendMail = async (e) => {
        e.preventDefault();

        let pdfDataUri = null;
        let candidateName = '';
        let customFileName = '';
        let dynamicCoverLetter = '';

        if (selectedMailItem) {
            if (!selectedMailItem.pdfBase64) {
                setMailStatus({ type: 'error', message: 'PDF data missing for this candidate.' });
                return;
            }
            pdfDataUri = selectedMailItem.pdfBase64;
            candidateName = selectedMailItem.employeeName || 'Employee';
            customFileName = `Salary_Hike_Notification_${candidateName}.pdf`;

            const formattedDate = selectedMailItem.effectiveDate
                ? new Date(selectedMailItem.effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : '24 April 2025';

            dynamicCoverLetter = `Subject: Salary Hike Notification

Dear Mr. ${candidateName},

Greetings from VTAB Square Pvt Ltd.

We are pleased to inform you that, based on your outstanding performance and valuable contributions to the organization, your compensation has been reviewed and revised.

Please find attached your Salary Hike Notification Letter for your reference. As per the revision, your new annual salary will be INR ${selectedMailItem.newSalary || '20,000'} per annum, and the updated compensation will be effective from ${formattedDate}.

We appreciate your hard work, dedication, and the value you bring to the organization. This revision reflects our recognition of your efforts and commitment to the continued success of VTAB Square Pvt Ltd.

Your revised salary will be reflected in your payroll from the effective date mentioned above.

If you have any questions regarding this revision, please feel free to contact the HR Department.

Congratulations on this well-deserved salary hike, and we look forward to your continued contributions to the growth and success of the organization.

Best Regards,
Vimala C
Managing Director
Authorized Signatory
VTAB Square Pvt Ltd
(Now Part of Siroco)`;

        } else {
            if (!validateForm()) return;
            pdfDataUri = await generatePDFBlob();
            if (!pdfDataUri) {
                setMailStatus({ type: 'error', message: 'Failed to generate PDF' });
                return;
            }
            candidateName = formData.employeeName || 'Employee';
            customFileName = `Salary_Hike_Notification_${candidateName}.pdf`;
            dynamicCoverLetter = coverLetter;
        }

        setIsSending(true);
        setMailStatus({ type: '', message: '' });

        try {
            const response = await API.post('/salary-hike/send-email', {
                toEmail: recipientEmail,
                candidateName,
                customSubject: `Salary Hike Notification`,
                customFileName,
                customMailContent: dynamicCoverLetter,
                pdfBase64: pdfDataUri
            });

            if (response.data.success) {
                setMailStatus({ type: 'success', message: 'Email sent successfully!' });
                setTimeout(() => {
                    setShowMailModal(false);
                    setRecipientEmail('');
                    setMailStatus({ type: '', message: '' });
                    setSelectedMailItem(null);
                }, 2000);
            }
        } catch (error) {
            console.error('Email send error:', error);
            const errMsg = error.response?.data?.message || error.message || 'Failed to send email';
            setMailStatus({ type: 'error', message: errMsg });
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
                onChange={(e) => handleImageUpload(e, setCustomLogo)}
            />
            <input
                type="file"
                ref={signInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setCustomSign)}
            />

            {/* Header */}
            <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div>
                    <h1 className="text-base md:text-lg font-bold text-slate-900 leading-none">Salary Hike Editor</h1>
                    <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">VTAB Square Admin Portal</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <button
                        onClick={handleDownloadClick}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-indigo-100 transform active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Download PDF</span>
                    </button>
                    <button
                        onClick={handleMailClick}
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
                                    <label className={labelClass}>Issue Date</label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Employee Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. Syed"
                                        value={formData.employeeName}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, employeeName: filteredValue });
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
                                                <User className="w-6 h-6 text-slate-300" />
                                            )}
                                        </div>
                                        <input
                                            ref={photoInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                        />
                                    </div>
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
                                    <label className={labelClass}>Door No <span className="text-red-500">*</span></label>
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
                                    <label className={labelClass}>Street <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={formData.street}
                                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>Address Line 1 <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={formData.addressLine1}
                                        onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>Address Line 2</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={formData.addressLine2}
                                        onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>District <span className="text-red-500">*</span></label>
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
                                    <label className={labelClass}>State <span className="text-red-500">*</span></label>
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
                                    <label className={labelClass}>Pincode <span className="text-red-500">*</span></label>
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

                        {/* Hike Details */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <DollarSign className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Hike Details</h3>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className={labelClass}>New Salary (INR) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. 20000"
                                        value={formData.newSalary}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/\D/g, '');
                                            setFormData({ ...formData, newSalary: filteredValue });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Effective Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        value={formData.effectiveDate}
                                        onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
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

                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleBulkUpload}
                                    ref={bulkUploadRef}
                                    className="hidden"
                                    id="bulk-upload-input"
                                    disabled={isBulkProcessing}
                                />

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
                        <div id="capture-area" ref={previewRef} className="w-[210mm] bg-white shadow-2xl">
                            {/* PAGE 1: COVER */}
                            <div className="relative h-[297mm] bg-[#0A2458] overflow-hidden flex flex-col">
                                <div className="flex justify-between items-start pt-12 px-12 pb-20">
                                    <div
                                        className={`text-white text-[10px] leading-relaxed font-light border border-transparent ${isEditable ? 'outline-none hover:bg-white/10 focus:bg-white/20' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        www.sirocotech.com<br />
                                        sales@sirocollc.com<br />
                                        US: (844) 708-0008<br />
                                        IND: (996) 258-7975
                                    </div>
                                    <div className={`flex flex-col items-center justify-center border border-transparent ${isEditable ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''}`} onClick={() => isEditable && logoInputRef.current.click()}>
                                        {customLogo ? (
                                            <img src={customLogo} alt="Custom Logo" className="max-h-24 w-auto object-contain" />
                                        ) : (
                                            <>
                                                <div className="mb-2 bg-white p-1 w-24 h-24 flex items-center justify-center rounded-lg">
                                                    <img src="/vtab.jpg" alt="VTAB" className="w-full h-full object-contain scale-[1.4]" />
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
                                        Salary Hike Notification
                                    </div>
                                </div>

                                <div className="bg-white pt-10 px-12 pb-12 mt-auto">
                                    <h4
                                        className={`text-[#0A2458] font-bold text-xs mb-1 text-center italic ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        Statement of Confidentiality
                                    </h4>
                                    <p
                                        className={`text-[10px] leading-relaxed text-slate-800 text-center font-medium opacity-80 ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
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
                                        className={`text-white text-[10px] leading-relaxed font-light ${isEditable ? 'outline-none hover:bg-white/10 focus:bg-white/20' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        www.sirocotech.com<br />
                                        sales@sirocollc.com<br />
                                        US: (844) 708-0008<br />
                                        IND: (996) 258-7975
                                    </div>
                                    <div className={`flex flex-col items-center justify-center border border-transparent ${isEditable ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''}`} onClick={() => isEditable && logoInputRef.current.click()}>
                                        {customLogo ? (
                                            <img src={customLogo} alt="Custom Logo" className="max-h-20 w-auto object-contain" />
                                        ) : (
                                            <>
                                                <div className="mb-2 bg-white p-1 w-20 h-20 flex items-center justify-center rounded-lg">
                                                    <img src="/vtab.jpg" alt="VTAB" className="w-full h-full object-contain scale-[1.4]" />
                                                </div>
                                                <div className="text-[10px] font-bold tracking-widest uppercase text-white opacity-80 mb-2">Now part of</div>
                                                <img src="/siroco.jpeg" alt="SIROCO" className="h-8 object-contain" />
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 px-16 pt-12 pb-12 text-black font-sans relative">
                                    {/* Photo Area */}
                                    <div
                                        className={`absolute right-16 top-16 w-32 h-40 border-2 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center transition-colors ${isEditable
                                                ? 'border-indigo-300 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50'
                                                : 'border-slate-200'
                                            }`}
                                        onClick={() => isEditable && photoInputRef.current.click()}
                                        title={isEditable ? 'Click to upload photo' : ''}
                                    >
                                        {formData.photo ? (
                                            <img src={formData.photo} alt="Employee" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <User className="w-10 h-10 text-slate-300" />
                                                {isEditable && <span className="text-[9px] text-indigo-400 font-medium">Click to upload</span>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8 space-y-8">
                                        <div className="text-[14px]">
                                            <h2
                                                className={`text-xl font-bold text-[#0A2458] mb-6 border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 transition-colors' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                Dear {formData.employeeName || '[Name]'},
                                            </h2>

                                            <div className="mb-8 min-h-[100px]">
                                                <p
                                                    className={`font-bold border-b border-slate-900 w-max mb-2 uppercase tracking-wide border-t border-l border-r border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 transition-colors' : ''}`}
                                                    contentEditable={isEditable}
                                                    suppressContentEditableWarning={true}
                                                >
                                                    Address:
                                                </p>
                                                <div
                                                    className={`text-[13px] leading-relaxed text-slate-800 border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                                    contentEditable={isEditable}
                                                    suppressContentEditableWarning={true}
                                                >
                                                    {formData.doorNo && <span>{formData.doorNo}, </span>}
                                                    {formData.street && <span>{formData.street}, </span>}
                                                    <br />
                                                    {formData.addressLine1 && <span>{formData.addressLine1}, </span>}
                                                    {formData.addressLine2 && <span>{formData.addressLine2}, </span>}
                                                    <br />
                                                    {formData.district && <span>{formData.district}, </span>}
                                                    {formData.state && <span>{formData.state} - </span>}
                                                    {formData.pincode && <span>{formData.pincode}</span>}
                                                </div>
                                            </div>

                                            <div className="mb-8">
                                                <p
                                                    className={`font-bold border-b border-slate-900 w-max mb-4 uppercase tracking-wide italic border-t border-l border-r border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 transition-colors' : ''}`}
                                                    contentEditable={isEditable}
                                                    suppressContentEditableWarning={true}
                                                >
                                                    Re: Salary Hike Notification
                                                </p>
                                                <p
                                                    className={`leading-relaxed text-justify border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                                    contentEditable={isEditable}
                                                    suppressContentEditableWarning={true}
                                                >
                                                    We are pleased to inform you that, based on your outstanding performance and contributions to <span className="font-bold text-[#0A2458]">VTAB Square Pvt Ltd Now Part of Siroco Technology</span>, we have reviewed your compensation. As a result, we are delighted to offer you a revised salary, effective from <span className="font-bold">[{formData.effectiveDate}]</span>.
                                                </p>
                                            </div>

                                            <ul className="space-y-4 text-[13px] list-disc list-outside ml-5">
                                                <li
                                                    className={`border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                                    contentEditable={isEditable}
                                                    suppressContentEditableWarning={true}
                                                >
                                                    Your new annual salary will be <span className="font-bold">INR {formData.newSalary} per annum.</span>
                                                </li>
                                                <li
                                                    className={`${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                                    contentEditable={isEditable}
                                                    suppressContentEditableWarning={true}
                                                >
                                                    We recognize your hard work, dedication, and the value you bring to our organization. This salary adjustment is our way of acknowledging your efforts and ensuring that you are fairly compensated for your role and responsibilities.
                                                </li>
                                                <li
                                                    className={`${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                                    contentEditable={isEditable}
                                                    suppressContentEditableWarning={true}
                                                >
                                                    We believe that this salary increase is well-deserved and will help you in achieving your financial goals. Your new salary will be reflected in your payroll starting from <span className="font-bold">{formData.effectiveDate}</span>.
                                                </li>
                                                <li
                                                    className={`${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                                    contentEditable={isEditable}
                                                    suppressContentEditableWarning={true}
                                                >
                                                    If you have any questions or require further clarification regarding this salary revision, please do not hesitate to reach out to the Human Resources department.
                                                </li>
                                                <li
                                                    className={`${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                                    contentEditable={isEditable}
                                                    suppressContentEditableWarning={true}
                                                >
                                                    Once again, congratulations on this well-deserved salary hike, and we look forward to your continued contributions to our company's success.
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="mt-12 text-[13px]">
                                            <div
                                                className={`${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 mb-4' : 'mb-4'}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                Sincerely,
                                            </div>
                                            <div className={`mb-4 inline-block ${isEditable ? 'cursor-pointer hover:bg-indigo-50/50 focus:bg-indigo-50 transition-all' : ''}`} onClick={() => isEditable && signInputRef.current.click()}>
                                                <img src={customSign || "/sign.jpeg"} alt="Signature" className="h-16 w-auto object-contain" />
                                            </div>
                                            <div className="w-52 border-b border-slate-300 mt-2 mb-2"></div>
                                            <div
                                                className={`${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 leading-relaxed' : 'leading-relaxed'}`}
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
                                </div>

                                <div className="bg-[#0A2458] py-3 px-10 mt-auto flex justify-between items-center">
                                    <img src="/siroco.jpeg" alt="SIROCO" className="h-10 w-auto object-contain" />
                                    <span className="text-white font-bold">2</span>
                                </div>
                            </div>

                            {/* PAGE 3: CONTACT */}
                            <div className="relative h-[297mm] bg-white overflow-hidden flex flex-col">
                                <div className="px-12 pt-12 pb-8">
                                    <h3 className="text-2xl font-bold text-[#0A2458]">Contact Us</h3>
                                </div>

                                <div className="px-12 space-y-8 flex-1">
                                    {/* USA */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <div
                                            className={`bg-[#D14343] text-white text-center py-2 text-xl font-bold uppercase tracking-widest ${isEditable ? 'outline-none hover:bg-white/10' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            USA
                                        </div>
                                        <div className="p-8 flex justify-between bg-slate-50 text-[13px] leading-relaxed border-t border-slate-200">
                                            <div
                                                className={`flex-1 pr-6 ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wide">SIROCo Corporate Office</p>
                                                <p className="text-slate-700 font-bold">6800 Weiskopf Avenue,<br />Suite 150 McKinney,<br />TX 75070 USA</p>
                                                <p className="mt-4"><span className="font-bold text-black">Phone:</span> <span className="text-black">(844) 708-0008</span></p>
                                                <p><span className="font-bold text-black">Email:</span> <span className="text-black">sales@sirocollc.com</span></p>
                                            </div>
                                            <div
                                                className={`pl-8 ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wide">Regional Offices</p>
                                                <div className="grid grid-cols-1 gap-1 text-black font-bold">
                                                    <span>Atlanta</span>
                                                    <span>Houston</span>
                                                    <span>Jacksonville</span>
                                                    <span>San Diego</span>
                                                    <span>Orland Park</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* India */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <div
                                            className={`bg-[#EFA740] text-white text-center py-2 text-xl font-bold uppercase tracking-widest ${isEditable ? 'outline-none hover:bg-white/10' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            India
                                        </div>
                                        <div className="p-8 flex justify-between bg-slate-50 text-[13px] leading-relaxed border-t border-slate-200">
                                            <div
                                                className={`flex-1 pr-6 border-r border-slate-200 ${isEditable ? 'outline-none focus:ring-1 focus:ring-indigo-100 p-2 rounded' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wide">Development Innovation Center</p>
                                                <p className="text-slate-700 font-bold">Module 12, Thejaswini Building,<br />Technopark, Karyavattom – 695581<br />Kerala, INDIA</p>
                                                <p className="mt-4"><span className="font-bold text-black">Phone:</span> <span className="text-black">+91 80868 00199</span></p>
                                                <p><span className="font-bold text-black">Email:</span> <span className="text-black">info@sirocotech.com</span></p>
                                            </div>
                                            <div
                                                className={`flex-1 pl-6 ${isEditable ? 'outline-none focus:ring-1 focus:ring-indigo-100 p-2 rounded' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wide">IT DEVELOPMENT CENTER</p>
                                                <p className="text-slate-700 font-bold leading-snug">17/99, 5th street 2nd Floor, lyyappa Nagar,<br />Vijayalakshmi Mills, Kuniyamuthur, Palakkad<br />Main Road, Coimbatore 641008, Tamil Nadu, India</p>
                                                <p className="mt-4"><span className="font-bold text-black">Mail id:</span> <span className="text-black">Information@vtabsquare.com</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MENA */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <div
                                            className={`bg-[#3FA15A] text-white text-center py-2 text-xl font-bold uppercase tracking-widest ${isEditable ? 'outline-none focus:ring-2 focus:ring-white/50' : ''}`}
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
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wide">Regional Office</p>
                                                <p className="text-slate-700 font-bold">Amman Jordan</p>
                                                <p className="mt-4"><span className="font-bold text-black">Phone:</span> <span className="text-black">+962 65737421</span></p>
                                                <p><span className="font-bold text-black">Email:</span> <span className="text-black">sales@sirocomena.com</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0A2458] py-4 px-10 mt-auto flex justify-between items-center">
                                    <img src="/siroco.jpeg" alt="SIROCO" className="h-10 w-auto object-contain" />
                                    <span className="text-white font-bold">3</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div >
            </main >

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>

            {/* Bulk Results Modal */}
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

            <OtpModal
                isOpen={isOtpModalOpen}
                onClose={() => setIsOtpModalOpen(false)}
                onVerified={handleOtpVerified}
                actionLabel={pendingAction === 'mail' ? 'Send Mail' : 'Download PDF'}
            />

            {/* Email Modal */}
            {showMailModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-300">
                        <div className="bg-indigo-600 px-8 py-8 text-white relative">
                            <button onClick={() => { setShowMailModal(false); setSelectedMailItem(null); setRecipientEmail(''); }} className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                                <Mail className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight">Send Notification</h2>
                            <p className="text-indigo-100 text-xs mt-1 font-medium italic">
                                To: {selectedMailItem ? selectedMailItem.employeeName : (formData.employeeName || 'Employee')}
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
                                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${mailStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                    <div className={`w-2 h-2 rounded-full ${mailStatus.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
                                    <p className="text-sm font-semibold">{mailStatus.message}</p>
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={isSending}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98] group"
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        <span>Send Official Email</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
};

export default SalaryHikeEditor;


