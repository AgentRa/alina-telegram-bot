# 🇵🇱 Telegram Bot dla Nauczyciela Polskiego

Profesjonalny bot Telegram dla umówienia lekcji polskiego języka online z certyfikowaną nauczycielką.

## ✨ Funkcje

### 📚 **Typy lekcji:**
- 🟢 **Początkujący (A1-A2)** - 60 zł/60 min
- 🟡 **Średniozaawansowany (B1-B2)** - 70 zł/60 min  
- 🔴 **Zaawansowany (C1-C2)** - 80 zł/60 min
- 💬 **Konwersacje** - 65 zł/60 min
- 💼 **Polski biznesowy** - 85 zł/60 min
- 📝 **Przygotowanie do egzaminów** - 90 zł/90 min

### 🎯 **Główne możliwości:**
- ✅ Łatwa rezerwacja online
- 📅 Inteligentny system terminów
- 📧 Automatyczne potwierdzenia
- 📱 Friendly interface z inline keyboards
- 🔄 Zarządzanie rezerwacjami
- 📞 Kontakt z nauczycielem

## 🚀 Instalacja i uruchomienie

### 1. Sklonuj projekt
```bash
git clone <repository>
cd polish-teacher-bot
```

### 2. Zainstaluj zależności
```bash
npm install
```

### 3. Skonfiguruj token
Skopiuj token bota z BotFather do pliku `.env`:
```
BOT_TOKEN=twój_token_bota
```

### 4. Uruchom bota
```bash
# Produkcja
npm start

# Rozwój (z auto-restart)
npm run dev

# Stary bot (schedule bot)
npm run old-bot
```

## 📱 Jak używać bota

### **Krok 1: Start**
Wyślij `/start` aby zobaczyć menu główne

### **Krok 2: Umów lekcję**
1. Kliknij "📅 Umów lekcję"
2. Wybierz rodzaj lekcji
3. Wybierz dostępny termin
4. Podaj email i telefon
5. Potwierdź rezerwację

### **Krok 3: Zarządzaj**
- 📋 **Moje rezerwacje** - zobacz swoje lekcje
- ℹ️ **Informacje** - o nauczycielu i metodach
- 📞 **Kontakt** - bezpośredni kontakt

## 🛠 Struktura projektu

```
polish-teacher-bot/
├── polish-teacher-bot.js    # Główny plik bota 
├── bot.js                   # Stary bot (schedule)
├── package.json             # Zależności
├── .env                     # Token bota
├── .gitignore              # Ignorowane pliki
└── README.md               # Dokumentacja
```

## 🌟 Funkcje zaawansowane

### **Inteligentny harmonogram**
- Pokazuje tylko dostępne terminy
- Filtruje przeszłe godziny
- Automatycznie zarządza rezerwacjami

### **Wielojęzyczna obsługa**
- 🇵🇱 Polski (główny)
- 🇬🇧 English
- 🇺🇦 Українська  
- 🇷🇺 Русский

### **Profesjonalne potwierdzenia**
- Email z szczegółami lekcji
- Link do Zoom wysyłany 24h wcześniej
- Przypomnienia o lekcjach

## 🚀 Deployment

### **Render (bezpłatny)**
1. Push kod do GitHub
2. Połącz z Render.com
3. Dodaj `BOT_TOKEN` w Environment Variables
4. Deploy automatycznie!

### **Heroku**
```bash
heroku create polish-teacher-bot
heroku config:set BOT_TOKEN=twój_token
git push heroku main
```

### **VPS/Server**
```bash
pm2 start polish-teacher-bot.js --name "polish-bot"
pm2 startup
pm2 save
```

## 📊 Przykład użycia

```
👤 Uczeń: /start
🤖 Bot: Witaj! Jestem Anna, nauczyciel polskiego...

👤 Uczeń: [Klik "Umów lekcję"]
🤖 Bot: Wybierz rodzaj lekcji...

👤 Uczeń: [Wybiera "Konwersacje"] 
🤖 Bot: Dostępne terminy dla konwersacji...

👤 Uczeń: [Wybiera "Środa 15:00"]
🤖 Bot: Podaj swój email...

👤 Uczeń: jan@example.com
🤖 Bot: Podaj numer telefonu...

👤 Uczeń: +48 123 456 789
🤖 Bot: Potwierdzenie rezerwacji...

👤 Uczeń: [Potwierdza]
🤖 Bot: 🎉 Rezerwacja potwierdzona!
```

## 🎯 Różnice od prostego schedule bot

| Funkcja | Stary Bot | Nowy Bot |
|---------|-----------|----------|
| **UI** | Podstawowe komendy | Inline keyboards |
| **Proces** | Jedno-krokowo | Multi-step wizard |
| **Dane** | Tylko tekst | Email + telefon |
| **Typy** | Jeden | 6 różnych typów lekcji |
| **Ceny** | Brak | Różne dla każdego typu |
| **Profesjonalizm** | Prosty | Pełny biznes-flow |

## 📈 Planowane rozszerzenia

- [ ] 📅 Integracja z Google Calendar
- [ ] 💳 Płatności online (Stripe/PayPal)
- [ ] 📧 Automatyczne emaile
- [ ] 📱 Przypomnienia SMS
- [ ] 🎥 Integracja z Zoom API
- [ ] 📊 Panel admina
- [ ] 🌍 Obsługa czasów stref
- [ ] 📝 System recenzji

## 👩‍🏫 O nauczycielu

**Anna Kowalska** - Certyfikowany nauczyciel języka polskiego
- 8+ lat doświadczenia w nauczaniu online
- Specjalizacja: egzaminy, biznes, konwersacje  
- Absolwentka filologii polskiej UW
- Certyfikaty: CAE, TESOL, CEF

## 📞 Support

- 📧 Email: anna.kowalska@email.com
- 📱 WhatsApp: +48 123 456 789  
- 🌐 Website: www.polskionline.pl

---
*Stworzony z ❤️ dla miłośników języka polskiego*