'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useVocabStore } from '@/lib/store';

const CURRENT_VERSION = '1.0';
const LAST_UPDATED = '2024-12-30';

const termsCopy = {
  pl: {
    title: 'Regulamin',
    version: `Wersja ${CURRENT_VERSION}`,
    lastUpdated: `Ostatnia aktualizacja: ${LAST_UPDATED}`,
    back: 'Powrot',
    sections: [
      {
        title: '1. Definicje',
        content: `• Usluga - aplikacja English Vocab Trainer do nauki slownictwa
• Uzytkownik - osoba korzystajaca z Uslugi
• Konto - indywidualne konto Uzytkownika w Usluldze
• Tresc - slowka, postepy, ustawienia i inne dane Uzytkownika`,
      },
      {
        title: '2. Warunki korzystania',
        content: `Aby korzystac z Uslugi, musisz:

• Miec ukonczono 16 lat
• Posiadac konto Google do logowania
• Zaakceptowac niniejszy Regulamin i Polityke Prywatnosci

Korzystanie z Uslugi jest bezplatne w wersji podstawowej. Niektore funkcje moga wymagac subskrypcji PRO.`,
      },
      {
        title: '3. Ograniczenia wiekowe',
        content: `Usluga jest przeznaczona dla uczniow i osob uczacych sie jezykow.

• Usluga jest dostepna wylacznie dla osob, ktore ukonczyly 16 lat
• Osoby niepelnoletnie (16-18 lat) moga korzystac z Uslugi zgodnie z obowiazujacym prawem
• Mozemy poprosic o potwierdzenie wieku`,
      },
      {
        title: '4. Zasady uzytkowania',
        content: `Uzytkownik zobowiazuje sie do:

• Korzystania z Uslugi zgodnie z jej przeznaczeniem (nauka slownictwa)
• Niepodejmowania prob obejscia zabezpieczen lub limitow
• Nieuzywania Uslugi do celow niezgodnych z prawem
• Nieprzekazywania dostegu do konta osobom trzecim

Zastrzegamy sobie prawo do zawieszenia lub usuniecia konta w przypadku naruszenia Regulaminu.`,
      },
      {
        title: '5. Funkcje AI',
        content: `Usluga wykorzystuje sztuczna inteligencje (AI) do:

• Generowania slowek i przykladow
• Oceny wymowy
• Udzielania wyjasnier i wskazowek

Tresci generowane przez AI maja charakter edukacyjny i moga zawierac bledy. Nie ponosimy odpowiedzialnosci za decyzje podjete na podstawie tresci AI.`,
      },
      {
        title: '6. Wlasnosc intelektualna',
        content: `• Usluga, jej kod, design i funkcje sa nasza wlasnoscia
• Tresc dodana przez Uzytkownika (slowka, zestawy) pozostaje wlasnoscia Uzytkownika
• Udzielamy Uzytkownikowi licencji na korzystanie z Uslugi zgodnie z Regulaminem`,
      },
      {
        title: '7. Odpowiedzialnosc',
        content: `• Dokladamy staran, aby Usluga dzialala poprawnie
• Nie gwarantujemy nieprzerwanego dzialania Uslugi
• Nie ponosimy odpowiedzialnosci za utrate danych spowodowana awaria
• Zalecamy regularne eksportowanie waznych danych

Odpowiedzialnosc za szkody jest ograniczona do maksymalnej kwoty oplaconej subskrypcji w ostatnich 12 miesiacach.`,
      },
      {
        title: '8. Zmiany Regulaminu',
        content: `• Mozemy zmieniac Regulamin w dowolnym momencie
• O istotnych zmianach poinformujemy z 14-dniowym wyprzedzeniem
• Dalsze korzystanie z Uslugi oznacza akceptacje zmian
• Jesli nie akceptujesz zmian, mozesz usunac konto`,
      },
      {
        title: '9. Wypowiedzenie umowy',
        content: `Mozesz zrezygnowac z Uslugi w dowolnym momencie:

• Usun konto w ustawieniach profilu
• Wszystkie Twoje dane zostana trwale usuniete
• Subskrypcja PRO (jesli aktywna) nie zostanie zwrocona

Zastrzegamy sobie prawo do zakonczenia Uslugi z 30-dniowym wyprzedzeniem.`,
      },
      {
        title: '10. Postanowienia koncowe',
        content: `• Regulamin podlega prawu polskiemu
• Spory beda rozstrzygane przez sady polskie
• Niewaznosc jednego postanowienia nie wplywa na pozostale
• Wersja polska Regulaminu jest wiazaca

W razie pytan: info@henio.app`,
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    version: `Version ${CURRENT_VERSION}`,
    lastUpdated: `Last updated: ${LAST_UPDATED}`,
    back: 'Back',
    sections: [
      {
        title: '1. Definitions',
        content: `• Service - English Vocab Trainer vocabulary learning application
• User - person using the Service
• Account - User's individual account in the Service
• Content - vocabulary, progress, settings and other User data`,
      },
      {
        title: '2. Terms of Use',
        content: `To use the Service, you must:

• Be at least 16 years old
• Have a Google account for login
• Accept these Terms and Privacy Policy

Basic use of the Service is free. Some features may require a PRO subscription.`,
      },
      {
        title: '3. Age Restrictions',
        content: `The Service is designed for students and language learners.

• The Service is available only to persons who are 16 years of age or older
• Minors (16-18 years) may use the Service in accordance with applicable law
• We may request age verification`,
      },
      {
        title: '4. Rules of Use',
        content: `The User agrees to:

• Use the Service for its intended purpose (vocabulary learning)
• Not attempt to bypass security or limits
• Not use the Service for illegal purposes
• Not share account access with third parties

We reserve the right to suspend or delete accounts for Terms violations.`,
      },
      {
        title: '5. AI Features',
        content: `The Service uses artificial intelligence (AI) to:

• Generate vocabulary and examples
• Assess pronunciation
• Provide explanations and guidance

AI-generated content is educational and may contain errors. We are not responsible for decisions made based on AI content.`,
      },
      {
        title: '6. Intellectual Property',
        content: `• The Service, its code, design and features are our property
• Content added by User (vocabulary, sets) remains User's property
• We grant User a license to use the Service according to Terms`,
      },
      {
        title: '7. Liability',
        content: `• We strive to keep the Service running properly
• We do not guarantee uninterrupted Service operation
• We are not liable for data loss due to failures
• We recommend regular export of important data

Liability for damages is limited to the maximum subscription amount paid in the last 12 months.`,
      },
      {
        title: '8. Changes to Terms',
        content: `• We may change these Terms at any time
• We will notify of significant changes 14 days in advance
• Continued use of Service means acceptance of changes
• If you don't accept changes, you can delete your account`,
      },
      {
        title: '9. Termination',
        content: `You can cancel the Service at any time:

• Delete your account in profile settings
• All your data will be permanently deleted
• Active PRO subscription will not be refunded

We reserve the right to terminate the Service with 30 days notice.`,
      },
      {
        title: '10. Final Provisions',
        content: `• These Terms are governed by Polish law
• Disputes will be resolved by Polish courts
• Invalidity of one provision does not affect others
• The Polish version of Terms is binding

For questions: info@henio.app`,
      },
    ],
  },
  uk: {
    title: 'Umovy Korystuvannya',
    version: `Versiya ${CURRENT_VERSION}`,
    lastUpdated: `Ostannie onovlennya: ${LAST_UPDATED}`,
    back: 'Nazad',
    sections: [
      {
        title: '1. Vyznachennya',
        content: `• Posluha - dodatok English Vocab Trainer dlya vyvchennya slovnyka
• Korystuvach - osoba, yaka korystuyetsya Posluhoyu
• Akaunt - indyvidualnyy akaunt Korystuvacha v Posluzi
• Vmist - slovnyk, prohres, nalashtuvannya ta inshi dani Korystuvacha`,
      },
      {
        title: '2. Umovy korystuvannya',
        content: `Shchob korystuvatysya Posluhoyu, vy povynni:

• Maty shchonaymensh 16 rokiv
• Maty akaunt Google dlya vkhodu
• Pryynyaty tsi Umovy ta Polityku Konfidenciynosti

Bazove korystuvannya Posluhoyu ye bezkoshtovnym. Deyaki funktsiyi mozhut vymagaty pidpysky PRO.`,
      },
      {
        title: '3. Vikovi obmezhennya',
        content: `Posluha pryznachena dlya uchniv ta osib, shcho vyvchayut movy.

• Posluha dostupna lyshe dlya osib, yaki dosyahly 16 rokiv
• Nepovnolitni (16-18 rokiv) mozhut korystuvatysya Posluhoyu zgidno z chynnym zakonodavstvom
• My mozhemo poprosyty pidtverdzhennya viku`,
      },
      {
        title: '4. Pravyla korystuvannya',
        content: `Korystuvach zobovyazuyetsya:

• Korystuvatysya Posluhoyu za pryznachennyam (vyvchennya slovnyka)
• Ne namahatysya obiyty zakhyst abo limity
• Ne vykorystovuvaty Posluhu dlya nezakonnykh tsiley
• Ne peredavaty dostup do akaunty tretim osobam

My zalyshalemo za soboyu pravo pryzupynyty abo vydalyty akaunt za porushennya Umov.`,
      },
      {
        title: '5. Funktsiyi AI',
        content: `Posluha vykorystovuye shtuchnyy intelekt (AI) dlya:

• Heneruvannya slovnyka ta prykladiv
• Otsinky vymovy
• Nadannya poyasnen ta porad

Vmist, shcho heneruyetsya AI, maye osvitniy kharakter i mozhe mistyty pomylky. My ne nesemo vidpovidalnosti za rishennya, pryynyati na osnovi vmistu AI.`,
      },
      {
        title: '6. Intelektualna vlasnist',
        content: `• Posluha, yiyi kod, dyzayn ta funktsiyi ye nashoyu vlasnistyu
• Vmist, dodanyy Korystuvachem (slovnyk, nabory), zalyshayetsya vlasnistyu Korystuvacha
• My nadayemo Korystuvachu litsenziyu na korystuvannya Posluhoyu zgidno z Umovamy`,
      },
      {
        title: '7. Vidpovidalnist',
        content: `• My doklaydayemo zusyl, shchob Posluha pratsyuvala naleznym chynom
• My ne harantuyemo bezperervonoyi roboty Posluhy
• My ne nesemo vidpovidalnosti za vtratu danykh cherez zboi
• My rekomenduyemo rehularne eksportuvannya vazhlyvykh danykh

Vidpovidalnist za zbytkiv obmezhuetsya maksymalnoyu sumoyu pidpysky, splachenoi za ostanni 12 misyatsiv.`,
      },
      {
        title: '8. Zminy Umov',
        content: `• My mozhemo zminyuvaty tsi Umovy v bud-yaky chas
• Pro istotni zminy my povidomymo za 14 dniv
• Podalshe korystuvannya Posluhoyu oznachaye pryynyattya zmin
• Yaksho vy ne pryymayte zminy, vy mozhete vydalyty sviy akaunt`,
      },
      {
        title: '9. Rozirvannya',
        content: `Vy mozhete vidmovytysya vid Posluhy v bud-yaky chas:

• Vydalit sviy akaunt u nalashtuvannyakh profilyu
• Vsi vashi dani budut ostatochno vydaleni
• Aktyvna pidpyska PRO ne bude povernuta

My zalyshalemo za soboyu pravo prypynyty Posluhu z povidomlennyam za 30 dniv.`,
      },
      {
        title: '10. Prykintsevi polozhennya',
        content: `• Tsi Umovy rehulyuyutsya polskym zakonodavstvom
• Spory budut vyrishuvaty polski sudy
• Nediysnist odnoho polozhennya ne vplyvaye na inshi
• Polska versiya Umov ye obovyazkovoyu

Z pytan: info@henio.app`,
      },
    ],
  },
};

export default function TermsPage() {
  const language = useVocabStore((state) => state.settings.general.language);
  const t = termsCopy[language] ?? termsCopy.pl;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back}
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
            {t.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            {t.version} | {t.lastUpdated}
          </p>

          <div className="space-y-8">
            {t.sections.map((section, index) => (
              <section key={index}>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                  {section.title}
                </h2>
                <div className="text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link href="/privacy" className="hover:underline">
            {language === 'uk' ? 'Polityka konfidencijnosti' : language === 'en' ? 'Privacy Policy' : 'Polityka Prywatnosci'}
          </Link>
        </div>
      </div>
    </div>
  );
}
