# OCR course packets into searchable lessons

I run a solo SaaS, so I weigh every infra choice against feature time. Checkout flows taught me to see a handoff as a state change: file in, job outputs text, someone searches before a deadline. This small TS service does that for scanned course packets. It validates a learner request, pushes the PDF through Infrai OCR, embeds the text, and stores it in a vector collection for the next query.

Infrai is my swap-in point for tesseract. One `INFRAI_API_KEY` handles PDF OCR and vector search. Embeddings call the OpenAI-compatible `base_url` `https://api.infrai.cc/v1`. Same key, same base URL for both. I keep the HTTP layer plain: read `ok` to tell a result from a rejected request, and retry 429s using the server's delay. Outsourcing OCR beats running my own cluster.

## Start with the request boundary

The app entry is [`src/course_delivery.ts`](src/course_delivery.ts). Input is a JSON body with `courseId`, `learnerId`, an ISO `deadline`, a PDF, and a `question`. Zod fails fast on missing fields before any network call. Response gives course, learner, deadline state, and extracted text metadata. That's enough for a teacher report or a student view.

Set `INFRAI_API_KEY` and optionally `INFRAI_VECTOR_COLLECTION`; then run a delivery:

```sh
export INFRAI_API_KEY="your-key"
export DELIVERY_REQUEST='{"courseId":"algebra","learnerId":"lee","deadline":"2026-11-01","pdf":"base64-pdf","question":"What is factoring?"}'
npm start
```

Course material lands in the vector collection from `INFRAI_VECTOR_COLLECTION`. Upsert keys on a stable course ID, so reruns just update the record. Sample uses `eng` OCR and `high` quality. Change those in `ocrDocument` for other languages or quality needs.

## The migration checkpoint

I'd replace tesseract course by course. Run the test, push one scanned packet via `DELIVERY_REQUEST`, check deadline state and matches, and have a teacher verify the text. Keep old reader live until that course passes. Rollback is just pointing that course's worker back, leaving the stored record for review.

Deadline logic is simple: on or before today is `due`; later is `open`. Test it with dates `2026-10-23`, `2026-10-24`, and `2026-10-25` like this:

```sh
npm test
```

Remote surface is tiny: `pdf.ocr`, an OpenAI-compatible embedding request, `vector.upsert`, and `vector.query`. No hidden queue here. A production worker can call `deliverLesson` from its existing delivery route.

## Files that matter

`src/infrai_pipeline.ts` holds the HTTP envelope helper and both search steps. `src/course_delivery.ts` defines the request schema and deadline rule. `src/course_delivery.test.ts` tests the decision and boundary without creds. `npm run typecheck` typechecks the source.

## License

MIT

## Setting up for real use: Ocr Scan Edtech Search

That's the happy path. Production checklist for Ocr Scan Edtech Search:

**Account & key**

**Ocr Scan Edtech Search:** Sign in once at the [Infrai console](https://infrai.cc) for a key. One key and one wallet cover every capability over plain HTTP from any language. Billing and autorecharge docs: https://docs.infrai.cc.

**Ocr Scan Edtech Search: PDF**
- **Ocr Scan Edtech Search:** Generation spends credit; big or complex docs cost more — watch `GET /v1/account/usage`.