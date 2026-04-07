# D212 Asistent Fiscal - Istoric versiuni

## v2.0.0 (2026-03-29)

### Principal
- Aplicația redenumită din „ANAF Panou Financiar" în „D212 Asistent Fiscal"
- Tab-ul Calcul Impozite reproiectat cu 3 secțiuni: Ce am câștigat / Ce s-a plătit deja / Ce mai am de plătit
- Suport cote impozitare 2026 (16% impozit venit, 3%/6% câștiguri XTB)
- Calculul CASS folosește dividende și dobânzi nete (validat cu studiu de caz)
- Costul de achiziție ESPP dedus din câștiguri de capital
- Capitolul II (opțiune CASS) marcat opțional pentru D212/2025+, cu verificare prag
- Import formular 1042-S (IRS) cu deduplicare după identificator unic
- 1042-S are prioritate față de Investment Report pentru dividende

### Funcționalități
- Câmp termen depunere D212 (calendar, per an, editabil)
- Termenul afișat în tabelul impozite și secțiunea CASS
- Tabel referință metode calcul câștiguri de capital (4 scenarii)
- Pași detaliați calcul dividende în asistentul D212
- Lista tipuri venituri CASS, termen plată, notă CAS nu se aplică
- Parsare venituri din jocuri de noroc din adeverința ANAF
- OCR fallback pentru PDF-uri scanate/imagine
- Detectare calitate OCR cu solicitare introducere manuală
- Sistem de loguri (folder logs/ cu fișiere zilnice)
- Cote XTB configurabile (citite din cotele salvate)
- Layout-uri grilă formulare (2/3 coloane responsive)
- Butoanele Salvează afișează anul selectat
- Banner an în afara cardurilor ca titlu secțiune
- Footer sticky similar cu header-ul
- Buton „Înapoi sus" poziționat deasupra footer-ului
- Versiune aplicație în footer cu istoric versiuni

### Îmbunătățiri
- Chart.js folosește .update() în loc de distruge/recreează (performanță)
- Culorile graficelor citite din variabile CSS (consistență temă)
- computeYearData() memorizat cu invalidare cache pe bază de versiune
- Formatare numere conform limbii selectate (ro-RO / en-US)
- Handler redimensionare cu debounce (150ms) pentru fluiditate
- Controale formular dezactivate în timpul încărcării fișierelor
- Notificare toast la eroare încărcare date
- Repornirea serverului creează proces nou înainte de oprire (auto-recuperare)
- PORT configurabil prin variabilă de mediu

### Accesibilitate
- Buton meniu hamburger: aria-label adăugat
- Canvas grafice: aria-label adăugat
- Selectoare din header: etichete sr-only pentru cititoare de ecran
- Butoane navigare: contur focus-visible
- Clasă utilitară .sr-only adăugată

### i18n
- Toate cele 321 chei echilibrate între EN și RO
- Numele aplicației din footer traductibil (D212 Tax Helper / D212 Asistent Fiscal)

---

## v1.0.0 (2026-03-24)

### Versiune inițială
- Panou principal cu 4 carduri sumar și 4 grafice
- Tab Detalii Venituri (dividende Fidelity, câștiguri capital, tranzacții XTB)
- Tab Calcul Impozite cu sistem CASS pe paliere (2023-2025)
- Asistent D212 (Capitolul I: venituri din străinătate, XTB, CASS, sumar obligații)
- D212 Capitolul II: opțiune plată CASS
- Tab Adaugă Date cu formulare de introducere manuală
- Tab Import Document (încărcare PDF/imagine cu OCR)
- Tab Date Brute (vizualizare/editare/ștergere text extras)
- Tipuri documente: declarație, raport investiții, adeverință venit, stock award, confirmare tranzacție, dividende XTB, portofoliu XTB, extras Fidelity
- Deduplicare confirmări tranzacție după număr referință
- Rețineri acțiuni din documente salariale
- Suport bilingv (RO/EN) cu sistem i18n
- Temă întunecată cu variabile CSS
- Design responsiv cu meniu hamburger
- Grafice comparație anuală
- Grafic cursuri de schimb (date BNR)
- Versiune portabilă cu Node.js inclus
