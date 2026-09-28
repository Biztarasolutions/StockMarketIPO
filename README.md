# Stock Investment Plan

IPO analytics dashboard for GMP, subscription and listing performance.

## Run

```bash
npm install
npm run dev
```

## Netlify

Connect this repository to Netlify. The app is configured for Netlify Functions.

Data sources are accessed through `/api/ipo-data`; source adapters should be implemented server-side because some public sites block browser scraping.

> GMP is unofficial and may change frequently. Subscription figures are live/intraday and may change until the issue closes. Information is for informational purposes only and is not investment advice.
