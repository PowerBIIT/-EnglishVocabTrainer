'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useVocabStore } from '@/lib/store';

const CURRENT_VERSION = '1.1';
const LAST_UPDATED = '2026-01-02';

const privacyCopy = {
  pl: {
    title: 'Polityka Prywatnosci',
    version: `Wersja ${CURRENT_VERSION}`,
    lastUpdated: `Ostatnia aktualizacja: ${LAST_UPDATED}`,
    back: 'Powrot',
    sections: [
      {
        title: '1. Administrator danych',
        content: `Administratorem Twoich danych osobowych jest PowerBIIT.
        Kontakt w sprawach ochrony danych: info@henio.app`,
      },
      {
        title: '2. Jakie dane zbieramy',
        content: `Zbieramy nastepujace dane:

• Adres e-mail (z konta Google przy logowaniu)
• Imie i zdjecie profilowe (z konta Google)
• Postepy w nauce (slowka, wyniki quizow, poziom)
• Nagrania glosowe (przy cwiczeniach wymowy)
• Ustawienia aplikacji (jezyk, preferencje)

Nagrania glosowe sa przetwarzane wylacznie w celu oceny wymowy i nie sa przechowywane dlugoterminowo.`,
      },
      {
        title: '3. Cele przetwarzania danych',
        content: `Twoje dane przetwarzamy w celu:

• Swiadczenia uslugi nauki slownictwa
• Personalizacji procesu nauki
• Oceny wymowy za pomoca sztucznej inteligencji
• Sledzenia postepu i statystyk
• Komunikacji z uzytkownikiem`,
      },
      {
        title: '4. Podstawa prawna',
        content: `Przetwarzamy dane na podstawie:

• Art. 6 ust. 1 lit. a RODO - Twoja zgoda
• Art. 6 ust. 1 lit. b RODO - wykonanie umowy (swiadczenie uslugi)

Usluga jest dostepna wylacznie dla osob, ktore ukonczyly 16 lat (Art. 8 RODO).`,
      },
      {
        title: '5. Odbiorcy danych i transfer do USA',
        content: `Twoje dane moga byc przekazywane:

• Google LLC (logowanie OAuth) - USA
• Google Gemini API (funkcje AI) - USA
• Microsoft Azure (hosting aplikacji) - UE/USA

Transfer danych do USA odbywa sie na podstawie standardowych klauzul umownych (SCC) zatwierdzonych przez Komisje Europejska. Google LLC jest certyfikowany w ramach EU-U.S. Data Privacy Framework.`,
      },
      {
        title: '6. Dane biometryczne',
        content: `Nagrania glosowe tworzone podczas cwiczen wymowy stanowia dane biometryczne w rozumieniu Art. 9 RODO.

• Nagrania sa przesylane do API AI wylacznie w celu oceny wymowy
• Nie sa przechowywane na naszych serwerach
• Przetwarzanie odbywa sie na podstawie Twojej wyraznej zgody`,
      },
      {
        title: '7. Okres przechowywania',
        content: `Twoje dane przechowujemy:

• Do momentu usuniecia konta
• Logi systemowe: 30 dni
• Dane rozliczeniowe (jesli dotyczy): zgodnie z przepisami podatkowymi

Po usunieciu konta wszystkie Twoje dane zostana trwale usuniete.`,
      },
      {
        title: '8. Twoje prawa',
        content: `Przysługują Ci nastepujace prawa:

• Prawo dostepu do danych (Art. 15 RODO)
• Prawo do sprostowania danych (Art. 16 RODO)
• Prawo do usuniecia danych (Art. 17 RODO)
• Prawo do przenoszenia danych (Art. 20 RODO)
• Prawo do cofniecia zgody
• Prawo do wniesienia skargi do UODO

Mozesz usunac swoje konto w dowolnym momencie w ustawieniach profilu.`,
      },
      {
        title: '9. Pliki cookies',
        content: `Uzywamy wylacznie niezbednych plikow cookies sesyjnych do:

• Utrzymania sesji logowania
• Zapamietania preferencji jezyka

Nie uzywamy cookies analitycznych ani reklamowych.`,
      },
      {
        title: '10. Zabezpieczenia',
        content: `Stosujemy odpowiednie srodki techniczne i organizacyjne:

• Szyfrowanie polaczen (HTTPS/SSL)
• Bezpieczne przechowywanie hasel (OAuth2)
• Regularne kopie zapasowe
• Ograniczony dostep do danych
• Monitoring bezpieczenstwa`,
      },
      {
        title: '11. Zautomatyzowane podejmowanie decyzji',
        content: `Nasza aplikacja wykorzystuje sztuczna inteligencje do:

• Oceny wymowy i generowania feedbacku
• Generowania slowek i przykladow
• Udzielania wyjasnier i wskazowek

Decyzje AI maja charakter wylacznie pomocniczy i edukacyjny i nie wywoluja skutkow prawnych ani podobnych znaczacych skutkow wobec uzytkownika.`,
      },
      {
        title: '12. Kontakt',
        content: `W sprawach ochrony danych osobowych mozesz sie z nami skontaktowac:

E-mail: info@henio.app

Mozesz rowniez zlozyc skarge do Prezesa Urzedu Ochrony Danych Osobowych (UODO).`,
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    version: `Version ${CURRENT_VERSION}`,
    lastUpdated: `Last updated: ${LAST_UPDATED}`,
    back: 'Back',
    sections: [
      {
        title: '1. Data Controller',
        content: `The controller of your personal data is PowerBIIT.
        Contact for data protection matters: info@henio.app`,
      },
      {
        title: '2. Data We Collect',
        content: `We collect the following data:

• Email address (from your Google account during login)
• Name and profile picture (from your Google account)
• Learning progress (vocabulary, quiz results, level)
• Voice recordings (during pronunciation exercises)
• App settings (language, preferences)

Voice recordings are processed solely for pronunciation assessment and are not stored long-term.`,
      },
      {
        title: '3. Purpose of Data Processing',
        content: `We process your data to:

• Provide vocabulary learning services
• Personalize the learning process
• Assess pronunciation using artificial intelligence
• Track progress and statistics
• Communicate with users`,
      },
      {
        title: '4. Legal Basis',
        content: `We process data based on:

• Art. 6(1)(a) GDPR - Your consent
• Art. 6(1)(b) GDPR - Contract performance (service provision)

The Service is available only to persons who are 16 years of age or older (Art. 8 GDPR).`,
      },
      {
        title: '5. Data Recipients and Transfer to USA',
        content: `Your data may be transferred to:

• Google LLC (OAuth login) - USA
• Google Gemini API (AI features) - USA
• Microsoft Azure (application hosting) - EU/USA

Data transfer to the USA is based on Standard Contractual Clauses (SCC) approved by the European Commission. Google LLC is certified under the EU-U.S. Data Privacy Framework.`,
      },
      {
        title: '6. Biometric Data',
        content: `Voice recordings created during pronunciation exercises constitute biometric data under Art. 9 GDPR.

• Recordings are sent to AI API solely for pronunciation assessment
• They are not stored on our servers
• Processing is based on your explicit consent`,
      },
      {
        title: '7. Data Retention Period',
        content: `We store your data:

• Until account deletion
• System logs: 30 days
• Billing data (if applicable): according to tax regulations

After account deletion, all your data will be permanently deleted.`,
      },
      {
        title: '8. Your Rights',
        content: `You have the following rights:

• Right of access (Art. 15 GDPR)
• Right to rectification (Art. 16 GDPR)
• Right to erasure (Art. 17 GDPR)
• Right to data portability (Art. 20 GDPR)
• Right to withdraw consent
• Right to lodge a complaint with supervisory authority

You can delete your account at any time in profile settings.`,
      },
      {
        title: '9. Cookies',
        content: `We only use essential session cookies for:

• Maintaining login session
• Remembering language preferences

We do not use analytical or advertising cookies.`,
      },
      {
        title: '10. Security',
        content: `We apply appropriate technical and organizational measures:

• Connection encryption (HTTPS/SSL)
• Secure password storage (OAuth2)
• Regular backups
• Restricted data access
• Security monitoring`,
      },
      {
        title: '11. Automated Decision Making',
        content: `Our application uses artificial intelligence to:

• Assess pronunciation and generate feedback
• Generate vocabulary and examples
• Provide explanations and guidance

AI decisions are purely assistive and educational and do not produce legal or similarly significant effects on the user.`,
      },
      {
        title: '12. Contact',
        content: `For data protection matters, you can contact us at:

Email: info@henio.app

You can also lodge a complaint with your local data protection authority.`,
      },
    ],
  },
  uk: {
    title: 'Політика Конфіденційності',
    version: `Версія ${CURRENT_VERSION}`,
    lastUpdated: `Останнє оновлення: ${LAST_UPDATED}`,
    back: 'Назад',
    sections: [
      {
        title: '1. Адміністратор даних',
        content: `Адміністратором ваших персональних даних є PowerBIIT.
        Контакт з питань захисту даних: info@henio.app`,
      },
      {
        title: '2. Які дані ми збираємо',
        content: `Ми збираємо наступні дані:

• Адреса електронної пошти (з вашого акаунту Google під час входу)
• Ім'я та фото профілю (з вашого акаунту Google)
• Прогрес навчання (словники, результати тестів, рівень)
• Голосові записи (під час вправ з вимови)
• Налаштування додатку (мова, вподобання)

Голосові записи обробляються лише для оцінки вимови і не зберігаються надовго.`,
      },
      {
        title: '3. Цілі обробки даних',
        content: `Ми обробляємо ваші дані для:

• Надання послуг з вивчення словника
• Персоналізації процесу навчання
• Оцінки вимови за допомогою штучного інтелекту
• Відстеження прогресу та статистики
• Комунікації з користувачами`,
      },
      {
        title: '4. Правова основа',
        content: `Ми обробляємо дані на підставі:

• Ст. 6(1)(a) GDPR - Ваша згода
• Ст. 6(1)(b) GDPR - Виконання договору (надання послуги)

Послуга доступна лише для осіб, які досягли 16 років (Ст. 8 GDPR).`,
      },
      {
        title: '5. Одержувачі даних та трансфер до США',
        content: `Ваші дані можуть бути передані:

• Google LLC (вхід OAuth) - США
• Google Gemini API (функції AI) - США
• Microsoft Azure (хостинг додатку) - ЄС/США

Трансфер даних до США здійснюється на підставі стандартних договірних клаузул (SCC), затверджених Європейською Комісією.`,
      },
      {
        title: '6. Біометричні дані',
        content: `Голосові записи, створені під час вправ з вимови, є біометричними даними згідно зі Ст. 9 GDPR.

• Записи надсилаються до AI API лише для оцінки вимови
• Вони не зберігаються на наших серверах
• Обробка здійснюється на підставі вашої чіткої згоди`,
      },
      {
        title: '7. Період зберігання даних',
        content: `Ми зберігаємо ваші дані:

• До моменту видалення акаунту
• Системні логи: 30 днів
• Розрахункові дані (якщо застосовується): згідно з податковими нормами

Після видалення акаунту всі ваші дані будуть остаточно видалені.`,
      },
      {
        title: '8. Ваші права',
        content: `Ви маєте наступні права:

• Право доступу (Ст. 15 GDPR)
• Право на виправлення (Ст. 16 GDPR)
• Право на видалення (Ст. 17 GDPR)
• Право на перенесення даних (Ст. 20 GDPR)
• Право відкликання згоди
• Право подати скаргу до наглядового органу

Ви можете видалити свій акаунт у будь-який час у налаштуваннях профілю.`,
      },
      {
        title: '9. Файли cookies',
        content: `Ми використовуємо лише необхідні сесійні cookies для:

• Підтримання сесії входу
• Запам'ятовування мовних вподобань

Ми не використовуємо аналітичні чи рекламні cookies.`,
      },
      {
        title: '10. Забезпечення',
        content: `Ми застосовуємо відповідні технічні та організаційні заходи:

• Шифрування з'єднань (HTTPS/SSL)
• Безпечне зберігання паролів (OAuth2)
• Регулярні копії
• Обмежений доступ до даних
• Моніторинг безпеки`,
      },
      {
        title: '11. Автоматизоване прийняття рішень',
        content: `Наш додаток використовує штучний інтелект для:

• Оцінки вимови та формування відгуків
• Генерування словника та прикладів
• Надання пояснень та порад

Рішення AI мають лише допоміжний та освітній характер і не спричиняють правових або подібних значних наслідків для користувача.`,
      },
      {
        title: '12. Контакт',
        content: `З питань захисту даних ви можете зв'язатися з нами:

Email: info@henio.app

Ви також можете подати скаргу до місцевого органу захисту даних.`,
      },
    ],
  },
};

export default function PrivacyPage() {
  const language = useVocabStore((state) => state.settings.general.language);
  const t = privacyCopy[language] ?? privacyCopy.pl;

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
          <Link href="/terms" className="hover:underline">
            {language === 'uk' ? 'Umovy korystuvannya' : language === 'en' ? 'Terms of Service' : 'Regulamin'}
          </Link>
        </div>
      </div>
    </div>
  );
}
