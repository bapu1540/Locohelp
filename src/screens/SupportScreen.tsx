import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, Mail, ChevronDown, ChevronUp, Copy, Check, ExternalLink, LifeBuoy, ShieldCheck, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function SupportScreen({ onBack }: { onBack: () => void }) {
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0); // First open by default

  const businessEmail = 'support@locohelp.com';

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(businessEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {}
  };

  const handleSendEmail = () => {
    window.location.href = `mailto:${businessEmail}?subject=LocoHelp%20Support%20Request&body=Namaste%20LocoHelp%20Support%20Team%2C%0A%0AMy%20query%20is%3A%0A`;
  };

  const faqs = [
    {
      q: language === 'EN' ? "What is LocoHelp and how does it work?" : "LocoHelp क्या है और यह कैसे काम करता है?",
      a: language === 'EN' 
        ? "LocoHelp is a 100% free community network connecting neighbors with verified local helpers, plumbers, electricians, mechanics, and job opportunities without middleman commissions."
        : "LocoHelp एक 100% मुफ्त पड़ोस नेटवर्क है जो आपको बिना किसी कमीशन या बिचौलियों के सीधे लोकल हेल्पर्स (प्लंबर, इलेक्ट्रीशियन, मैकेनिक आदि) और पड़ोसियों से जोड़ता है।"
    },
    {
      q: language === 'EN' ? "How do I post a Broadcast requirement?" : "ब्रॉडकास्ट रिक्वायरमेंट कैसे पोस्ट करें?",
      a: language === 'EN'
        ? "Tap the '+' Broadcast button on the home screen, speak or type your requirement, select tags, and tap Broadcast. All nearby helpers and neighbors receive it live."
        : "होम स्क्रीन पर नीचे '+' ब्रॉडकास्ट बटन दबाएं, बोलकर या लिखकर अपनी जरूरत बताएं, और ब्रॉडकास्ट कर दें। आपके एरिया के सभी हेल्पर्स को तुरंत अलर्ट मिल जाएगा।"
    },
    {
      q: language === 'EN' ? "Are there any hidden charges or commission?" : "क्या कोई शुल्क या कमीशन लिया जाता है?",
      a: language === 'EN'
        ? "No! LocoHelp is completely zero-commission. Direct peer-to-peer chats and calls happen freely between users and providers."
        : "बिल्कुल नहीं! LocoHelp शून्य कमीशन और पूर्णतः फ्री प्लेटफॉर्म है। आप सीधे हेल्पर या कस्टमर से बिना किसी शुल्क के बात कर सकते हैं।"
    },
    {
      q: language === 'EN' ? "Is my personal data safe?" : "क्या मेरी व्यक्तिगत जानकारी सुरक्षित है?",
      a: language === 'EN'
        ? "Yes. We use Google Cloud Firestore security with strict role permissions. Your exact location is never publicly exposed."
        : "हाँ, आपका डेटा गूगल फायरस्टोर एन्क्रिप्शन से सुरक्षित है। आपकी लाइव लोकेशन कभी भी किसी को बिना अनुमति नहीं दिखाई जाती।"
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#F4F1EA] dark:bg-slate-900 transition-colors">
      {/* Header */}
      <div className="flex items-center px-4 py-4 pt-10 sm:pt-4 border-b border-[#DFDBCF] dark:border-slate-800 sticky top-0 bg-[#FCFAF5]/90 dark:bg-slate-850/90 backdrop-blur-xl shadow-xs z-10">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 mr-2 hover:bg-[#EAE6DC] dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
        </button>
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
            {language === 'EN' ? 'Help & Support' : 'सहायता और संपर्क'}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            LocoHelp Official Support Center
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Support Top Hero Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-6 -right-6 opacity-10 pointer-events-none">
            <LifeBuoy className="w-36 h-36" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider">
              24×7 Helpdesk
            </span>
            <span className="text-amber-300 text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Official Help
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black mb-1">
            {language === 'EN' ? 'How can we help you today?' : 'हम आपकी किस प्रकार सहायता कर सकते हैं?'}
          </h3>
          <p className="text-indigo-100 text-xs font-medium max-w-sm">
            {language === 'EN'
              ? 'Find quick answers in FAQs below or send an inquiry to our dedicated business support email.'
              : 'नीचे अक्सर पूछे जाने वाले सवालों के उत्तर देखें या सीधे हमारे ऑफिशियल ईमेल पर संपर्क करें।'}
          </p>
        </div>

        {/* ========================================================= */}
        {/* BANNER 1: OFFICIAL BUSINESS EMAIL SUPPORT (ACTIVE)        */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/40">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {language === 'EN' ? 'Official Email Support' : 'ऑफिशियल ईमेल सहायता'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'EN' ? 'Verified Business Helpdesk' : 'सत्यापित बिजनेस सहायता केंद्र'}
                </p>
              </div>
            </div>

            <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Active
            </span>
          </div>

          {/* Email Address Highlight Box */}
          <div className="bg-indigo-50/70 dark:bg-slate-900/70 border border-indigo-100 dark:border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <a 
                href={`mailto:${businessEmail}`} 
                className="font-black text-sm text-indigo-700 dark:text-indigo-300 hover:underline truncate"
              >
                {businessEmail}
              </a>
            </div>

            <button
              onClick={handleCopyEmail}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
              title="Copy Email"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 text-[11px]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={handleSendEmail}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Mail className="w-4 h-4" />
            <span>{language === 'EN' ? 'Write to support@locohelp.com' : 'ईमेल भेजें (support@locohelp.com)'}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </button>

          <p className="text-[11px] text-center text-slate-400 font-medium">
            {language === 'EN' ? '⚡ Typical response time within 24 hours' : '⚡ सामान्यतः 24 घंटे के भीतर प्रतिक्रिया'}
          </p>
        </div>

        {/* ========================================================= */}
        {/* BANNER 2: FREQUENTLY ASKED QUESTIONS (FAQS)               */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-800 border border-[#DFDBCF] dark:border-slate-700 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-900/40">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {language === 'EN' ? 'Frequently Asked Questions (FAQs)' : 'अक्सर पूछे जाने वाले सवाल (FAQs)'}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'EN' ? 'Instant solutions to common queries' : 'सामान्य प्रश्नों के त्वरित समाधान'}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div 
                  key={idx}
                  className="border border-slate-200 dark:border-slate-700/70 rounded-2xl overflow-hidden transition-all bg-[#FCFAF5] dark:bg-slate-850"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-3.5 text-left flex items-center justify-between gap-2 hover:bg-slate-100/60 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {faq.q}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed border-t border-slate-100 dark:border-slate-700/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Safety & Trust Note */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-medium text-[11px]">
            {language === 'EN'
              ? 'LocoHelp will never ask for your bank passwords or OTPs via email.'
              : 'LocoHelp कभी भी ईमेल पर आपका बैंक पासवर्ड या OTP नहीं मांगता।'}
          </span>
        </div>
      </div>
    </div>
  );
}
