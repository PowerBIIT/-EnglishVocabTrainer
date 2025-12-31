'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useVocabStore } from '@/lib/store';

const CURRENT_VERSION = '1.0';
const LAST_UPDATED = '2024-12-30';

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

Po usunieciu konta wszystkie Twoje dane zostana trwale usuniete w ciagu 14 dni.`,
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

After account deletion, all your data will be permanently deleted within 14 days.`,
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
    title: 'Polityka Konfidencijnosti',
    version: `Versiya ${CURRENT_VERSION}`,
    lastUpdated: `Ostannie onovlennya: ${LAST_UPDATED}`,
    back: 'Nazad',
    sections: [
      {
        title: '1. Administrator danych',
        content: `Administratorom vashykh personalnykh danykh ye PowerBIIT.
        Kontakt z pytan zakhystu danykh: info@henio.app`,
      },
      {
        title: '2. Yaki dani my zbyrayemo',
        content: `My zbyrayemo nastupni dani:

• Adresa elektronnoi poshty (z vashogo akaunty Google pid chas vkhodu)
• Imya ta foto profilyu (z vashogo akaunty Google)
• Progres navchannya (slovnyky, rezultaty testiv, riven)
• Holosovi zapysy (pid chas vprav z vymovy)
• Nalashtuvannya dodatku (mova, vpobobannya)

Holosovi zapysy obroblyayutsya lyshe dlya otsinky vymovy i ne zberigayutsya nadovgo.`,
      },
      {
        title: '3. Tsili obrobky danykh',
        content: `My obroblyayemo vashi dani dlya:

• Nadannya poslug z vyvchennya slovnyka
• Personalizatsiyi protsesu navchannya
• Otsinky vymovy za dopomohoyu shtuchnoho intelektu
• Vidstezhennya progresu ta statystyky
• Komunikatsiyi z korystuvachamy`,
      },
      {
        title: '4. Pravova osnova',
        content: `My obroblyayemo dani na pidstavi:

• St. 6(1)(a) GDPR - Vasha zgoda
• St. 6(1)(b) GDPR - Vykonannya dohovoru (nadannya poslugy)

Posluha dostupna lyshe dlya osib, yaki dosyahly 16 rokiv (St. 8 GDPR).`,
      },
      {
        title: '5. Oderzuvachi danykh ta transfer do SSHA',
        content: `Vashi dani mozhut buty peredani:

• Google LLC (vkhid OAuth) - SSHA
• Google Gemini API (funktsii AI) - SSHA
• Microsoft Azure (hosting dodatku) - YeS/SSHA

Transfer danykh do SSHA zdiysnuyetsya na pidstavi standartnykh dohovirnykh klauzul (SCC), zatverdzhenyky Yevropeyskoyu Komisiyeyu.`,
      },
      {
        title: '6. Biometrychni dani',
        content: `Holosovi zapysy, stvoreni pid chas vprav z vymovy, ye biometrychnymy danymy zgidno zi St. 9 GDPR.

• Zapysy nadsilayutsya do AI API lyshe dlya otsinky vymovy
• Vony ne zberigayutsya na nashykh serverakh
• Obrobka zdiysnuyetsya na pidstavi vashoi chytkoi zgody`,
      },
      {
        title: '7. Period zberigannya danykh',
        content: `My zberigayemo vashi dani:

• Do momentu vydalennya akaunty
• Systemni logy: 30 dniv
• Rozrakhunkovi dani (yakscho zastosovuyetsya): zgidno z podatkovymy normamy

Pislya vydalennya akaunty vsi vashi dani budut ostatochno vydaleni protyagom 14 dniv.`,
      },
      {
        title: '8. Vashi prava',
        content: `Vy mayete nastupni prava:

• Pravo dostupu (St. 15 GDPR)
• Pravo na vypravlennya (St. 16 GDPR)
• Pravo na vydalennya (St. 17 GDPR)
• Pravo na perenosennya danykh (St. 20 GDPR)
• Pravo vidklykannya zgody
• Pravo podaty skargu do naglyadovogo organu

Vy mozhete vydalyty sviy akaunt u bud-yaky chas u nalashtuvannyakh profilyu.`,
      },
      {
        title: '9. Fayly cookies',
        content: `My vykorystovuyemo lyshe neobkhidni sesiyi cookies dlya:

• Pidtrymannya sesiyi vkhodu
• Zapamyatovuvannya movnykh vpodoban

My ne vykorystovuyemo analitychni chy reklamni cookies.`,
      },
      {
        title: '10. Zabezpechennya',
        content: `My zastosovuyemo vidpovidni tekhnichni ta orhanizatsiyni zakhody:

• Shyfruvannya ziednan (HTTPS/SSL)
• Bezpechne zberihannya paroliv (OAuth2)
• Rehuliarni kopiyi
• Obmezhenyi dostup do danykh
• Monitorynh bezpeky`,
      },
      {
        title: '11. Avtomatyzovane pryinnyattya rishen',
        content: `Nash dodatok vykorystovuye shtuchnyy intelekt dlya:

• Otsinky vymovy ta formuvannya vidhukyv
• Heneruvannya slovnyka ta prykladiv
• Nadannya poyasnen ta porad

Rishennya AI mayut lyshe dopomozhnyy ta osvitniy kharakter i ne sprychydyut pravovykh abo podibykh znachnykh naslidkiv dlya korystuvacha.`,
      },
      {
        title: '12. Kontakt',
        content: `Z pytan zakhystu danykh vy mozhete zvyazatysya z namy:

Email: info@henio.app

Vy takozh mozhete podaty skargu do mistsevogo organu zakhystu danykh.`,
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
