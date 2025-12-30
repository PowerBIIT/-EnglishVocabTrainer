'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ExternalLink, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useVocabStore, useHydration } from '@/lib/store';

const DISMISS_KEY = 'consent_banner_dismissed';
const DISMISS_EXPIRY_DAYS = 7;

const bannerCopy = {
  pl: {
    title: 'Aktualizacja Regulaminu',
    message: 'Zaktualizowalismy Regulamin i Polityke Prywatnosci. Prosimy o akceptacje.',
    accept: 'Akceptuje',
    later: 'Przypomnij pozniej',
    privacy: 'Polityka prywatnosci',
    terms: 'Regulamin',
  },
  en: {
    title: 'Terms Update',
    message: 'We have updated our Terms of Service and Privacy Policy. Please accept to continue.',
    accept: 'Accept',
    later: 'Remind me later',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
  uk: {
    title: 'Onovlennya Umov',
    message: 'My onovyly Umovy korystuvannya ta Polityku konfidencijnosti. Pryymy, shchob prodovzhyty.',
    accept: 'Pryymayu',
    later: 'Nahday piznishe',
    privacy: 'Polityka konfidencijnosti',
    terms: 'Umovy korystuvannya',
  },
};

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (!stored) return false;
    const expiry = parseInt(stored, 10);
    if (Date.now() > expiry) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    const expiry = Date.now() + DISMISS_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, expiry.toString());
  } catch {
    // Ignore storage errors
  }
}

export function ConsentBanner() {
  const { data: session, update } = useSession();
  const hydrated = useHydration();
  const language = useVocabStore((state) => state.settings.general.language);
  const t = bannerCopy[language] ?? bannerCopy.pl;

  const [show, setShow] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!hydrated || !session?.user) return;

    // Check if user has already accepted terms
    // We need to fetch the profile to check termsAcceptedAt
    const checkConsent = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) return;

        const data = await response.json();
        const hasAccepted = !!data.user?.termsAcceptedAt;

        if (!hasAccepted && !isDismissed()) {
          setShow(true);
        }
      } catch {
        // Ignore errors
      }
    };

    checkConsent();
  }, [hydrated, session?.user]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          termsAccepted: true,
          ageConfirmed: true,
        }),
      });
      await update({});
      setShow(false);
    } catch (error) {
      console.error('Failed to accept terms:', error);
    } finally {
      setAccepting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              {t.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {t.message}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/privacy"
            target="_blank"
            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
          >
            {t.privacy}
            <ExternalLink size={12} />
          </Link>
          <Link
            href="/terms"
            target="_blank"
            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
          >
            {t.terms}
            <ExternalLink size={12} />
          </Link>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDismiss}
            className="flex-1"
          >
            {t.later}
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1"
          >
            {accepting ? '...' : t.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}
