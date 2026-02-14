# LoyaltyApp - System Zarządzania Kartami Stałego Klienta

Responsywna aplikacja webowa B2B do zarządzania kartami lojalnościowymi z architekturą multi-tenant.

## Stack Technologiczny

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API Routes
- **Baza danych:** PostgreSQL z Prisma ORM
- **Autentykacja:** NextAuth.js (Credentials dla firm, Magic Link dla klientów)
- **Kody:** QR Code + Barcode generation

## Funkcjonalności

### Panel B2B (Firmy/Sklepy)
- Dashboard ze statystykami i wykresami
- Zarządzanie kartami klientów (CRUD + QR/barcode)
- Zarządzanie transakcjami (zakupy, zwroty, korekty ręczne)
- Wielopoziomowe progi rabatowe
- Promocje okresowe z kodami rabatowymi
- Eksport danych do CSV
- Dark mode + wielojęzyczność (PL/EN)

### Portal Klienta
- Logowanie przez Magic Link (email)
- Podgląd punktów i aktualnego rabatu
- Progress bar do następnego progu
- QR kod karty do skanowania
- Historia transakcji
- Aktualne promocje

## Uruchomienie

```bash
# Instalacja zależności
npm install

# Konfiguracja zmiennych środowiskowych
cp .env.example .env
# Edytuj .env i ustaw DATABASE_URL

# Generowanie klienta Prisma
npx prisma generate

# Migracja bazy danych
npx prisma migrate dev --name init

# Uruchomienie serwera deweloperskiego
npm run dev
```

Aplikacja będzie dostępna pod adresem [http://localhost:3000](http://localhost:3000).

## Struktura Projektu

```
src/
├── app/
│   ├── api/           # API Routes (auth, cards, transactions, tiers, promotions, export)
│   ├── (auth)/        # Strony logowania i rejestracji
│   ├── dashboard/     # Panel B2B
│   └── customer/      # Portal klienta
├── components/
│   ├── ui/            # shadcn/ui components
│   ├── providers.tsx  # Context providers (theme, locale, session)
│   ├── dashboard-sidebar.tsx
│   └── toaster.tsx
├── hooks/
│   └── use-toast.ts
├── lib/
│   ├── auth.ts        # NextAuth configuration
│   ├── i18n.ts        # Internationalization (PL/EN)
│   ├── prisma.ts      # Prisma client singleton
│   └── utils.ts       # Utility functions
└── prisma/
    └── schema.prisma  # Database schema
```

## Model Danych

- **Company** - firma/sklep (multi-tenant)
- **User** - pracownicy firmy
- **LoyaltyCard** - karty klientów
- **Transaction** - transakcje (zakupy, zwroty, korekty)
- **DiscountTier** - progi rabatowe
- **Promotion** - promocje okresowe
- **MagicLink** - tokeny logowania klientów
