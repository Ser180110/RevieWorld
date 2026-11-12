# RevieWorld

Recensisci qualsiasi cosa, in categorie create dagli utenti: se la categoria esiste ti ci aggreghi, se no la crei.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS 4), deploy su Vercel
- **Supabase**: PostgreSQL, login, storage delle foto
- **Drizzle ORM** per schema e migrazioni
- **Italiano e inglese**: URL `/it/...` e `/en/...`, dizionari in `src/i18n/dictionaries/`

## Primo avvio in locale

1. Installa Node.js 22 o più recente.
2. Installa le dipendenze:
   ```bash
   npm install
   ```
3. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```
   Apri http://localhost:3000: verrai mandato a `/it` o `/en` in base alla lingua del browser.

La pagina iniziale funziona anche senza Supabase. Il database serve dal primo passo in cui si salvano dati.

## Collegare Supabase

1. Crea un progetto su [supabase.com](https://supabase.com), regione **Central EU (Frankfurt)**.
2. Copia `.env.example` in `.env.local` e riempi i valori (URL, chiave anon, stringhe di connessione).
3. Applica le migrazioni al database:
   ```bash
   npm run db:migrate
   ```
4. In Supabase, **Authentication → URL Configuration**: imposta Site URL a `http://localhost:3000` e aggiungi `http://localhost:3000/**` tra i Redirect URLs (più avanti anche l'indirizzo pubblico).
5. Avvia `npm run dev`, apri `/it/signup` e registrati. Riceverai un'email di conferma: il link ti riporta nell'app già connesso.
   Per provare più in fretta puoi disattivare la conferma in **Authentication → Sign In / Providers → Email → Confirm email**.
6. Per diventare admin, dopo esserti registrato nell'app, esegui nel SQL editor di Supabase:
   ```sql
   update profiles set role = 'admin' where username = 'iltuousername';
   ```

## Mettere online (gratis, su Vercel)

1. Su [vercel.com](https://vercel.com) registrati con GitHub (piano **Hobby**, gratuito, senza carta).
2. **Add New → Project**, importa il repository `RevieWorld`.
3. In **Environment Variables** aggiungi solo:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

   Non serve `DATABASE_URL`: il sito non si collega direttamente al database (la password resta solo sul tuo PC).
4. **Deploy**. Ottieni un indirizzo tipo `https://revieworld-xxx.vercel.app`.
5. Su Supabase, **Authentication → URL Configuration**:
   - **Site URL**: l'indirizzo Vercel
   - **Redirect URLs**: aggiungi `https://revieworld-xxx.vercel.app/**` (lascia anche `http://localhost:3000/**`)
6. Ogni volta che qualcosa finisce su `main`, Vercel ripubblica da solo.

Le migrazioni (`npm run db:migrate`) si lanciano sempre dal tuo PC: il database è lo stesso per locale e online.

## Struttura

```
src/
  app/[lang]/          pagine, una cartella per lingua tramite il parametro [lang]
  components/          componenti condivisi (es. selettore lingua)
  i18n/                lingue supportate e dizionari it/en
  lib/supabase/        client Supabase per browser, server e proxy
  lib/normalize.ts     normalizzazione dei nomi contro i duplicati
  db/schema.ts         schema del database (Drizzle)
  lib/auth/            azioni di accesso, registrazione e uscita
  proxy.ts             reindirizzamento alla lingua + rinnovo della sessione
drizzle/
  0000_init.sql        tabelle generate dallo schema
  0001_rules.sql       regole scritte a mano: sicurezza (RLS), contatori, ricerca simili, storage foto
  0002_grants.sql      permessi espliciti per l'API di Supabase
```

## Database

Catena principale: **categorie → oggetti → recensioni**.

| Tabella | A cosa serve |
| --- | --- |
| `profiles` | Profilo pubblico, creato in automatico alla registrazione |
| `categories` | Categorie create dagli utenti, con contatori di oggetti, recensioni e follower |
| `category_aliases` | Altri nomi della stessa categoria (es. "chiusini" → "Tombini") |
| `items` | Le cose recensite, con media voti |
| `reviews` | Voto 1–10 (mezze stelle), testo, una per utente e oggetto |
| `review_photos` | Fino a 4 foto per recensione |
| `category_follows` | "Mi aggrego alla categoria" |
| `user_follows` | Utenti seguiti |
| `reports` | Segnalazioni per la moderazione |

Regole principali:

- **Duplicati**: `normalized_name` è unico, quindi "Tombini" e "tombini!" non possono essere due categorie. Le funzioni `suggest_categories(q)` e `suggest_items(cat, q)` trovano nomi simili (pg_trgm) mentre l'utente scrive.
- **Sicurezza**: tutti possono leggere; per scrivere serve il login; ognuno modifica solo le proprie righe. Solo moderatori e admin possono modificare o nascondere categorie e oggetti.
- **Contatori**: medie e conteggi si aggiornano da soli con trigger.
- **Chi crea una categoria la segue in automatico.**

Per modificare lo schema: cambia `src/db/schema.ts`, poi `npm run db:generate` e `npm run db:migrate`.

## Comandi

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | Server di sviluppo |
| `npm run build` | Build di produzione |
| `npm run lint` | Controllo del codice |
| `npm run typecheck` | Controllo dei tipi TypeScript |
| `npm run db:generate` | Crea una migrazione dai cambi allo schema |
| `npm run db:migrate` | Applica le migrazioni al database |
| `npm run db:studio` | Interfaccia web per vedere i dati |
