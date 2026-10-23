import React from 'react';
import { useLanguage } from '../i18n';

export default function RedWarningTicker() {
  const { language } = useLanguage();

  const tickerText =
    language === 'GU'
      ? '🚨 મહત્વપૂર્ણ સૂચના: LocoHelp માત્ર જન-સહાય અને સ્થાનિક માહિતી જોડવાનું એક નિઃશુલ્ક માધ્યમ છે. અમે કોઈપણ કામ, સર્વિસ કે નોકરી માટે કોઈની પાસેથી સીધા પૈસા કે કમિશન લેતા નથી—કૃપા કરીને કોઈપણ વ્યક્તિ સાથે કામ કે પૈસાની લેવડ-દેવડ કરતા પહેલા જાતે તેની પૂરી તપાસ (Verify) કરી લો.   •   ⚠️ કડક કાયદેસરની ચેતવણી: આ પ્લેટફોર્મના નિયમોનું ઉલ્લંઘન કરવા, ખોટી માહિતી આપવા અથવા કોઈપણ પ્રકારનો ગેરકાયદેસર/ખોટો ઉપયોગ કરવા પર તરત જ કડક કાયદેસરની કાર્યવાહી કરવામાં આવશે.'
      : language === 'EN'
      ? '🚨 OFFICIAL NOTICE: LocoHelp is strictly a free community help platform and does not charge any direct money or commission—please verify individuals yourself before any work or financial dealing at your own responsibility.   •   ⚠️ STRICT LEGAL WARNING: Any misuse of this platform, false information, or violation of community guidelines will result in immediate and strict legal action.'
      : '🚨 महत्वपूर्ण सूचना: LocoHelp केवल जन-सहायता और स्थानीय जानकारी जोड़ने का एक निःशुल्क माध्यम है। हम किसी भी काम, सर्विस या नौकरी के लिए किसी से सीधे कोई पैसा या कमीशन नहीं लेते हैं—कृपया किसी भी व्यक्ति के साथ काम या पैसों का लेन-देन करने से पहले स्वयं उसकी पूरी जांच-पड़ताल (Verify) कर लें।   •   ⚠️ सख्त कानूनी चेतावनी: इस प्लेटफॉर्म के नियमों का उल्लंघन करने, गलत जानकारी देने या किसी भी प्रकार का अनुचित/फर्जी उपयोग करने पर तुरंत सख्त कानूनी कार्यवाही की जाएगी।';

  const badgeLabel =
    language === 'GU'
      ? '🚨 ચેતવણી'
      : language === 'EN'
      ? '🚨 NOTICE'
      : '🚨 चेतावनी';

  return (
    <div
      className="w-full shrink-0 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white border-t border-red-400/60 shadow-[0_-2px_10px_rgba(220,38,38,0.35)] z-40 overflow-hidden select-none"
      role="region"
      aria-label="Official Disclaimer and Legal Warning"
    >
      <style>{`
        @keyframes locohelp-marquee-scroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .locohelp-marquee-track {
          display: flex;
          width: max-content;
          animation: locohelp-marquee-scroll 38s linear infinite;
        }
        .locohelp-marquee-track:hover,
        .locohelp-marquee-track:active {
          animation-play-state: paused;
        }
      `}</style>
      <div className="flex items-center h-7 sm:h-8">
        {/* Left Fixed Alert Pill */}
        <div className="shrink-0 bg-red-900/95 px-2.5 sm:px-3 h-full flex items-center gap-1 border-r border-red-400/50 z-10 shadow-md">
          <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
          <span className="text-[10px] sm:text-xs font-black tracking-wide uppercase text-amber-200 whitespace-nowrap">
            {badgeLabel}
          </span>
        </div>

        {/* Continuous Auto-Scrolling Red Ticker Content */}
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div className="locohelp-marquee-track items-center">
            <span className="text-[11px] sm:text-xs font-extrabold tracking-wide text-white whitespace-nowrap px-6">
              {tickerText}
            </span>
            <span className="text-[11px] sm:text-xs font-extrabold tracking-wide text-white whitespace-nowrap px-6" aria-hidden="true">
              {tickerText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
