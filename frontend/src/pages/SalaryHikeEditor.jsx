import React, { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { Download, LogOut, ChevronRight, MapPin, Building2, User, Calendar, Briefcase, Mail, Send, X, Loader2, Upload, DollarSign } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const SalaryHikeEditor = () => {
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

    const previewRef = useRef();
    const photoInputRef = useRef();

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
        if (!numericOnly.test(formData.newSalary)) {
            alert('New Salary (INR) must be a number.');
            return false;
        }

        return true;
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

                const dataUrl = await toPng(pages[i], {
                    quality: 1,
                    pixelRatio: 2,
                    skipFonts: true,
                });

                pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
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

                const dataUrl = await toPng(pages[i], {
                    quality: 0.6,
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
        if (!validateForm()) return;
        setIsSending(true);
        setMailStatus({ type: '', message: '' });

        try {
            const pdfDataUri = await generatePDFBlob();
            if (!pdfDataUri) throw new Error('Failed to generate PDF');

            const response = await API.post('/offer/send-email', {
                toEmail: recipientEmail,
                candidateName: formData.employeeName || 'Employee',
                customSubject: `Salary Hike Notification`,
                customFileName: `Salary_Hike_Notification_${formData.employeeName || 'Employee'}.pdf`,
                customMailContent: coverLetter,
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
            {/* Header */}
            <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div>
                    <h1 className="text-base md:text-lg font-bold text-slate-900 leading-none">Salary Hike Editor</h1>
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
                                        min={new Date().toISOString().split('T')[0]}
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
                                    <div className="mt-1 flex items-center gap-4">
                                        <button
                                            onClick={() => photoInputRef.current.click()}
                                            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-all"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            Upload Photo
                                        </button>
                                        <input
                                            ref={photoInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                        />
                                        {formData.photo && (
                                            <img src={formData.photo} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                                        )}
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
                                        min={new Date().toISOString().split('T')[0]}
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
                    </div>
                </div>

                {/* Live Preview Pane */}
                <div className="flex-1 bg-slate-200 overflow-y-auto overflow-x-hidden p-4 md:p-12 flex justify-center custom-scrollbar">
                    <div className="origin-top scale-[0.4] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.6] xl:scale-[0.85] 2xl:scale-100 mb-20 transition-transform duration-300">
                        <div id="capture-area" ref={previewRef} className="w-[210mm] bg-white shadow-2xl">
                            {/* PAGE 1: COVER */}
                            <div className="relative h-[297mm] bg-[#0A2458] overflow-hidden flex flex-col">
                                <div className="flex justify-between items-start pt-12 px-12 pb-20">
                                    <div className="text-white text-[10px] leading-tight font-light">
                                        www.sirocotech.com<br />
                                        sales@sirocotech.com<br />
                                        US: (844) 708-0008<br />
                                        IND: (996) 259-7975
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="mb-2 bg-white p-2 w-18 h-18 flex items-center justify-center">
                                            <img src="/vtab.jpg" alt="VTAB" className="w-10 h-10 object-contain" />
                                        </div>
                                        <div className="text-[10px] font-bold tracking-widest uppercase text-white opacity-80 mb-2">Now part of</div>
                                        <img src="/siroco.jpeg" alt="SIROCO" className="h-8 object-contain" />
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col items-center justify-center text-center px-12">
                                    <div className="text-white text-2xl font-medium mb-6 uppercase tracking-[0.2em] opacity-90 text-[14px]">Prepared for</div>
                                    <div className="w-64 h-[1px] bg-white/20 mb-8"></div>
                                    <div className="text-white text-xl font-light tracking-[0.15em] uppercase leading-relaxed text-[16px]">
                                        Salary Hike Notification
                                    </div>
                                </div>

                                <div className="bg-white pt-10 px-12 pb-12 mt-auto">
                                    <h4 className="text-[#0A2458] font-bold text-xs mb-1 text-center italic">Statement of Confidentiality</h4>
                                    <p className="text-[10px] leading-relaxed text-slate-800 text-center font-medium opacity-80">
                                        This proposal has been distributed on a confidential basis for your information only. By accepting it, you agree not to disseminate it to any other person or entity in any manner and not to use the information for any purpose other than considering opportunities for a cooperative business relationship with owner of portfolio.
                                    </p>
                                </div>
                            </div>

                            {/* PAGE 2: MAIN LETTER */}
                            <div className="relative h-[297mm] bg-white overflow-hidden flex flex-col">
                                <div className="bg-[#0A2458] flex justify-between items-start pt-8 px-12 pb-8">
                                    <div className="text-white text-[10px] leading-tight font-light">
                                        www.sirocotech.com<br />
                                        sales@sirocotech.com<br />
                                        US: (844) 708-0008<br />
                                        IND: (996) 259-7975
                                    </div>
                                    <div className="flex flex-col items-center">
                                                                                <div className="mb-2 bg-white p-2 w-14 h-14 flex items-center justify-center">
                                            <img src="/vtab.jpg" alt="VTAB" className="w-10 h-10 object-contain" />
                                        </div>
                                        <div className="text-[10px] font-bold tracking-widest uppercase text-white opacity-80 mb-2">Now part of</div>
                                        <img src="/siroco.jpeg" alt="SIROCO" className="h-8 object-contain" />
                                    </div>
                                </div>

                                <div className="flex-1 px-16 pt-12 pb-12 text-black font-sans relative">
                                    {/* Photo Area */}
                                    <div className="absolute right-16 top-16 w-32 h-40 border-2 border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                                        {formData.photo ? (
                                            <img src={formData.photo} alt="Employee" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-12 h-12 text-slate-300" />
                                        )}
                                    </div>

                                    <div className="mt-8 space-y-8">
                                        <div className="text-[14px]">
                                            <h2 className="text-xl font-bold text-[#0A2458] mb-6">Dear {formData.employeeName || '[Name]'},</h2>

                                            <div className="mb-8">
                                                <p className="font-bold border-b border-slate-900 w-max mb-2 uppercase tracking-wide">Address:</p>
                                                <div className="text-[13px] leading-relaxed text-slate-800">
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
                                                <p className="font-bold border-b border-slate-900 w-max mb-4 uppercase tracking-wide italic">Re: Salary Hike Notification</p>
                                                <p className="leading-relaxed text-justify">
                                                    We are pleased to inform you that, based on your outstanding performance and contributions to <span className="font-bold text-[#0A2458]">VTAB Square Pvt Ltd Now Part of Siroco Technology</span>, we have reviewed your compensation. As a result, we are delighted to offer you a revised salary, effective from <span className="font-bold">[{formData.effectiveDate}]</span>.
                                                </p>
                                            </div>

                                            <ul className="space-y-4 text-[13px] list-disc list-outside ml-5">
                                                <li>Your new annual salary will be <span className="font-bold">INR {formData.newSalary} per annum.</span></li>
                                                <li>We recognize your hard work, dedication, and the value you bring to our organization. This salary adjustment is our way of acknowledging your efforts and ensuring that you are fairly compensated for your role and responsibilities.</li>
                                                <li>We believe that this salary increase is well-deserved and will help you in achieving your financial goals. Your new salary will be reflected in your payroll starting from <span className="font-bold">{formData.effectiveDate}</span>.</li>
                                                <li>If you have any questions or require further clarification regarding this salary revision, please do not hesitate to reach out to the Human Resources department.</li>
                                                <li>Once again, congratulations on this well-deserved salary hike, and we look forward to your continued contributions to our company's success.</li>
                                            </ul>
                                        </div>

                                        <div className="mt-12 text-[13px]">
                                            <p className="mb-4">Sincerely,</p>
                                            <div className="mb-4">
                                                <img src="/sign.jpeg" alt="Signature" className="h-16 w-auto object-contain" />
                                            </div>
                                            <div className="w-52 border-b border-slate-300 mt-2 mb-2"></div>
                                            Authorized Signatory<br />
                                            Vimala C.<br />
                                            Managing Director<br />
                                            VTAB Square Pvt Ltd (Now Part of Siroco)
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
                                        <div className="bg-[#D14343] text-white text-center py-2 text-xl font-bold uppercase tracking-widest">USA</div>
                                        <div className="p-8 flex justify-between bg-slate-50 text-[13px] leading-relaxed">
                                            <div>
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wide">SIROCo Corporate Office</p>
                                                <p className="text-slate-700 font-bold">6800 Weiskopf Avenue,<br />Suite 150 McKinney,<br />TX 75070 USA</p>
                                                <p className="mt-4"><span className="font-bold text-black">Phone:</span> <span className="text-black">(844) 708-0008</span></p>
                                                <p><span className="font-bold text-black">Email:</span> <span className="text-black">sales@sirocollc.com</span></p>
                                            </div>
                                            <div className="pl-8">
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
                                        <div className="bg-[#EFA740] text-white text-center py-2 text-xl font-bold uppercase tracking-widest">India</div>
                                        <div className="p-8 flex justify-between bg-slate-50 text-[13px] leading-relaxed">
                                            <div className="flex-1 pr-6 border-r border-slate-200">
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wide">Development Innovation Center</p>
                                                <p className="text-slate-700 font-bold">Module 12, Thejaswini Building,<br />Technopark, Karyavattom – 695581<br />Kerala, INDIA</p>
                                                <p className="mt-4"><span className="font-bold text-black">Phone:</span> <span className="text-black">+91 80868 00199</span></p>
                                                <p><span className="font-bold text-black">Email:</span> <span className="text-black">info@sirocotech.com</span></p>
                                            </div>
                                            <div className="flex-1 pl-6">
                                                <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wide">IT DEVELOPMENT CENTER</p>
                                                <p className="text-slate-700 font-bold leading-snug">17/99, 5th street 2nd Floor, lyyappa Nagar,<br />Vijayalakshmi Mills, Kuniyamuthur, Palakkad<br />Main Road, Coimbatore 641008, Tamil Nadu, India</p>
                                                <p className="mt-4"><span className="font-bold text-black">Mail id:</span> <span className="text-black">Information@vtabsquare.com</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MENA */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <div className="bg-[#3FA15A] text-white text-center py-2 text-xl font-bold uppercase tracking-widest">MENA</div>
                                        <div className="p-8 bg-slate-50 text-[13px] leading-relaxed">
                                            <p className="font-bold text-[#0A2458] mb-2 uppercase tracking-wide">Regional Office</p>
                                            <p className="text-slate-700 font-bold">Amman Jordan</p>
                                            <p className="mt-4"><span className="font-bold text-black">Phone:</span> <span className="text-black">+962 65737421</span></p>
                                            <p><span className="font-bold text-black">Email:</span> <span className="text-black">sales@sirocomena.com</span></p>
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

            {/* Email Modal */}
            {
                showMailModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-300">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20 transform animate-in zoom-in-95 duration-300">
                            <div className="bg-indigo-600 px-8 py-6 text-white relative">
                                <button onClick={() => setShowMailModal(false)} className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors p-1">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                                    <Mail className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-xl font-bold">Send Notification</h2>
                                <p className="text-indigo-100/80 text-sm mt-1">To: {formData.employeeName || 'Employee'}</p>
                            </div>

                            <form onSubmit={handleSendMail} className="p-8 space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Recipient Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-slate-900 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all"
                                        placeholder="employee@example.com"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                    />
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
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            <span>Send Official Email</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default SalaryHikeEditor;


