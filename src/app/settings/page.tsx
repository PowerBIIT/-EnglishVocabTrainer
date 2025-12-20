'use client';

import { ArrowLeft, BookOpen, Volume2, Palette, Bot, Bell } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useVocabStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface SelectProps {
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string | number) => void;
}

function Select({ value, options, onChange }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        const numVal = Number(val);
        onChange(isNaN(numVal) ? val : numVal);
      }}
      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-12 h-6 rounded-full transition-colors',
        checked ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'
      )}
    >
      <div
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-7' : 'translate-x-1'
        )}
      />
    </button>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <p className="font-medium text-slate-800 dark:text-slate-100">{label}</p>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const settings = useVocabStore((state) => state.settings);
  const updateSettings = useVocabStore((state) => state.updateSettings);
  const stats = useVocabStore((state) => state.stats);

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </Link>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Ustawienia
        </h1>
      </div>

      {/* Session settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Sesja nauki
            </h2>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 dark:divide-slate-700">
          <SettingRow label="Pytań w quizie">
            <Select
              value={settings.session.quizQuestionCount}
              options={[
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 15, label: '15' },
                { value: 20, label: '20' },
                { value: 'all', label: 'Wszystkie' },
              ]}
              onChange={(v) =>
                updateSettings('session', {
                  quizQuestionCount: v as 5 | 10 | 15 | 20 | 'all',
                })
              }
            />
          </SettingRow>

          <SettingRow label="Fiszek w sesji">
            <Select
              value={settings.session.flashcardCount}
              options={[
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 15, label: '15' },
                { value: 20, label: '20' },
                { value: 'all', label: 'Wszystkie' },
              ]}
              onChange={(v) =>
                updateSettings('session', {
                  flashcardCount: v as 5 | 10 | 15 | 20 | 'all',
                })
              }
            />
          </SettingRow>

          <SettingRow label="Limit czasu" description="Na odpowiedź w quizie">
            <Select
              value={settings.session.timeLimit ?? 'none'}
              options={[
                { value: 'none', label: 'Brak' },
                { value: 5, label: '5 sekund' },
                { value: 10, label: '10 sekund' },
                { value: 15, label: '15 sekund' },
                { value: 30, label: '30 sekund' },
              ]}
              onChange={(v) =>
                updateSettings('session', {
                  timeLimit: v === 'none' ? null : (v as 5 | 10 | 15 | 30),
                })
              }
            />
          </SettingRow>

          <SettingRow label="Kolejność słówek">
            <Select
              value={settings.session.wordOrder}
              options={[
                { value: 'random', label: 'Losowa' },
                { value: 'alphabetical', label: 'Alfabetyczna' },
                { value: 'hardest_first', label: 'Najtrudniejsze' },
              ]}
              onChange={(v) =>
                updateSettings('session', {
                  wordOrder: v as 'random' | 'alphabetical' | 'hardest_first',
                })
              }
            />
          </SettingRow>

          <SettingRow
            label="Powtórki błędnych"
            description="Powtarzaj błędne odpowiedzi"
          >
            <Toggle
              checked={settings.session.repeatMistakes}
              onChange={(v) => updateSettings('session', { repeatMistakes: v })}
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Pronunciation settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Volume2 size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Wymowa
            </h2>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 dark:divide-slate-700">
          <SettingRow label="Głos">
            <Select
              value={settings.pronunciation.voice}
              options={[
                { value: 'british', label: 'Brytyjski' },
                { value: 'american', label: 'Amerykański' },
                { value: 'australian', label: 'Australijski' },
              ]}
              onChange={(v) =>
                updateSettings('pronunciation', {
                  voice: v as 'british' | 'american' | 'australian',
                })
              }
            />
          </SettingRow>

          <SettingRow label="Prędkość mowy">
            <Select
              value={settings.pronunciation.speed}
              options={[
                { value: 0.7, label: 'Wolna' },
                { value: 1, label: 'Normalna' },
                { value: 1.2, label: 'Szybka' },
              ]}
              onChange={(v) =>
                updateSettings('pronunciation', {
                  speed: v as 0.7 | 1 | 1.2,
                })
              }
            />
          </SettingRow>

          <SettingRow
            label="Auto-odtwarzanie"
            description="Automatycznie odtwarzaj wymowę"
          >
            <Toggle
              checked={settings.pronunciation.autoPlay}
              onChange={(v) => updateSettings('pronunciation', { autoPlay: v })}
            />
          </SettingRow>

          <SettingRow label="Próg zaliczenia" description="Minimalna ocena wymowy">
            <Select
              value={settings.pronunciation.passingScore}
              options={[
                { value: 5, label: '5/10' },
                { value: 6, label: '6/10' },
                { value: 7, label: '7/10' },
                { value: 8, label: '8/10' },
              ]}
              onChange={(v) =>
                updateSettings('pronunciation', {
                  passingScore: v as 5 | 6 | 7 | 8,
                })
              }
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* General settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Wygląd
            </h2>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 dark:divide-slate-700">
          <SettingRow label="Język interfejsu">
            <Select
              value={settings.general.language}
              options={[
                { value: 'pl', label: 'Polski' },
                { value: 'en', label: 'English' },
              ]}
              onChange={(v) =>
                updateSettings('general', { language: v as 'pl' | 'en' })
              }
            />
          </SettingRow>

          <SettingRow label="Motyw">
            <Select
              value={settings.general.theme}
              options={[
                { value: 'light', label: 'Jasny' },
                { value: 'dark', label: 'Ciemny' },
                { value: 'auto', label: 'Automatyczny' },
              ]}
              onChange={(v) =>
                updateSettings('general', {
                  theme: v as 'light' | 'dark' | 'auto',
                })
              }
            />
          </SettingRow>

          <SettingRow label="Dźwięki" description="Efekty dźwiękowe w aplikacji">
            <Toggle
              checked={settings.general.sounds}
              onChange={(v) => updateSettings('general', { sounds: v })}
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* AI settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Asystent AI
            </h2>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 dark:divide-slate-700">
          <SettingRow label="Szczegółowość feedbacku">
            <Select
              value={settings.ai.feedbackDetail}
              options={[
                { value: 'short', label: 'Krótki' },
                { value: 'detailed', label: 'Szczegółowy' },
              ]}
              onChange={(v) =>
                updateSettings('ai', {
                  feedbackDetail: v as 'short' | 'detailed',
                })
              }
            />
          </SettingRow>

          <SettingRow label="Język feedbacku AI">
            <Select
              value={settings.ai.feedbackLanguage}
              options={[
                { value: 'pl', label: 'Polski' },
                { value: 'en', label: 'English' },
              ]}
              onChange={(v) =>
                updateSettings('ai', { feedbackLanguage: v as 'pl' | 'en' })
              }
            />
          </SettingRow>

          <SettingRow
            label="Wskazówki fonetyczne"
            description="Pokazuj porady dotyczące wymowy"
          >
            <Toggle
              checked={settings.ai.phoneticHints}
              onChange={(v) => updateSettings('ai', { phoneticHints: v })}
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Stats summary */}
      <Card className="bg-slate-50 dark:bg-slate-800">
        <CardContent className="p-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">
            Twoje statystyki
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Poziom</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {stats.level}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Łącznie XP</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {stats.totalXp}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Aktualna seria</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {stats.currentStreak} dni
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Sesji ukończonych</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {stats.totalSessionsCompleted}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App info */}
      <div className="text-center text-sm text-slate-400 dark:text-slate-500">
        <p>English Vocab Trainer v1.0</p>
        <p>Made with ❤️ for Polish learners</p>
      </div>
    </div>
  );
}
