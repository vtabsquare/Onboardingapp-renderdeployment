import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import {
    Download, Mail, Send, X, Loader2, Calendar, User,
    FileSpreadsheet, Upload, CheckCircle, ExternalLink, FileDown, Briefcase
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useEditable } from '../context/EditableContext';
import * as XLSX from 'xlsx';
import OtpModal from '../components/OtpModal';

const RelievingExperienceEditor = () => {
    const { isEditable, customLogo, setCustomLogo, customSign, setCustomSign } = useEditable();
    const logoInputRef = useRef();
    const signInputRef = useRef();
    const bulkUploadRef = useRef();
    const savedFormDataRef = useRef(null);

    const handleImageUpload = (e, setter) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setter(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const [formData, setFormData] = useState({
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        toName: '',
        employeeId: '',
        fromDate: '',
        relievingDate: '',
        jobTitle: '',
        businessTitle: '',
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

    // Sync Cover Letter
    useEffect(() => {
        setCoverLetter(`Dear Mr. ${formData.toName || 'Employee'},

Greetings from VTAB Square Pvt Ltd.

Please find attached your Experience Letter and Relieving Letter issued by VTAB Square Pvt Ltd.

This letter confirms that your resignation has been accepted and that you have been relieved from your duties with the organization as per the effective date mentioned in the attached document. It also certifies your employment with the company in the role of ${formData.businessTitle || formData.jobTitle || 'Data Analyst'} during your tenure.

We sincerely appreciate your contributions during your time with the organization and thank you for your efforts and dedication.
We wish you continued success in your future endeavors.
If you require any additional documentation or assistance, please feel free to contact us.

Best Regards,
Vimala C
Managing Director
Authorized Signatory
VTAB Square Pvt Ltd
(Now Part of Siroco)`);
    }, [formData.toName, formData.businessTitle, formData.jobTitle]);

    const validateForm = () => {
        if (isEditable) return true;
        const requiredFields = ['toName', 'employeeId', 'fromDate', 'relievingDate', 'jobTitle', 'businessTitle'];
        const missingFields = requiredFields.filter(field => !formData[field]);
        if (missingFields.length > 0) {
            alert('Please fill in all mandatory fields before proceeding.');
            return false;
        }
        const alphaOnly = /^[a-zA-Z\s.,''()-]+$/;
        if (!alphaOnly.test(formData.toName)) {
            alert('Employee Name must contain alphabets only.');
            return false;
        }
        if (!alphaOnly.test(formData.jobTitle)) {
            alert('Job Title must contain alphabets only.');
            return false;
        }
        if (!alphaOnly.test(formData.businessTitle)) {
            alert('Business Title must contain alphabets only.');
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

    // ── DOWNLOAD TEMPLATE ──────────────────────────────────────────────
    const downloadTemplate = () => {
        const headers = [
            'Employee Name',
            'Employee ID',
            'Job Title',
            'Business Title',
            'Issue Date',
            'Joined Date',
            'Relieving Date',
        ];
        const sampleRow = [
            'Syed Mohammed',
            'E00014',
            'Senior Data Analyst',
            'Data Analyst',
            '2026-03-20',
            '2024-01-15',
            '2026-03-31',
        ];
        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
        ws['!cols'] = headers.map(() => ({ wch: 22 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Relieving Experience');
        XLSX.writeFile(wb, 'Relieving_Experience_Template.xlsx');
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

            if (rows.length < 2) {
                alert('The uploaded file has no data rows.');
                setIsBulkProcessing(false);
                return;
            }

            const headerRow = rows[0].map(h => String(h || '').trim());
            const col = (name) => headerRow.findIndex(h => h.toLowerCase() === name.toLowerCase());

            const colMap = {
                employeeName: col('Employee Name'),
                employeeId: col('Employee ID'),
                jobTitle: col('Job Title'),
                businessTitle: col('Business Title'),
                issueDate: col('Issue Date'),
                joinedDate: col('Joined Date'),
                relievingDate: col('Relieving Date'),
            };

            const dataRows = rows.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
            if (dataRows.length === 0) {
                alert('No valid data rows found.');
                setIsBulkProcessing(false);
                return;
            }

            savedFormDataRef.current = { ...formData };
            setBulkProgress({ current: 0, total: dataRows.length });

            const candidatesArr = [];

            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                const getCellStr = (idx) => idx >= 0 && row[idx] !== undefined ? String(row[idx]).trim() : '';

                const employeeName = getCellStr(colMap.employeeName);
                if (!employeeName) continue;

                // Format dates properly for display in the PDF
                const formatDisplayDate = (rawDate) => {
                    if (!rawDate) return '';
                    const d = new Date(rawDate);
                    if (!isNaN(d)) {
                        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    }
                    return rawDate;
                };

                const issueDateRaw = getCellStr(colMap.issueDate);
                const joinedDateRaw = getCellStr(colMap.joinedDate);
                const relievingDateRaw = getCellStr(colMap.relievingDate);

                const rowData = {
                    toName: employeeName,
                    employeeId: getCellStr(colMap.employeeId),
                    jobTitle: getCellStr(colMap.jobTitle),
                    businessTitle: getCellStr(colMap.businessTitle),
                    date: issueDateRaw
                        ? formatDisplayDate(issueDateRaw)
                        : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                    fromDate: joinedDateRaw,
                    relievingDate: relievingDateRaw,
                };

                // Update form state to re-render the preview for this candidate
                setFormData(rowData);
                await new Promise(r => setTimeout(r, 450));
                const pdfDataUri = await capturePreviewAsPdfBase64();

                if (pdfDataUri) {
                    candidatesArr.push({
                        employeeName,
                        employeeId: rowData.employeeId,
                        jobTitle: rowData.jobTitle,
                        businessTitle: rowData.businessTitle,
                        issueDate: issueDateRaw,
                        joinedDate: joinedDateRaw,
                        relievingDate: relievingDateRaw,
                        pdfBase64: pdfDataUri,
                        // keep for email cover letter
                        toName: employeeName,
                    });
                }
                setBulkProgress({ current: i + 1, total: dataRows.length });
            }

            // Restore original form
            if (savedFormDataRef.current) setFormData(savedFormDataRef.current);

            if (candidatesArr.length === 0) {
                alert('No valid candidates found.');
                setIsBulkProcessing(false);
                return;
            }

            const response = await API.post('/relieving/bulk-upload', { candidates: candidatesArr });
            const { results, total } = response.data;

            const enrichedResults = results.map(r => {
                const cand = candidatesArr.find(c => c.employeeName === r.candidateName);
                return { ...r, ...(cand || {}) };
            });

            setBulkResults({ total, results: enrichedResults });
            setShowBulkResults(true);
        } catch (err) {
            console.error('Bulk upload error:', err);
            alert(`Bulk upload failed: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsBulkProcessing(false);
        }
    };

    // ── DOWNLOAD PDF (single) ──────────────────────────────────────────
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
                const dataUrl = await toJpeg(pages[i], { quality: 0.8, pixelRatio: 1.5, skipFonts: true });
                pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            }
            pdf.save(`Relieving_&_Experience_Letter_${formData.toName || 'Employee'}.pdf`);
        } catch (error) {
            console.error('PDF download error:', error);
            alert('Failed to generate PDF.');
        }
    };

    // ── GENERATE PDF BLOB FOR EMAIL ────────────────────────────────────
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
                const dataUrl = await toJpeg(pages[i], { quality: 0.7, pixelRatio: 1.2, skipFonts: true });
                pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            }
            return pdf.output('datauristring');
        } catch (error) {
            console.error('PDF generation for email error:', error);
            return null;
        }
    };

    // ── SEND MAIL ─────────────────────────────────────────────────────
    const handleSendMail = async (e) => {
        e.preventDefault();
        if (!selectedMailItem && !validateForm()) return;
        setIsSending(true);
        setMailStatus({ type: '', message: '' });

        try {
            let pdfDataUri = null;
            let employeeName = formData.toName || 'Employee';
            let role = formData.businessTitle || formData.jobTitle || 'Data Analyst';

            if (selectedMailItem) {
                pdfDataUri = selectedMailItem.pdfBase64;
                employeeName = selectedMailItem.employeeName || selectedMailItem.candidateName || 'Employee';
                role = selectedMailItem.businessTitle || selectedMailItem.jobTitle || 'Data Analyst';
            } else {
                pdfDataUri = await generatePDFBlob();
            }

            if (!pdfDataUri) throw new Error('Failed to generate PDF');

            const dynamicCoverLetter = `Dear Mr. ${employeeName},

Greetings from VTAB Square Pvt Ltd.

Please find attached your Experience Letter and Relieving Letter issued by VTAB Square Pvt Ltd.

This letter confirms that your resignation has been accepted and that you have been relieved from your duties with the organization as per the effective date mentioned in the attached document. It also certifies your employment with the company in the role of ${role} during your tenure.

We sincerely appreciate your contributions during your time with the organization and thank you for your efforts and dedication.
We wish you continued success in your future endeavors.
If you require any additional documentation or assistance, please feel free to contact us.

Best Regards,
Vimala C
Managing Director
Authorized Signatory
VTAB Square Pvt Ltd
(Now Part of Siroco)`;

            const response = await API.post('/relieving/send-email', {
                toEmail: recipientEmail,
                candidateName: employeeName,
                customSubject: `Relieving & Experience Letter – ${employeeName}`,
                customFileName: `Relieving_&_Experience_Letter_${employeeName}.pdf`,
                customMailContent: selectedMailItem ? dynamicCoverLetter : coverLetter,
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
            <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setCustomLogo)} />
            <input type="file" ref={signInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setCustomSign)} />
            <input type="file" ref={bulkUploadRef} className="hidden" accept=".xlsx, .xls" onChange={handleBulkUpload} />

            {/* Header */}
            <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div>
                    <h1 className="text-base md:text-lg font-bold text-slate-900 leading-none">Relieving & Experience Editor</h1>
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

            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Editor Panel */}
                <div className="w-full lg:w-[400px] bg-white border-b lg:border-b-0 lg:border-r border-slate-100 overflow-y-auto p-5 md:p-8 custom-scrollbar shadow-sm z-40 flex-shrink-0">
                    <div className="space-y-10">

                        {/* Employee Details */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <User className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Employee Details</h3>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className={labelClass}>Employee Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. Syed Mohammed"
                                        value={formData.toName}
                                        onChange={(e) => {
                                            const filteredValue = e.target.value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, toName: filteredValue });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Employee ID <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. E00014"
                                        value={formData.employeeId}
                                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Job Title (at relieving) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. Senior Data Analyst"
                                        value={formData.jobTitle}
                                        onChange={(e) => {
                                            const filteredValue = e.target.value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, jobTitle: filteredValue });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Business Title <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. Data Analyst"
                                        value={formData.businessTitle}
                                        onChange={(e) => {
                                            const filteredValue = e.target.value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, businessTitle: filteredValue });
                                        }}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Dates */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Calendar className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Dates</h3>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className={labelClass}>Issue Date</label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        onChange={(e) => {
                                            const d = new Date(e.target.value);
                                            setFormData({ ...formData, date: d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Joined Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        value={formData.fromDate}
                                        onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Relieving Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        value={formData.relievingDate}
                                        onChange={(e) => setFormData({ ...formData, relievingDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>

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

                {/* Preview Pane */}
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
                                    <div
                                        className={`flex flex-col items-center justify-center border border-transparent ${isEditable ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''}`}
                                        onClick={() => isEditable && logoInputRef.current.click()}
                                    >
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
                                        className={`text-white text-xl font-light tracking-[0.15em] uppercase leading-relaxed text-[16px] border border-transparent ${isEditable ? 'outline-none hover:bg-white/10 focus:bg-white/20' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        Prepared for
                                    </div>
                                    <div className="w-64 h-[1px] bg-white/20 mb-8"></div>
                                    <div
                                        className={`text-white text-[10px] leading-tight font-light border border-transparent ${isEditable ? 'outline-none hover:bg-white/10 focus:bg-white/20' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        Relieving letter &<br />Experience Letter
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
                                    <div
                                        className={`flex flex-col items-center justify-center border border-transparent ${isEditable ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''}`}
                                        onClick={() => isEditable && logoInputRef.current.click()}
                                    >
                                        {customLogo ? (
                                            <img src={customLogo} alt="Custom Logo" className="max-h-20 w-auto object-contain" />
                                        ) : (
                                            <>
                                                <div className="mb-2 bg-white p-1 w-20 h-20 flex items-center justify-center rounded-lg">
                                                    <img src="/vtab.jpg" alt="VTAB" className="w-full h-full object-contain scale-[1.4]" />
                                                </div>
                                                <div className="text-white text-[7px] font-bold tracking-widest uppercase mb-1">NOW PART OF</div>
                                                <img src="/siroco.jpeg" alt="SIROCO" className="h-8 object-contain" />
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 px-16 pt-12 pb-12 text-black font-sans leading-relaxed">
                                    <h2
                                        className={`text-3xl font-bold mb-10 text-center text-black border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 transition-colors' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        Experience Letter
                                    </h2>

                                    <div
                                        className={`mb-6 ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        <p className="font-bold text-lg">Dear Mr.{formData.toName || '[Name]'},</p>
                                        <p className="text-lg">Employee ID: {formData.employeeId || '[ID]'}</p>
                                    </div>

                                    <div
                                        className={`text-right mb-12 mr-6 font-bold text-lg border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                        contentEditable={isEditable}
                                        suppressContentEditableWarning={true}
                                    >
                                        {formData.date}
                                    </div>

                                    <div className="text-[15px] space-y-6 clear-both">
                                        <p
                                            className={`border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            This is to inform you that your letter of resignation has been accepted and you are relieved from the services of <strong>VTAB Square Private Limited</strong>.
                                        </p>
                                        <p
                                            className={`border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            This is also to certify that you had worked with the company from <strong>{formData.fromDate || '[From Date]'}</strong>, and Job Title at the time of relieving is <strong>{formData.jobTitle || '[Job Title]'}</strong> and your business title <strong>&quot;{formData.businessTitle || '[Business Title]'}&quot;</strong>. and last day of working with as is <strong>{formData.relievingDate || '[Relieving Date]'}</strong>.
                                        </p>
                                        <p
                                            className={`border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            We wish you all the very best in your future endeavors.
                                        </p>
                                    </div>

                                    <div className="mt-16">
                                        <div
                                            className={`font-bold text-lg border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 transition-colors' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            Your Faithfully,
                                        </div>
                                        <div
                                            className={`my-4 inline-block ${isEditable ? 'cursor-pointer hover:bg-indigo-50/50 transition-all' : ''}`}
                                            onClick={() => isEditable && signInputRef.current.click()}
                                        >
                                            <img src={customSign || "/sign.jpeg"} alt="Sign" className="h-16 w-auto object-contain" />
                                        </div>
                                        <div
                                            className={`border border-transparent ${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50 leading-tight font-bold text-[14px]' : 'text-[14px] leading-tight font-bold'}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            vimala C.<br />
                                            Managing Director.<br />
                                            Authorized Signatory.<br />
                                            VTAB Square Pvt Ltd (Now Part of Siroco)
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0A2458] py-3 px-10 mt-auto">
                                    <img src="/siroco.jpeg" alt="SIROCO" className="h-10 w-auto object-contain" />
                                </div>
                            </div>

                            {/* PAGE 3: CONTACT */}
                            <div className="relative h-[297mm] bg-white overflow-hidden flex flex-col">
                                <div className="bg-[#E2E8F0] h-6 mb-8"></div>
                                <div className="px-12 mb-8">
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
                                                className={`${isEditable ? 'outline-none hover:bg-indigo-100/50 p-2' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wider">SIROCo Corporate Office</p>
                                                <p className="font-bold">6800 Weiskopf Avenue,<br />Suite 150 McKinney,<br />TX 75070 USA</p>
                                                <p className="mt-4 font-bold">Phone: <span className="font-normal">(844) 708-0008</span></p>
                                                <p className="font-bold">Email: <span className="font-normal">sales@sirocollc.com</span></p>
                                            </div>
                                            <div
                                                className={`pl-8 ${isEditable ? 'outline-none hover:bg-indigo-100/50 p-2' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wider">Regional Offices</p>
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
                                            className={`bg-[#EFA740] text-white text-center py-2 text-xl font-bold uppercase tracking-widest ${isEditable ? 'outline-none hover:bg-white/10' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            India
                                        </div>
                                        <div className="p-8 flex justify-between bg-slate-50 text-[13px] leading-relaxed border-t border-slate-200">
                                            <div
                                                className={`pr-4 border-r border-slate-200 ${isEditable ? 'outline-none focus:ring-1 focus:ring-indigo-100 p-2 rounded' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wider">Development Innovation Center</p>
                                                <p className="font-bold">Module 12, Thejaswini Building,<br />Technopark, Karyavattom – 695581<br />Kerala, INDIA</p>
                                                <p className="mt-4 font-bold">Phone: <span className="font-normal">+91 80868 00199</span></p>
                                                <p className="font-bold">Email: <span className="font-normal">info@sirocotech.com</span></p>
                                            </div>
                                            <div
                                                className={`pl-4 ${isEditable ? 'outline-none focus:ring-1 focus:ring-indigo-100 p-2 rounded' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wider">IT DEVELOPMENT CENTER</p>
                                                <p className="font-bold">17/99, 5th street 2nd Floor, Iyyappa Nagar<br />Vijayalakshmi Mills, Kuniyamuthur, Palakkad<br />Main Road, Coimbatore 641008, Tamil Nadu, India</p>
                                                <p className="mt-4 font-bold">Mail id: <span className="font-normal">Information@vtabsquare.com</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MENA */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <div
                                            className={`bg-[#3FA15A] text-white text-center py-2 text-xl font-bold uppercase tracking-widest ${isEditable ? 'outline-none hover:bg-white/10' : ''}`}
                                            contentEditable={isEditable}
                                            suppressContentEditableWarning={true}
                                        >
                                            MENA
                                        </div>
                                        <div className="p-8 bg-slate-50 text-[13px] leading-relaxed border-t border-slate-200">
                                            <div
                                                className={`${isEditable ? 'outline-none hover:bg-indigo-50/50 focus:bg-indigo-50' : ''}`}
                                                contentEditable={isEditable}
                                                suppressContentEditableWarning={true}
                                            >
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wider">Regional Office</p>
                                                <p className="font-bold">Amman Jordan</p>
                                                <p className="mt-4 font-bold">Phone: <span className="font-normal">+962 65737421</span></p>
                                                <p className="font-bold">Email: <span className="font-normal">sales@sirocomena.com</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0A2458] py-4 px-10 mt-auto">
                                    <img src="/siroco.jpeg" alt="SIROCO" className="h-10 w-auto object-contain" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            `}</style>

            {/* Bulk Upload Results Modal */}
            {showBulkResults && bulkResults && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-white/20 transform animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="bg-indigo-600 px-8 py-10 text-white relative">
                            <button
                                onClick={() => { setShowBulkResults(false); setBulkResults(null); }}
                                className="absolute right-8 top-8 text-white/50 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex flex-col items-start gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                    <FileSpreadsheet className="w-7 h-7 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight">Bulk Upload Complete</h2>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center justify-center min-w-[70px]">
                                    <span className="text-2xl font-bold leading-none">{bulkResults?.total}</span>
                                    <span className="text-[10px] font-medium text-indigo-100 mt-1 uppercase tracking-wider">Total</span>
                                </div>
                                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center justify-center min-w-[70px]">
                                    <span className="text-2xl font-bold leading-none">
                                        {bulkResults?.results?.filter(r => r.success).length}
                                    </span>
                                    <span className="text-[10px] font-medium text-indigo-100 mt-1 uppercase tracking-wider">Uploaded</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 max-h-[340px] custom-scrollbar">
                            <div className="space-y-3">
                                {bulkResults.results.map((res, idx) => (
                                    <div
                                        key={idx}
                                        className={`border rounded-3xl p-4 flex items-center justify-between group ${res.success
                                            ? 'bg-emerald-50/50 border-emerald-100'
                                            : 'bg-red-50/50 border-red-100'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm border ${res.success
                                                ? 'bg-white text-emerald-500 border-emerald-50'
                                                : 'bg-white text-red-400 border-red-50'}`}>
                                                <CheckCircle className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-900 text-sm tracking-tight">{res.candidateName}</span>
                                                {!res.success && res.error && (
                                                    <p className="text-xs text-red-500 mt-0.5">{res.error}</p>
                                                )}
                                                {res.message && (
                                                    <p className="text-xs text-indigo-500 mt-0.5">{res.message}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {res.driveLink && (
                                                <a
                                                    href={res.driveLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-white hover:bg-slate-50 text-emerald-600 px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all border border-emerald-100 shadow-sm"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    Open
                                                </a>
                                            )}
                                            {res.success && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedMailItem(res);
                                                        setRecipientEmail('');
                                                        setMailStatus({ type: '', message: '' });
                                                        setShowMailModal(true);
                                                    }}
                                                    className="bg-white hover:bg-slate-50 text-indigo-600 px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all border border-indigo-100 shadow-sm"
                                                >
                                                    <Mail className="w-3.5 h-3.5" />
                                                    Mail
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 pt-0 bg-slate-50/30">
                            <button
                                onClick={() => { setShowBulkResults(false); setBulkResults(null); }}
                                className="w-full bg-[#1E293B] hover:bg-[#0F172A] text-white py-4 rounded-2xl text-sm font-bold transition-all shadow-xl active:scale-95"
                            >
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
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 transform animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="bg-indigo-600 px-8 py-8 text-white relative">
                            <button
                                onClick={() => { setShowMailModal(false); setSelectedMailItem(null); }}
                                className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                                <Mail className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight">Send Relieving Letter</h2>
                            <p className="text-indigo-100 text-xs mt-1 font-medium italic">
                                To: {selectedMailItem
                                    ? (selectedMailItem.employeeName || selectedMailItem.candidateName)
                                    : (formData.toName || 'Employee')}
                            </p>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSendMail} className="p-8 space-y-6 bg-white">
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-3 ml-1">
                                    Recipient Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-indigo-400">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="email"
                                        required
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

                            <button
                                type="submit"
                                disabled={isSending}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98] group"
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Generating & Sending...</span>
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
        </div>
    );
};

export default RelievingExperienceEditor;
