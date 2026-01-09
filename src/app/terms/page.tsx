'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useVocabStore } from '@/lib/store';

const CURRENT_VERSION = '1.2';
const LAST_UPDATED = '2026-01-08';

const termsCopy = {
  pl: {
    title: 'Regulamin',
    version: `Wersja ${CURRENT_VERSION}`,
    lastUpdated: `Ostatnia aktualizacja: ${LAST_UPDATED}`,
    back: 'Powrot',
    sections: [
      {
        title: '1. Definicje',
        content: `• Usluga - aplikacja Henio do nauki slownictwa
• Uzytkownik - osoba korzystajaca z Uslugi
• Konto - indywidualne konto Uzytkownika w Usluldze
• Tresc - slowka, postepy, ustawienia i inne dane Uzytkownika`,
      },
      {
        title: '2. Warunki korzystania',
        content: `Aby korzystac z Uslugi, musisz:

• Miec ukonczono 16 lat
• Logowac sie przez konto Google lub email i haslo (potwierdzenie emaila moze byc wymagane)
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
        content: `• Service - Henio vocabulary learning application
• User - person using the Service
• Account - User's individual account in the Service
• Content - vocabulary, progress, settings and other User data`,
      },
      {
        title: '2. Terms of Use',
        content: `To use the Service, you must:

• Be at least 16 years old
• Sign in with Google or with an email and password (email verification may be required)
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
    title: 'Умови Користування',
    version: `Версія ${CURRENT_VERSION}`,
    lastUpdated: `Останнє оновлення: ${LAST_UPDATED}`,
    back: 'Назад',
    sections: [
      {
        title: '1. Визначення',
        content: `• Послуга - додаток Henio для вивчення словника
• Користувач - особа, яка користується Послугою
• Акаунт - індивідуальний акаунт Користувача в Послузі
• Вміст - словник, прогрес, налаштування та інші дані Користувача`,
      },
      {
        title: '2. Умови користування',
        content: `Щоб користуватися Послугою, ви повинні:

• Мати щонайменш 16 років
• Увійти через Google або через email та пароль (може знадобитися підтвердження email)
• Прийняти ці Умови та Політику Конфіденційності

Базове користування Послугою є безкоштовним. Деякі функції можуть вимагати підписки PRO.`,
      },
      {
        title: '3. Вікові обмеження',
        content: `Послуга призначена для учнів та осіб, що вивчають мови.

• Послуга доступна лише для осіб, які досягли 16 років
• Неповнолітні (16-18 років) можуть користуватися Послугою згідно з чинним законодавством
• Ми можемо попросити підтвердження віку`,
      },
      {
        title: '4. Правила користування',
        content: `Користувач зобов'язується:

• Користуватися Послугою за призначенням (вивчення словника)
• Не намагатися обійти захист або ліміти
• Не використовувати Послугу для незаконних цілей
• Не передавати доступ до акаунту третім особам

Ми залишаємо за собою право призупинити або видалити акаунт за порушення Умов.`,
      },
      {
        title: '5. Функції AI',
        content: `Послуга використовує штучний інтелект (AI) для:

• Генерування словника та прикладів
• Оцінки вимови
• Надання пояснень та порад

Вміст, що генерується AI, має освітній характер і може містити помилки. Ми не несемо відповідальності за рішення, прийняті на основі вмісту AI.`,
      },
      {
        title: '6. Інтелектуальна власність',
        content: `• Послуга, її код, дизайн та функції є нашою власністю
• Вміст, доданий Користувачем (словник, набори), залишається власністю Користувача
• Ми надаємо Користувачу ліцензію на користування Послугою згідно з Умовами`,
      },
      {
        title: '7. Відповідальність',
        content: `• Ми докладаємо зусиль, щоб Послуга працювала належним чином
• Ми не гарантуємо безперервної роботи Послуги
• Ми не несемо відповідальності за втрату даних через збої
• Ми рекомендуємо регулярне експортування важливих даних

Відповідальність за збитки обмежується максимальною сумою підписки, сплаченої за останні 12 місяців.`,
      },
      {
        title: '8. Зміни Умов',
        content: `• Ми можемо змінювати ці Умови в будь-який час
• Про істотні зміни ми повідомимо за 14 днів
• Подальше користування Послугою означає прийняття змін
• Якщо ви не приймаєте зміни, ви можете видалити свій акаунт`,
      },
      {
        title: '9. Розірвання',
        content: `Ви можете відмовитися від Послуги в будь-який час:

• Видаліть свій акаунт у налаштуваннях профілю
• Всі ваші дані будуть остаточно видалені
• Активна підписка PRO не буде повернута

Ми залишаємо за собою право припинити Послугу з повідомленням за 30 днів.`,
      },
      {
        title: '10. Прикінцеві положення',
        content: `• Ці Умови регулюються польським законодавством
• Спори будуть вирішувати польські суди
• Недійсність одного положення не впливає на інші
• Польська версія Умов є обов'язковою

З питань: info@henio.app`,
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
