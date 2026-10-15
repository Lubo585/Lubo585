// Právne texty pre nemecký trh. Impressum podľa § 5 DDG, Datenschutzerklärung podľa DSGVO.
// Odporúčame pred spustením nechať skontrolovať nemeckým právnikom.
import { company } from './de'

export type LegalSection = { heading: string; paragraphs: string[] }
export type LegalPage = { id: 'impressum' | 'datenschutz'; title: string; sections: LegalSection[] }

export const impressum: LegalPage = {
  id: 'impressum',
  title: 'Impressum',
  sections: [
    {
      heading: 'Angaben gemäß § 5 DDG',
      paragraphs: [
        company.legalName,
        `${company.address.street}, ${company.address.city}, ${company.address.country}`,
        `Vertreten durch den Geschäftsführer: ${company.managingDirector}`,
      ],
    },
    {
      heading: 'Kontakt',
      paragraphs: [`Telefon: ${company.phoneDisplay}`, `E-Mail: ${company.email}`, `Web: www.pspsk.de`],
    },
    {
      heading: 'Registereintrag',
      paragraphs: [
        `Eingetragen im Handelsregister der Slowakischen Republik (Obchodný register), geführt beim Mestský súd Košice (Stadtgericht Košice), Abteilung Sro, Einlage Nr. 47394/V.`,
        `Identifikationsnummer (IČO): ${company.ico}`,
        `Steuernummer (DIČ): ${company.dic}`,
        `Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${company.vat}`,
        `Stammkapital: ${company.shareCapital}`,
      ],
    },
    {
      heading: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV',
      paragraphs: [`${company.managingDirector}, ${company.address.street}, ${company.address.city}, ${company.address.country}`],
    },
    {
      heading: 'EU-Streitschlichtung',
      paragraphs: [
        'Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/. Unsere E-Mail-Adresse finden Sie oben im Impressum.',
        'Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
      ],
    },
    {
      heading: 'Haftung für Inhalte',
      paragraphs: [
        'Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.',
      ],
    },
    {
      heading: 'Urheberrecht',
      paragraphs: [
        'Die auf dieser Website veröffentlichten Inhalte, Texte und Fotografien unterliegen dem Urheberrecht. Alle Fotografien zeigen eigene Projekte der Gesellschaft. Vervielfältigung, Bearbeitung und Verbreitung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung.',
      ],
    },
  ],
}

export const datenschutz: LegalPage = {
  id: 'datenschutz',
  title: 'Datenschutzerklärung',
  sections: [
    {
      heading: '1. Verantwortlicher',
      paragraphs: [
        `Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist: ${company.legalName}, ${company.address.street}, ${company.address.city}, ${company.address.country}, vertreten durch den Geschäftsführer ${company.managingDirector}. E-Mail: ${company.email}, Telefon: ${company.phoneDisplay}.`,
      ],
    },
    {
      heading: '2. Allgemeine Hinweise',
      paragraphs: [
        'Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Diese Website kann grundsätzlich ohne Angabe personenbezogener Daten genutzt werden. Diese Datenschutzerklärung informiert Sie darüber, welche Daten beim Besuch dieser Website und bei der Nutzung des Kontaktformulars verarbeitet werden.',
      ],
    },
    {
      heading: '3. Hosting und Server-Logfiles',
      paragraphs: [
        'Diese Website wird bei GitHub, Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA (GitHub Pages) gehostet. Beim Aufruf der Website werden durch den Hosting-Anbieter automatisch Informationen in Server-Logfiles erfasst, die Ihr Browser übermittelt: IP-Adresse, Datum und Uhrzeit des Zugriffs, aufgerufene Seite, übertragene Datenmenge, Browsertyp und -version sowie Betriebssystem.',
        'Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt in der sicheren und zuverlässigen Bereitstellung der Website. GitHub ist unter dem EU-US Data Privacy Framework zertifiziert; zusätzlich gelten die Standardvertragsklauseln der EU-Kommission. Weitere Informationen: https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement.',
      ],
    },
    {
      heading: '4. Kontaktformular und E-Mail-Kontakt',
      paragraphs: [
        'Wenn Sie uns über das Kontaktformular oder per E-Mail kontaktieren, verarbeiten wir die von Ihnen übermittelten Angaben (Name, Unternehmen, E-Mail-Adresse, Telefonnummer, Nachricht) zur Bearbeitung Ihrer Anfrage und für den Fall von Anschlussfragen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung von Anfragen).',
        'Die Übermittlung des Kontaktformulars erfolgt über den Dienst FormSubmit (formsubmit.co), der die Formulardaten an unsere E-Mail-Adresse weiterleitet. Die Daten werden dort nur zum Zweck der Zustellung verarbeitet. Alternativ können Sie uns jederzeit direkt per E-Mail kontaktieren.',
        'Ihre Daten werden gelöscht, sobald sie für die Erreichung des Zwecks nicht mehr erforderlich sind und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.',
      ],
    },
    {
      heading: '5. Cookies, Schriftarten und Analyse',
      paragraphs: [
        'Diese Website setzt keine Cookies ein und verwendet keine Analyse- oder Tracking-Dienste. Die verwendeten Schriftarten werden lokal auf unserem Server bereitgestellt; es wird keine Verbindung zu Servern von Google oder anderen Schriftanbietern aufgebaut.',
      ],
    },
    {
      heading: '6. Ihre Rechte',
      paragraphs: [
        'Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie betreffenden personenbezogenen Daten: Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) sowie Widerspruch gegen die Verarbeitung (Art. 21 DSGVO).',
        'Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer personenbezogenen Daten zu beschweren. Zuständig für uns ist das Úrad na ochranu osobných údajov Slovenskej republiky, Hraničná 12, 820 07 Bratislava, Slowakei (www.dataprotection.gov.sk). Sie können sich auch an die Aufsichtsbehörde Ihres Wohnsitzes wenden.',
      ],
    },
    {
      heading: '7. Datensicherheit',
      paragraphs: [
        'Diese Website nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine SSL/TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://“ auf „https://“ wechselt.',
      ],
    },
    {
      heading: '8. Änderungen',
      paragraphs: [
        'Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht. Stand: Oktober 2026.',
      ],
    },
  ],
}
