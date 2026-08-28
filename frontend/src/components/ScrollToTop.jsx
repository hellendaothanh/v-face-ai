import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

const ScrollToTop = ({ targetRef = null }) => {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const winScrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const targetScrollTop = targetRef?.current ? targetRef.current.scrollTop : 0;
    const scrollTop = Math.max(winScrollTop, targetScrollTop);

    const winScrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
    const targetScrollHeight = targetRef?.current ? targetRef.current.scrollHeight : 0;
    const scrollHeight = Math.max(winScrollHeight, targetScrollHeight);

    const winClientHeight = window.innerHeight || 0;
    const targetClientHeight = targetRef?.current ? targetRef.current.clientHeight : 0;
    const clientHeight = Math.max(winClientHeight, targetClientHeight);

    // Toggle visibility when scrolled > 100px
    if (scrollTop > 100) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }

    // Calculate progress percentage
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 0) {
      const progress = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));
      setScrollProgress(progress);
    } else {
      setScrollProgress(0);
    }
  }, [targetRef]);

  useEffect(() => {
    const target = targetRef?.current;
    if (target) {
      target.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    // Initial check
    handleScroll();

    return () => {
      if (target) {
        target.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [handleScroll, targetRef]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    document.documentElement.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    document.body.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    if (targetRef && targetRef.current) {
      targetRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  if (!isVisible) return null;

  // SVG Circular progress radius
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <div className="fixed bottom-7 right-7 z-50 animate-in fade-in zoom-in-75 duration-300">
      <button
        onClick={scrollToTop}
        type="button"
        aria-label={t('btn_scroll_to_top', 'Lên đầu trang')}
        title={t('btn_scroll_to_top', 'Lên đầu trang')}
        className="group relative w-12 h-12 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 hover:text-white flex items-center justify-center shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/50 backdrop-blur-xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        {/* SVG Circular Scroll Progress Meter */}
        <svg className="absolute inset-0 w-12 h-12 -rotate-90 pointer-events-none" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r={radius}
            className="text-slate-800"
            strokeWidth="2.5"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            className="text-indigo-500 transition-all duration-150 ease-out"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>

        {/* Up Arrow Icon with Micro-bounce */}
        <ArrowUp className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:-translate-y-1" />

        {/* Floating Tooltip badge on hover */}
        <span className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none px-2.5 py-1 rounded-lg text-[10px] font-semibold font-sans tracking-wide bg-slate-900/95 text-indigo-300 border border-indigo-500/30 shadow-xl whitespace-nowrap">
          {scrollProgress}% • {t('btn_scroll_to_top', 'Lên đầu')}
        </span>
      </button>
    </div>
  );
};

export default ScrollToTop;
