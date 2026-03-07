import React, { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { Download, LogOut, ChevronRight, MapPin, Building2, User, Calendar, Briefcase, Mail, Send, X, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const OfferEditor = () => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        toName: '',
        doorNo: '',
        street: '',
        addressLine1: '',
        addressLine2: '',
        district: '',
        state: '',
        pincode: '',
        designation: 'Unpaid Intern',
        joiningDate: '',
        reportingManager: '',
        location: 'Remote',
        dearName: ''
    });
    const [showMailModal, setShowMailModal] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [mailStatus, setMailStatus] = useState({ type: '', message: '' });

    const previewRef = useRef();

    // Sync Dear Name with To Name
    useEffect(() => {
        setFormData(prev => ({ ...prev, dearName: prev.toName }));
    }, [formData.toName]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    const validateForm = () => {
        const requiredFields = [
            'toName', 'doorNo', 'street', 'addressLine1', 'addressLine2',
            'district', 'state', 'pincode', 'joiningDate', 'reportingManager',
            'location'
        ];

        const missingFields = requiredFields.filter(field => !formData[field]);
        if (missingFields.length > 0) {
            alert('Please fill in all mandatory fields before proceeding.');
            return false;
        }

        const alphaOnly = /^[a-zA-Z\s.,''()-]+$/;
        const numericOnly = /^\d+$/;

        if (!alphaOnly.test(formData.toName)) {
            alert('Candidate Name must contain alphabets only.');
            return false;
        }
        if (!numericOnly.test(formData.doorNo)) {
            alert('Door No must contain numbers only.');
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
        if (!alphaOnly.test(formData.reportingManager)) {
            alert('Reporting Manager must contain alphabets only.');
            return false;
        }
        if (!alphaOnly.test(formData.location)) {
            alert('Work Location must contain alphabets only.');
            return false;
        }

        return true;
    };

    const downloadPDF = async () => {
        if (!validateForm()) return;
        try {
            const element = previewRef.current;
            if (!element) return;

            // Create PDF with A4 format
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pages = element.children;

            for (let i = 0; i < pages.length; i++) {
                if (i > 0) pdf.addPage();

                // Recursively sanitize colors for each page to avoid oklab/oklch errors
                const sanitize = (el) => {
                    const elements = el.querySelectorAll('*');
                    [el, ...elements].forEach(node => {
                        if (node.nodeType !== 1) return;
                        const style = window.getComputedStyle(node);
                        ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'].forEach(prop => {
                            const val = style[prop];
                            if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix'))) {
                                node.style[prop] = val; // Force resolution to RGB
                            }
                        });
                    });
                };

                sanitize(pages[i]);

                // Capture each page as a PNG
                const dataUrl = await toPng(pages[i], {
                    quality: 1,
                    pixelRatio: 2,
                    skipFonts: true,
                });

                pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
            }
            pdf.save(`Offer_Letter_${formData.toName || 'Candidate'}.pdf`);
        } catch (error) {
            console.error('PDF download error:', error);
            // Fallback for extreme cases
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

                // Switching to JPEG and further reducing resolution for drastic size reduction
                // Brevo limit is 20MB, but smaller is better for connection stability
                const dataUrl = await toPng(pages[i], {
                    quality: 0.6, // Lower quality
                    pixelRatio: 1.2, // Lower resolution
                    skipFonts: true,
                });

                // Add as JPEG instead of PNG (JPEG is much smaller for these types of documents)
                pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            }

            const output = pdf.output('datauristring');
            console.log(`Optimized PDF Size: ${Math.round(output.length / 1024)} KB`);
            return output;
        } catch (error) {
            console.error('PDF generation for email error:', error);
            return null;
        }
    };

    const handleSendMail = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsSending(true);
        setMailStatus({ type: '', message: '' });

        try {
            const pdfDataUri = await generatePDFBlob();
            if (!pdfDataUri) {
                throw new Error('Failed to generate PDF');
            }

            const joinedDateFormatted = formData.joiningDate
                ? new Date(formData.joiningDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                })
                : '[Date]';

            const response = await API.post('/offer/send-email', {
                toEmail: recipientEmail,
                candidateName: formData.toName || 'Candidate',
                joiningDate: joinedDateFormatted,
                customFileName: `Offer_Letter_${formData.toName || 'Candidate'}.pdf`,
                customSubject: `Confirmation of Joining – ${formData.designation || 'Internship'}`,
                customMailContent: `Dear ${formData.toName || 'Candidate'},
 
 Greetings.

We are pleased to confirm your joining with VTAB Square Pvt. Ltd. as a ${formData.designation || 'Paid Intern'}, effective ${joinedDateFormatted}

This is to acknowledge and formally confirm your employment with us. Please consider this as your Employment Joining Confirmation.

We look forward to having you on our team and wish you a successful journey with VTAB Square Pvt. Ltd.

Your Reporting Manager is  ${formData.reportingManager?.startsWith('Mr.') ? '' : 'Mr. '}${formData.reportingManager || 'Vignesh Raja'}.

Thank you.

Best regards,
Vimala C.
Managing Director
Authorized Signatory
VTAB Square Pvt Ltd (Now Part of Siroco)
`,
                pdfBase64: pdfDataUri
            });

            if (response.data.success) {
                setMailStatus({ type: 'success', message: 'Email sent successfully!' });
                setTimeout(() => {
                    setShowMailModal(false);
                    setRecipientEmail('');
                    setMailStatus({ type: '', message: '' });
                }, 2000);
            }
        } catch (error) {
            console.error('Email send error:', error);

            // Handle 401 specifically
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }

            const errMsg = error.response?.data?.message || error.message || 'Failed to send email';
            setMailStatus({
                type: 'error',
                message: errMsg.includes('SIZE_EXCEEDED') ? 'PDF too large. Try a shorter name or fewer pages.' : errMsg
            });
        } finally {
            setIsSending(false);
        }
    };

    // New Premium Sidebar Styles
    const inputClass = "w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all shadow-sm";
    const labelClass = "block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider ml-1";

    return (
        <div className="flex-1 flex flex-col font-sans min-h-0">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div>
                    <h1 className="text-base md:text-lg font-bold text-slate-900 leading-none">Offer Letter Editor</h1>
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
                        onClick={() => setShowMailModal(true)}
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
                                    <Calendar className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Basic Information</h3>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className={labelClass}>Offer Date</label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        value={formData.date}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Candidate Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. Sanjay S"
                                        value={formData.toName}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, toName: filteredValue });
                                        }}
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
                                    <label className={labelClass}>Door No <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={formData.doorNo}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/\D/g, '');
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
                                    <label className={labelClass}>Address Line 2 <span className="text-red-500">*</span></label>
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

                        {/* Employment Details */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Briefcase className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Employment Details</h3>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className={labelClass}>Designation</label>
                                    <select
                                        className={inputClass}
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                    >
                                        <option value="UnPaid Intern">UnPaid Intern</option>
                                        <option value="Paid Intern">Paid Intern</option>
                                        <option value="FTE(Full Time Employee)">FTE(Full Time Employee)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Joining Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        min={new Date().toISOString().split('T')[0]}
                                        value={formData.joiningDate}
                                        onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Reporting Manager <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. Manager Name"
                                        value={formData.reportingManager}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, reportingManager: filteredValue });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Work Location <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={formData.location}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, location: filteredValue });
                                        }}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Live Preview Pane */}
                <div className="flex-1 bg-slate-200 overflow-y-auto overflow-x-hidden p-4 md:p-12 flex justify-center custom-scrollbar">
                    {/* Wrapper to ensure capture area remains stable during transform resets */}
                    <div className="origin-top scale-[0.4] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.6] xl:scale-[0.85] 2xl:scale-100 mb-20 transition-transform duration-300">
                        <div id="capture-area" ref={previewRef} className="w-[210mm] bg-white" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                            {/* PAGE 1: COVER */}
                            <div className="relative h-[297mm] bg-[#0A2458] overflow-hidden flex flex-col">
                                {/* Header Page 1 */}
                                <div className="flex justify-between items-start pt-12 px-12 pb-20">
                                    <div className="text-white text-[10px] leading-tight font-light">
                                        www.sirocotech.com<br />
                                        sales@sirocotech.com<br />
                                        US: (844) 708-0008<br />
                                        IND: (996) 258-7975
                                    </div>
                                    {/* <div className="flex flex-col items-end">
                                        <div className="mb-2 bg-white rounded p-2 w-14 h-14 flex items-center justify-center">
                                            <img src="/vtab.jpg" alt="Logo" className="w-10 h-10 object-contain" />
                                        </div>
                                        <div className="text-white text-[9px] font-bold tracking-widest uppercase">Now part of</div>
                                        <div className="mt-1">
                                            <img src="/siroco.png" alt="SIROCo" className="h-10 w-auto object-contain" />
                                        </div>
                                    </div> */}
                                    <div className="flex flex-col items-center">
                                        <div className="mb-2 bg-white p-2 w-18 h-18 flex items-center justify-center">
                                            <img src="/vtab.jpg" alt="VTAB" className="w-10 h-10 object-contain" />
                                        </div>
                                        <div className="text-[10px] font-bold tracking-widest uppercase text-white opacity-80 mb-2">Now part of</div>
                                        <img src="/siroco.jpeg" alt="SIROCO" className="h-8 object-contain" />
                                    </div>
                                </div>

                                {/* Title Page 1 */}
                                <div className="flex-1 flex flex-col items-center justify-center text-center px-12">
                                    <div className="text-white text-2xl font-medium mb-6 uppercase tracking-[0.2em] opacity-90 text-[14px]">Prepared for</div>
                                    <div className="w-64 h-[1px] bg-white/20 mb-8"></div>
                                    <div className="text-white text-xl font-light tracking-[0.15em] uppercase leading-relaxed text-[16px]">
                                        Offer Letter
                                    </div>
                                </div>

                                {/* Footer Page 1 */}
                                <div className="bg-white pt-10 px-12 pb-12 mt-auto">
                                    <h4 className="text-[#0A2458] font-bold text-xs mb-1 text-center italic">Statement of Confidentiality</h4>
                                    <p className="text-[10px] leading-relaxed text-slate-800 text-center font-medium opacity-80">
                                        This proposal has been distributed on a confidential basis for your information only. By accepting it, you agree not to disseminate it to any other person or entity in any manner and not to use the information for any purpose other than considering opportunities for a cooperative business relationship with owner of portfolio.
                                    </p>
                                </div>
                            </div>

                            {/* PAGE 2: LETTER */}
                            <div className="relative h-[297mm] bg-white overflow-hidden flex flex-col">
                                {/* Header Page 2 */}
                                <div className="bg-[#0A2458] flex justify-between items-start pt-8 px-12 pb-8">
                                    <div className="text-white text-[10px] leading-tight font-light">
                                        www.sirocotech.com<br />
                                        sales@sirocotech.com<br />
                                        US: (844) 708-0008<br />
                                        IND: (996) 258-7975
                                    </div>
                                    {/* <div className="flex flex-col items-end">
                                        <div className="mb-1">
                                            <img src="/vtab.jpg" alt="Logo" className="w-10 h-10 object-contain" />
                                        </div>
                                        <div className="text-white text-[7px] font-bold tracking-widest uppercase opacity-80">Now part of</div>
                                        <div className="mt-0.5">
                                            <img src="/siroco.png" alt="SIROCo" className="h-8 w-auto object-contain" />
                                        </div>
                                    </div> */}
                                    <div className="flex flex-col items-center">
                                        <div className="mb-2 bg-white p-2 w-14 h-14 flex items-center justify-center">
                                            <img src="/vtab.jpg" alt="VTAB" className="w-10 h-10 object-contain" />
                                        </div>
                                        <div className="text-[10px] font-bold tracking-widest uppercase text-white opacity-80 mb-2">Now part of</div>
                                        <img src="/siroco.jpeg" alt="SIROCO" className="h-8 object-contain" />
                                    </div>
                                </div>

                                {/* Body Page 2 */}
                                <div className="flex-1 px-16 pt-12 pb-12 text-gray-900 font-sans">
                                    <h2 className="text-lg font-bold mb-10 mt-6 text-[#0A2458]">Employment Joining Confirmation</h2>

                                    <div className="mb-10 text-[11px]">
                                        <span className="font-bold">Date:</span> {formData.date.split('-').reverse().join('-')}
                                    </div>

                                    <div className="mb-10 text-[11px] leading-relaxed">
                                        To {formData.toName || '[Candidate Name]'},<br />
                                        {formData.doorNo && <span>{formData.doorNo}, </span>}
                                        {formData.street && <span>{formData.street}, </span>}
                                        {formData.addressLine1 && <span>{formData.addressLine1}, </span>}
                                        {formData.addressLine2 && <span>{formData.addressLine2}, </span>}
                                        <br />
                                        {formData.district && <span>{formData.district}, </span>}
                                        {formData.state && <span>{formData.state}, </span>}
                                        {formData.pincode && <span>{formData.pincode} </span>}
                                    </div>

                                    <div className="mb-6 text-[11px]">
                                        <span className="font-bold">Subject: Confirmation of Joining</span>
                                    </div>

                                    <div className="mb-8 text-[11px]">
                                        Dear <span className="font-bold">{formData.dearName || '[Candidate Name]'}</span>,
                                    </div>

                                    <div className="text-[11px] leading-relaxed space-y-6">
                                        <p>
                                            This is to confirm that you have joined <span className="font-bold">VTAB Square Pvt Ltd</span> as <span className="font-bold">{formData.designation}</span> on <span className="font-bold">{formData.joiningDate.split('-').reverse().join('-') || '[Joining Date]'}</span>. You will be reporting to <span className="font-bold">{formData.reportingManager || '[Manager Name]'}</span> and your work location is <span className="font-bold">[{formData.location}]</span>.
                                        </p>
                                        <p>
                                            We are pleased to have you as part of our team and look forward to your contributions toward the growth and success of the organization. This letter serves as official proof of your employment with <span className="font-bold">VTAB Square Pvt Ltd</span> effective from your joining date.
                                        </p>
                                        <p>
                                            Should you require any additional information or documentation, please feel free to contact the HR department.
                                        </p>
                                    </div>

                                    <div className="mt-12 text-[11px]">
                                        Sincerely,<br /><br />
                                        <div className="mb-2">
                                            <img src="/sign.jpeg" alt="Signature" className="h-12 w-auto object-contain opacity-90" />
                                        </div>
                                        <div className="w-52 border-b border-slate-300 mt-2 mb-2"></div>
                                        Authorized Signatory<br />
                                        Vimala C.<br />
                                        Managing Director<br />
                                        VTAB Square Pvt Ltd (Now Part of Siroco)
                                    </div>
                                </div>

                                {/* Footer Page 2 */}
                                <div className="bg-[#0A2458] pt-4 px-12 pb-4 flex justify-between items-center mt-auto">
                                    <div className="flex items-center">
                                        <img src="/siroco.jpeg" alt="SIROCo" className="h-8 w-auto object-contain" />
                                    </div>
                                    <div className="text-white text-lg font-bold">2</div>
                                </div>
                            </div>

                            {/* PAGE 3: CONTACT */}
                            <div className="relative h-[297mm] bg-white overflow-hidden flex flex-col">
                                {/* Header Page 3 (Hidden title) */}
                                <div className="px-12 pt-12 pb-8 text-gray-900">
                                    <h3 className="text-sm font-bold text-[#0A2458]">Contact Us</h3>
                                </div>

                                <div className="px-12 space-y-10">
                                    {/* USA */}
                                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg overflow-hidden">
                                        <div className="bg-[#D14343] text-white text-center py-2 text-xs font-bold uppercase tracking-widest">USA</div>
                                        <div className="p-8 grid grid-cols-2 gap-8 text-gray-900">
                                            <div className="text-[10px] space-y-4">
                                                <p className="font-bold text-gray-900">Corporate Office</p>
                                                <p>6800 Weiskopf Avenue,<br />Suite 150 McKinney,<br />TX 75070 USA</p>
                                                <p>Phone: (844) 708-0008</p>
                                                <p>Email: sales@sirocollc.com</p>
                                            </div>
                                            <div className="text-[10px] space-y-2">
                                                <p className="font-bold text-gray-900">Regional Offices</p>
                                                <p>Atlanta</p>
                                                <p>Houston</p>
                                                <p>Jacksonville</p>
                                                <p>San Diego</p>
                                                <p>Orland Park</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* India */}
                                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg overflow-hidden">
                                        <div className="bg-[#EFA740] text-white text-center py-2 text-xs font-bold uppercase tracking-widest">India</div>
                                        <div className="p-8 grid grid-cols-2 gap-8 text-gray-900">
                                            <div className="text-[10px] space-y-4">
                                                <p className="font-bold text-gray-900">Development Innovation Center</p>
                                                <p>Module 12, Thejaswini Building,<br />Technopark, Kovalam, 695581<br />Kerala, INDIA</p>
                                                <p>Phone: +91 80868 00199</p>
                                                <p>Email: info@sirocotech.com</p>
                                            </div>
                                            <div className="text-[10px] space-y-4">
                                                <p className="font-bold text-gray-900">IT DEVELOPMENT CENTER</p>
                                                <p>17/99, 5th Street 2nd Floor, Iyappan Nagar,<br />Vijayalakshmi Mills, Kuniamuthur, Palakkad<br />Main Road, Coimbatore 641008, Tamil<br />Nadu, India</p>
                                                <p>Mail id: information@vtabSquare.com</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MENA */}
                                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg overflow-hidden">
                                        <div className="bg-[#3FA15A] text-white text-center py-2 text-xs font-bold uppercase tracking-widest">MENA</div>
                                        <div className="p-8 text-gray-900">
                                            <div className="text-[10px] space-y-4">
                                                <p className="font-bold text-gray-900">Regional Office</p>
                                                <p>Amman, Jordan</p>
                                                <p>Phone: +962 65373421</p>
                                                <p>Email: sales@sirocomena.com</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Page 3 */}
                                <div className="bg-[#0A2458] pt-4 px-12 pb-4 flex justify-between items-center mt-auto">
                                    <div className="flex items-center">
                                        <img src="/siroco.jpeg" alt="SIROCo" className="h-8 w-auto object-contain" />
                                    </div>
                                    <div className="text-white text-lg font-bold">3</div>
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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        @media print {
          .no-print { display: none; }
        }
      `}</style>

            {/* Email Modal */}
            {showMailModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20 transform animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="bg-indigo-600 px-8 py-6 text-white relative">
                            <button
                                onClick={() => setShowMailModal(false)}
                                className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                                <Mail className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-xl font-bold">Send Offer Letter</h2>
                            <p className="text-indigo-100/80 text-sm mt-1">To: {formData.toName || 'Candidate'}</p>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSendMail} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Recipient Email Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-slate-900 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all"
                                        placeholder="candidate@example.com"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {mailStatus.message && (
                                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${mailStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                                    }`}>
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

export default OfferEditor;





