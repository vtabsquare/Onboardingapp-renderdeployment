import React, { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { Download, LogOut, ChevronRight, MapPin, Building2, User, Calendar, Briefcase, Mail, Send, X, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const RelievingExperienceEditor = () => {
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
    const [coverLetter, setCoverLetter] = useState(`Dear Mr. ${formData.toName || 'Employee'},

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

    const previewRef = useRef();

    // Sync Cover Letter with To Name and Role
    useEffect(() => {
        setCoverLetter(`Dear Mr. ${formData.toName || 'Employee'},

Greetings from VTAB Square Pvt Ltd.

Please find attached your Experience Letter and Relieving Letter issued by VTAB Square Pvt Ltd.

This letter confirms that your resignation has been accepted and that you have been relieved from your duties with the organization as per the effective date mentioned in the attached document. It also certifies your employment with the company in the role of ${formData.businessTitle || formData.jobTitle || 'Data Analyst'} during your tenure.

We sincerely appreciate your contributions during your time with the organization and thank you for your efforts and dedication.
We wish you continued success in your future endeavors.
If you require any additional documentation or assistance, please feel free to contact us.

Best Regards,
Brindha
Director – IT & HR
Authorized Signatory
VTAB Square Pvt Ltd
(Now Part of Siroco)`);
    }, [formData.toName, formData.businessTitle, formData.jobTitle]);

    const validateForm = () => {
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const joinedDate = new Date(formData.fromDate);
        const relDate = new Date(formData.relievingDate);

        if (joinedDate < today) {
            alert('Joined Date cannot be in the past. Please select today or a future date.');
            return false;
        }

        if (relDate <= today) {
            alert('Relieving Date must be a future date (cannot be today or in the past).');
            return false;
        }

        return true;
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

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
            pdf.save(`Relieving_&_Experience_Letter_${formData.toName || 'Employee'}.pdf`);
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
                candidateName: formData.toName || 'Employee',
                customSubject: `Relieving & Experience Letter – ${formData.toName || 'Employee'}`,
                customFileName: `Relieving_&_Experience_Letter_${formData.toName || 'Employee'}.pdf`,
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
            const data = error.response?.data;
            const errMsg = data?.message || error.message || 'Failed to send email';
            const details = data?.details ? ` (${data.message})` : '';
            setMailStatus({ type: 'error', message: errMsg + details });
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
                    <h1 className="text-base md:text-lg font-bold text-slate-900 leading-none">Relieving & Experience Editor</h1>
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
                                        placeholder="e.g. Syed"
                                        value={formData.toName}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
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
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
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
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, businessTitle: filteredValue });
                                        }}
                                    />
                                </div>
                            </div>
                        </section>

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
                                        min={todayStr}
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
                                        min={todayStr}
                                        onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Relieving Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        min={tomorrowStr}
                                        value={formData.relievingDate}
                                        onChange={(e) => setFormData({ ...formData, relievingDate: e.target.value })}
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
                                        className={`${inputClass} min-h-[300px] resize-none text-[13px] leading-relaxed font-serif`}
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

                {/* Preview Pane */}
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
                                        Relieving letter &<br />Experience Letter
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
                                        <div className="text-white text-[7px] font-bold tracking-widest uppercase mb-1">NOW PART OF</div>
                                        <img src="/siroco.jpeg" alt="SIROCO" className="h-8 object-contain" />
                                    </div>
                                </div>

                                <div className="flex-1 px-16 pt-12 pb-12 text-black font-sans leading-relaxed">
                                    <h2 className="text-3xl font-bold mb-10 text-center text-black">Experience Letter</h2>

                                    <div className="mb-6">
                                        <p className="font-bold text-lg">Dear Mr.{formData.toName || '[Name]'},</p>
                                        <p className="text-lg">Employee ID: {formData.employeeId || '[ID]'}</p>
                                    </div>

                                    <div className="text-right mb-12 mr-6 font-bold text-lg">
                                        {formData.date}
                                    </div>

                                    <div className="text-[15px] space-y-6">
                                        <p>
                                            This is to inform you that your letter of resignation has been accepted and you are relieved from the services of <strong>VTAB Square Private Limited</strong>.
                                        </p>
                                        <p>
                                            This is also to certify that you had worked with the company from <strong>{formData.fromDate || '[From Date]'}</strong>, and Job Title at the time of relieving is <strong>{formData.jobTitle || '[Job Title]'}</strong> and your business title <strong>"{formData.businessTitle || '[Business Title]'}"</strong>. and last day of working with as is <strong>{formData.relievingDate || '[Relieving Date]'}</strong>.
                                        </p>
                                        <p>
                                            We wish you all the very best in your future endeavors.
                                        </p>
                                    </div>

                                    <div className="mt-16">
                                        <p className="font-bold text-lg">Your Faithfully,</p>
                                        <div className="my-4">
                                            <img src="/sign.jpeg" alt="Sign" className="h-16 w-auto object-contain" />
                                        </div>
                                        <div className="text-[14px] leading-tight font-bold">
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
                                        <div className="bg-[#D14343] text-white text-center py-2 text-xl font-bold uppercase tracking-widest">USA</div>
                                        <div className="p-8 flex justify-between bg-slate-50 text-[13px] leading-relaxed">
                                            <div>
                                                <p className="font-bold text-[#0A2458] mb-2">SIROCo Corporate Office</p>
                                                <p>6800 Weiskopf Avenue,<br />Suite 150 McKinney,<br />TX 75070 USA</p>
                                                <p className="mt-2">Phone: (844) 708-0008</p>
                                                <p>Email: sales@sirocollc.com</p>
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#0A2458] mb-2">Regional Offices</p>
                                                <p>Atlanta</p>
                                                <p>Houston</p>
                                                <p>Jacksonville</p>
                                                <p>San Diego</p>
                                                <p>Orland Park</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* India */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <div className="bg-[#EFA740] text-white text-center py-2 text-xl font-bold uppercase tracking-widest">India</div>
                                        <div className="p-8 flex justify-between bg-slate-50 text-[13px] leading-relaxed">
                                            <div>
                                                <p className="font-bold text-[#0A2458] mb-2">Development Innovation Center</p>
                                                <p>Module 12, Thejaswini Building,<br />Technopark, Karyavattom – 695581<br />Kerala, INDIA Phone:<br />+91 80868 00199</p>
                                                <p className="mt-2">Email: info@sirocotech.com</p>
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#0A2458] mb-2">IT DEVELOPMENT CENTER</p>
                                                <p>17/99, 5th street 2nd Floor, lyyappa Nagar<br />Vijayalakshmi Mills, Kuniyamuthur, Palakkad<br />Main Road, Coimbatore 641008, Tamil Nadu,<br />India</p>
                                                <p className="mt-2">Mail id: Information@vtabsquare.com</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MENA */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <div className="bg-[#3FA15A] text-white text-center py-2 text-xl font-bold uppercase tracking-widest">MENA</div>
                                        <div className="p-8 bg-slate-50 text-[13px] leading-relaxed">
                                            <p className="font-bold text-[#0A2458] mb-2">Regional Office</p>
                                            <p>Amman Jordan</p>
                                            <p>Phone: +962 65737421</p>
                                            <p>Email: sales@sirocomena.com</p>
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

            {showMailModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden border border-white/20">
                        <div className="bg-indigo-600 px-8 py-6 text-white relative">
                            <button onClick={() => setShowMailModal(false)} className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-bold">Send Letter</h2>
                            <p className="text-indigo-100 text-sm mt-1">To: {formData.toName || 'Employee'}</p>
                        </div>

                        <form onSubmit={handleSendMail} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all"
                                    placeholder="employee@example.com"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                />
                            </div>

                            {/* Message Preview - Commented out as requested
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Message Preview</label>
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-[13px] text-slate-600 leading-relaxed font-serif whitespace-pre-wrap max-h-[250px] overflow-y-auto custom-scrollbar">
                                    {coverLetter}
                                </div>
                            </div>
                            */}

                            {mailStatus.message && (
                                <div className={`p-4 rounded-2xl text-sm font-semibold ${mailStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    {mailStatus.message}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSending}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all"
                            >
                                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                                <span>{isSending ? 'Sending...' : 'Send Letter'}</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RelievingExperienceEditor;


