import React, { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { Download, Mail, Send, X, Loader2, Calendar, User, Clock, DollarSign } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const PolicyAgreement = () => {
    const [formData, setFormData] = useState({
        candidateName: '',
        stipend: '',
        probationSalary: '',
        postProbationSalary: '',
        workStartTime: '',
        workEndTime: '',
        date: new Date().toISOString().split('T')[0],
        internshipMonths: 6,
        trainingMonths: 2,
        probationMonths: 4,
        postProbationMonths: 2,
        employeeType: 'Internship'
    });
    const [showMailModal, setShowMailModal] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [mailStatus, setMailStatus] = useState({ type: '', message: '' });
    const [coverLetter, setCoverLetter] = useState('');

    const previewRef = useRef();

    // Sync Cover Letter with Form Data
    useEffect(() => {
        const formattedDate = formData.date
            ? formData.date.split('-').reverse().join('-')
            : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        setCoverLetter(`Dear ${formData.candidateName || 'Candidate'},

Greetings from VTAB Square Pvt Ltd.

As part of your onboarding process, please find attached the Policy Agreement document outlining the internship structure, training period, probation terms, working hours, leave policy, salary structure, and resignation policy applicable to your role.

We request you to carefully review the attached document and confirm your acceptance of the policies mentioned.

Kindly complete the following steps to proceed with the onboarding process:

• Reply to this email with your confirmation
• Attach a recent passport-sized photograph
• Share a copy of your ID proof along with the signed agreement
• Provide your educational certificates

Please feel free to contact the HR team if you have any questions or require further clarification.

We look forward to your successful journey with VTAB Square Pvt Ltd.

Best regards,
Vimala C.
Managing Director
Authorized Signatory
VTAB Square Pvt Ltd (Now Part of Siroco)
`);
    }, [formData.candidateName, formData.date]);

    const validateForm = () => {
        const required = [
            'candidateName', 'stipend', 'probationSalary', 'postProbationSalary',
            'workStartTime', 'workEndTime', 'trainingMonths',
            'probationMonths', 'postProbationMonths'
        ];
        if (formData.employeeType === 'Internship') {
            required.push('internshipMonths');
        }

        const missing = required.filter(f => !formData[f]);
        if (missing.length > 0) {
            alert('Please fill in all mandatory fields before proceeding.');
            return false;
        }

        const alphaOnly = /^[a-zA-Z\s.,''()-]+$/;
        const numericOnly = /^\d+(\.\d+)?$/;

        if (!alphaOnly.test(formData.candidateName)) {
            alert('Candidate Name must contain alphabets only.');
            return false;
        }
        if (formData.employeeType === 'Internship' && !numericOnly.test(formData.internshipMonths)) {
            alert('Internship months must be a number.');
            return false;
        }
        if (!numericOnly.test(formData.stipend)) {
            alert('Training (Stipend) must be a number.');
            return false;
        }
        if (!numericOnly.test(formData.probationSalary)) {
            alert('Probation (Salary) must be a number.');
            return false;
        }
        if (!numericOnly.test(formData.postProbationSalary)) {
            alert('Post-Probation (Salary) must be a number.');
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
            pdf.save(`Policy_Agreement_Letter_${formData.candidateName || 'Candidate'}.pdf`);
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
                candidateName: formData.candidateName || 'Candidate',
                customSubject: `Policy Agreement - ${formData.candidateName || 'Candidate'}`,
                customFileName: `Policy_Agreement_Letter_${formData.candidateName || 'Candidate'}.pdf`,
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
                    <h1 className="text-base md:text-lg font-bold text-slate-900 leading-none">Policy Agreement Editor</h1>
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

            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Editor Panel */}
                <div className="w-full lg:w-[400px] bg-white border-b lg:border-b-0 lg:border-r border-slate-100 overflow-y-auto p-5 md:p-8 custom-scrollbar shadow-sm z-40 flex-shrink-0">
                    <div className="space-y-10">
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <User className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Candidate Details</h3>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className={labelClass}>Candidate Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. Sanjay S"
                                        value={formData.candidateName}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const filteredValue = value.replace(/[^a-zA-Z\s.,''()-]/g, '');
                                            setFormData({ ...formData, candidateName: filteredValue });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Employee Type <span className="text-red-500">*</span></label>
                                    <div className="flex gap-4 mt-2">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="radio"
                                                name="employeeType"
                                                value="Internship"
                                                checked={formData.employeeType === 'Internship'}
                                                onChange={(e) => setFormData({ ...formData, employeeType: e.target.value, internshipMonths: 6 })}
                                                className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-700 font-medium group-hover:text-indigo-600 transition-colors">Internship</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="radio"
                                                name="employeeType"
                                                value="FTE"
                                                checked={formData.employeeType === 'FTE'}
                                                onChange={(e) => setFormData({ ...formData, employeeType: e.target.value, internshipMonths: 'Not Applicable' })}
                                                className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-700 font-medium group-hover:text-indigo-600 transition-colors">FTE (Full Time Employee)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <DollarSign className="w-4 h-4 text-emerald-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Salary Structure</h3>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className={labelClass}>Training (Stipend) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        className={inputClass}
                                        placeholder="e.g. 7000"
                                        value={formData.stipend}
                                        onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Probation (Salary) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        className={inputClass}
                                        placeholder="e.g. 13500"
                                        value={formData.probationSalary}
                                        onChange={(e) => setFormData({ ...formData, probationSalary: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Post-Probation (Salary) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        className={inputClass}
                                        placeholder="e.g. 15000"
                                        value={formData.postProbationSalary}
                                        onChange={(e) => setFormData({ ...formData, postProbationSalary: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-amber-50 rounded-lg">
                                    <Clock className="w-4 h-4 text-amber-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Working Hours</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Start Time <span className="text-red-500">*</span></label>
                                    <input
                                        type="time"
                                        className={inputClass}
                                        value={formData.workStartTime}
                                        onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>End Time <span className="text-red-500">*</span></label>
                                    <input
                                        type="time"
                                        className={inputClass}
                                        value={formData.workEndTime}
                                        onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-50 rounded-lg">
                                    <Clock className="w-4 h-4 text-purple-600" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-base">Policy Periods (Months)</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Internship <span className="text-red-500">*</span></label>
                                    <input
                                        type={formData.employeeType === 'FTE' ? "text" : "number"}
                                        className={`${inputClass} ${formData.employeeType === 'FTE' ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                                        value={formData.internshipMonths}
                                        disabled={formData.employeeType === 'FTE'}
                                        onChange={(e) => setFormData({ ...formData, internshipMonths: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Training <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={formData.trainingMonths}
                                        onChange={(e) => setFormData({ ...formData, trainingMonths: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Probation <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={formData.probationMonths}
                                        onChange={(e) => setFormData({ ...formData, probationMonths: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Post-Probation <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={formData.postProbationMonths}
                                        onChange={(e) => setFormData({ ...formData, postProbationMonths: e.target.value })}
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

                {/* Preview Pane */}
                <div className="flex-1 bg-slate-200 overflow-y-auto overflow-x-hidden p-4 md:p-12 flex justify-center custom-scrollbar">
                    <div className="origin-top scale-[0.4] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.6] xl:scale-[0.85] 2xl:scale-100 mb-20 transition-transform duration-300">
                        <div ref={previewRef} className="w-[210mm] bg-white shadow-2xl">
                            {/* PAGE 1: COVER */}
                            <div className="h-[297mm] bg-[#0A2458] text-white flex flex-col relative overflow-hidden">
                                <div className="p-12 flex justify-between">
                                    <div className="text-[10px] leading-relaxed font-light">
                                        www.sirocotech.com<br />
                                        sales@sirocollc.com<br />
                                        US: (844) 708-0008<br />
                                        IND: (996) 258-7975
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="mb-2 bg-white p-2 w-18 h-18 flex items-center justify-center">
                                            <img src="/vtab.jpg" alt="VTAB" className="w-10 h-10 object-contain" />
                                        </div>
                                        <div className="text-[10px] font-bold tracking-widest uppercase text-white opacity-80 mb-2">Now part of</div>
                                        <img src="/siroco.jpeg" alt="SIROCO" className="h-8 object-contain" />
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col items-center justify-center text-center px-12 text-white">
                                    <div className="text-2xl font-medium mb-6 uppercase tracking-[0.2em] opacity-90 text-[14px]">Prepared for</div>
                                    <div className="w-64 h-[1px] bg-white/20 mb-8" />
                                    <div className="text-xl font-light tracking-[0.15em] uppercase leading-relaxed text-[16px]">
                                        Policy Agreement Document
                                    </div>
                                </div>
                                <div className="bg-white pt-10 px-12 pb-12 mt-auto">
                                    <h4 className="text-[#0A2458] font-bold text-xs mb-1 text-center italic">Statement of Confidentiality</h4>
                                    <p className="text-[10px] leading-relaxed text-slate-800 text-center font-medium opacity-80">
                                        This proposal has been distributed on a confidential basis for your information only. By accepting it, you agree not to disseminate it to any other person or entity in any manner and not to use the information for any purpose other than considering opportunities for a cooperative business relationship with the owner of this portfolio.
                                    </p>
                                </div>
                            </div>

                            {/* PAGE 2: TERMS */}
                            <div className="h-[297mm] bg-white text-gray-900 flex flex-col relative">
                                <div className="bg-[#0A2458] px-12 py-6 flex justify-between items-start text-white">
                                    <div className="text-[10px] leading-relaxed font-light">
                                        www.sirocotech.com<br />
                                        sales@sirocotech.com<br />
                                        US: (844) 708-0008<br />
                                        IND: (996) 258-7975
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="mb-2 bg-white p-2 w-14 h-14 flex items-center justify-center">
                                            <img src="/vtab.jpg" alt="VTAB" className="w-10 h-10 object-contain" />
                                        </div>
                                        <div className="text-[9px] font-bold tracking-widest uppercase">NOW PART OF</div>
                                        <img src="/siroco.jpeg" alt="SIROCO" className="h-7 object-contain" />
                                    </div>
                                </div>

                                <div className="px-16 py-10 flex-1">
                                    <h2 className="text-center font-bold text-lg mb-10 text-gray-900">Policy Agreement Document</h2>

                                    <div className="flex justify-end mb-6">
                                        <div style={{ width: '80px', height: '90px', border: '1px solid #999' }} className="flex items-end justify-center pb-1">
                                            <span style={{ fontSize: '9px', color: '#999' }}>Photo</span>
                                        </div>
                                    </div>

                                    <p className="font-semibold text-sm mb-8 uppercase">Dear {formData.candidateName || 'SANJAY S'},</p>

                                    <div className="space-y-4 text-[11px] leading-relaxed">
                                        <div className="flex gap-4">
                                            <span className="font-bold min-w-[20px]">1.</span>
                                            <p><span className="font-bold">Internship Period:</span> Upon acceptance of the offer, the initial ({formData.internshipMonths}) months shall constitute an paid internship Successful completion will get 30 Thousand Rupees</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-bold min-w-[20px]">2.</span>
                                            <p><span className="font-bold">Training Period:</span> Upon successful completion of the internship, you will enter a ({formData.trainingMonths})-months training phase with a stipend of {formData.stipend}.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-bold min-w-[20px]">3.</span>
                                            <p><span className="font-bold">Probation Period:</span> After the training, you will proceed to a ({formData.probationMonths})-months' probation period with a salary of {formData.probationSalary}.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-bold min-w-[20px]">4.</span>
                                            <p><span className="font-bold">Post-Probation Period:</span> Upon successfully completing probation, your salary will increase to {formData.postProbationSalary} for the following {formData.postProbationMonths} months.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-bold min-w-[20px]">5.</span>
                                            <p><span className="font-bold">Performance-Based Hike:</span> After completing one year with the organization, a salary hike will be decided based on your performance.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-bold min-w-[20px]">6.</span>
                                            <p><span className="font-bold">Working Hours and Location:</span> Initially, your working hours will be from <span className="font-bold">{formData.workStartTime}</span> to <span className="font-bold">{formData.workEndTime}</span>, and it will be a work-from-home setup; however, you may need to work from the office if required. Any changes will be communicated in advance.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-bold min-w-[20px]">7.</span>
                                            <p><span className="font-bold">Work and Leave Policy:</span> You are required to work on all Saturdays and will not be eligible for any paid leave until confirmation of your probation period. Leaves availed will be considered as LOP and 90 days internship will get extended.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-bold min-w-[20px]">8.</span>
                                            <p><span className="font-bold">Salary:</span> Salary will be credited to your preferred bank account 15th of every month.</p>
                                        </div>
                                    </div>

                                    <div className="mt-8 border-t border-slate-200 pt-6">
                                        <h3 className="font-bold text-sm mb-4">Intern Resignation Policy</h3>
                                        <p className="font-bold text-[11px] mb-4">Early Resignation (before 11 months):</p>
                                        <ul className="list-disc ml-8 text-[11px] space-y-2">
                                            <li>The intern must pay a penalty of 3 months' last drawn salary.</li>
                                            <li>The intern must serve a 90-day (3 months) notice period.</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="bg-[#0A2458] p-4 flex justify-between items-center text-white">
                                    <img src="/siroco.jpeg" alt="SIROCO" className="h-6 object-contain" />
                                    <span className="font-bold">2</span>
                                </div>
                            </div>

                            {/* PAGE 3: POLICY CONTD */}
                            <div className="h-[297mm] bg-white text-gray-900 flex flex-col relative">
                                <div className="bg-[#0A2458] px-12 py-6 flex justify-between items-start text-white">
                                    <div className="text-[10px] leading-relaxed font-light">
                                        www.sirocotech.com<br />
                                        sales@sirocotech.com<br />
                                        US: (844) 708-0008<br />
                                        IND: (996) 258-7975
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="mb-2 bg-white rounded p-2 w-14 h-14 flex items-center justify-center">
                                            <img src="/vtab.jpg" alt="VTAB" className="w-10 h-10 object-contain" />
                                        </div>
                                        <div className="text-[9px] font-bold tracking-widest uppercase">NOW PART OF</div>
                                        <img src="/siroco.jpeg" alt="SIROCO" className="h-7 object-contain" />
                                    </div>
                                </div>

                                <div className="px-16 py-10 flex-1">
                                    <h2 className="text-center font-bold text-lg mb-10 text-gray-900">Intern Resignation Policy (contd.)</h2>

                                    <div className="space-y-6 text-[11px] leading-relaxed">
                                        <div>
                                            <p className="font-bold mb-4">Failure to Serve Notice Period:</p>
                                            <ul className="list-disc ml-8 space-y-2">
                                                <li>If the intern does not serve the full 90-day notice period, they must instead pay a penalty of 5 months' last drawn salary.</li>
                                                <li>Immediate relieving will be granted after payment.</li>
                                            </ul>
                                        </div>

                                        <div>
                                            <p className="font-bold mb-4">Example Cases</p>
                                            <ul className="list-disc ml-8 space-y-2">
                                                <li>Intern resigns after 12 months: → Eligible, no penalty, standard resignation process.</li>
                                                <li>Intern resigns after 8 months, serves 90-day notice: → Must pay 3 months' salary penalty, serve 90 days, then relieved.</li>
                                                <li>Intern resigns after 8 months, refuses 90-day notice: → Must pay 5 months' salary penalty, then relieved immediately.</li>
                                            </ul>
                                        </div>

                                        <p className="mt-8">Progression to each subsequent stage is contingent upon your performance. Please find the attachment for more details. As part of the onboarding process, please:</p>

                                        <ul className="list-disc ml-8 space-y-2">
                                            <li>Reply with your confirmation.</li>
                                            <li>Attach a recent passport-sized photograph.</li>
                                            <li>Send a copy of your ID proof and signed agreement.</li>
                                            <li>Provide your educational certificates.</li>
                                        </ul>

                                        <div className="w-52 border-b border-slate-300 mt-2 mb-2"></div>
                                        Authorized Signatory<br />
                                        Vimala C.<br />
                                        Managing Director<br />
                                        VTAB Square Pvt Ltd (Now Part of Siroco)
                                    </div>
                                </div>

                                <div className="bg-[#0A2458] p-4 flex justify-between items-center text-white">
                                    <img src="/siroco.jpeg" alt="SIROCO" className="h-6 object-contain" />
                                    <span className="font-bold">3</span>
                                </div>
                            </div>

                            {/* PAGE 4: CONTACT */}
                            <div className="h-[297mm] bg-white text-gray-900 flex flex-col relative">
                                <div className="px-16 pt-16 flex-1">
                                    <h2 className="font-bold text-xl mb-12 text-gray-900">Contact Us</h2>

                                    <div className="space-y-8">
                                        {/* USA */}
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-red-600 text-white text-center py-2 text-xs font-bold uppercase tracking-widest">USA</div>
                                            <div className="p-8 grid grid-cols-2 gap-8">
                                                <div className="text-[10px] space-y-4">
                                                    <p className="font-bold font-bold uppercase tracking-wider">Corporate Office</p>
                                                    <p>6800 Weiskopf Avenue,<br />Suite 150 McKinney,<br />TX 75070 USA</p>
                                                    <p className="font-medium">Phone: (844) 708-0008</p>
                                                    <p className="font-medium">Email: sales@sirocollc.com</p>
                                                </div>
                                                <div className="text-[10px] space-y-2">
                                                    <p className="font-bold font-bold uppercase tracking-wider">Regional Offices</p>
                                                    <p>Atlanta</p>
                                                    <p>Houston</p>
                                                    <p>Jacksonville</p>
                                                    <p>San Diego</p>
                                                    <p>Orland Park</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* INDIA */}
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-amber-500 text-white text-center py-2 text-xs font-bold uppercase tracking-widest">India</div>
                                            <div className="p-8 grid grid-cols-2 gap-8">
                                                <div className="text-[10px] space-y-4">
                                                    <p className="font-bold font-bold uppercase tracking-wider">Development Innovation Center</p>
                                                    <p>Module 12, Thejaswini Building,<br />Technopark, Kovalam – 695581<br />Kerala, INDIA</p>
                                                    <p className="font-medium">Phone: +91 80868 00199</p>
                                                    <p className="font-medium">Email: info@sirocotech.com</p>
                                                </div>
                                                <div className="text-[10px] space-y-4">
                                                    <p className="font-bold font-bold uppercase tracking-wider">IT Development Center</p>
                                                    <p>17/99, 5th Street 2nd Floor, Iyappan Nagar,<br />Vijayalakshmi Mills, Kuniamuthur, Palakkad<br />Main Road, Coimbatore 641008, Tamil<br />Nadu, India</p>
                                                    <p className="font-medium">Mail id: information@vtabsquare.com</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* MENA */}
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-emerald-600 text-white text-center py-2 text-xs font-bold uppercase tracking-widest">MENA</div>
                                            <div className="p-8">
                                                <div className="text-[10px] space-y-4 max-w-xs">
                                                    <p className="font-bold font-bold uppercase tracking-wider">Regional Office</p>
                                                    <p>Amman, Jordan</p>
                                                    <p className="font-medium">Phone: +962 65373421</p>
                                                    <p className="font-medium">Email: sales@sirocomena.com</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0A2458] p-4 flex justify-between items-center text-white mt-12">
                                    <img src="/siroco.jpeg" alt="SIROCO" className="h-6 object-contain" />
                                    <span className="font-bold">4</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
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
                            <h2 className="text-xl font-bold">Send Policy Agreement</h2>
                            <p className="text-indigo-100/80 text-sm mt-1">To: {formData.candidateName || 'Candidate'}</p>
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

export default PolicyAgreement;





