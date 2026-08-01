# CIA-114 Infobip WhatsApp Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing Twilio WhatsApp transport with Infobip for 24-hour appointment reminders and confirmation/cancellation replies.

**Architecture:** The Supabase scheduler and `citas` lifecycle remain unchanged. A small provider-neutral payload helper builds Infobip's template request, the reminders Edge Function submits it to Infobip, and the webhook parses Infobip's JSON envelope after a bearer-secret check. Existing message identifiers retain idempotent database updates.

**Tech Stack:** Supabase Edge Functions (Deno), Supabase JS, Fetch API, Jest, Infobip WhatsApp API.

---

### Task 1: Define the Infobip request contract in tested helpers

**Files:**

- Modify: `src/utils/whatsapp-reminders.js`
- Modify: `src/utils/whatsapp-reminders.test.js`

- [ ] **Step 1: Write the failing payload test**

Add this test to `src/utils/whatsapp-reminders.test.js`:

```js
test("construye el payload de plantilla Utility de Infobip", () => {
  expect(construirPayloadTemplateInfobip({
    from: "5213221234567",
    to: "5213227654321",
    templateName: "recordatorio_cita",
    language: "es_MX",
    fechaEstudio: "2026-06-24 13:50:00",
  })).toEqual({
    messages: [{
      from: "5213221234567",
      to: "5213227654321",
      content: {
        templateName: "recordatorio_cita",
        templateData: {
          body: { placeholders: ["24/6", "13:50"] },
          buttons: [
            { type: "QUICK_REPLY", parameter: "confirmar_cita" },
            { type: "QUICK_REPLY", parameter: "cancelar_cita" },
          ],
        },
        language: "es_MX",
      },
    }],
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- --runInBand src/utils/whatsapp-reminders.test.js`

Expected: FAIL because `construirPayloadTemplateInfobip` is not exported.

- [ ] **Step 3: Implement the minimal payload helper**

Replace the Twilio-specific `whatsapp:` result in `normalizarTelefonoWhatsapp` with bare E.164 digits and add:

```js
export const construirPayloadTemplateInfobip = ({ from, to, templateName, language, fechaEstudio }) => ({
  messages: [{
    from,
    to,
    content: {
      templateName,
      templateData: {
        body: { placeholders: Object.values(construirVariablesTemplateRecordatorio(fechaEstudio)) },
        buttons: [
          { type: "QUICK_REPLY", parameter: "confirmar_cita" },
          { type: "QUICK_REPLY", parameter: "cancelar_cita" },
        ],
      },
      language,
    },
  }],
});
```

Update the existing normalisation expectations to `5213221234567` rather than a Twilio `whatsapp:+` address.

- [ ] **Step 4: Run the focused helper test**

Run: `npm test -- --runInBand src/utils/whatsapp-reminders.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the helper contract**

```bash
git add src/utils/whatsapp-reminders.js src/utils/whatsapp-reminders.test.js
git commit -m "test: define Infobip reminder template payload"
```

### Task 2: Switch scheduled reminders to Infobip

**Files:**

- Modify: `supabase/functions/whatsapp-reminders/index.ts`
- Modify: `supabase/functions/whatsapp-reminders/README.md`

- [ ] **Step 1: Add a failing pure-logic test for the status identifier**

Extend the Task 1 test with an Infobip response fixture:

```js
expect(obtenerIdMensajeInfobip({ messages: [{ messageId: "infobip-123" }] }))
  .toBe("infobip-123");
expect(obtenerIdMensajeInfobip({ messages: [] })).toBeNull();
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- --runInBand src/utils/whatsapp-reminders.test.js`

Expected: FAIL because `obtenerIdMensajeInfobip` is not exported.

- [ ] **Step 3: Implement and use Infobip transport**

In the Edge Function replace `enviarWhatsappTwilio` and all `TWILIO_*` reads with:

```ts
const infobipBaseUrl = Deno.env.get("INFOBIP_BASE_URL");
const infobipApiKey = Deno.env.get("INFOBIP_API_KEY");
const infobipWhatsappFrom = Deno.env.get("INFOBIP_WHATSAPP_FROM");
const infobipTemplateName = Deno.env.get("INFOBIP_TEMPLATE_NAME");
const infobipTemplateLanguage = Deno.env.get("INFOBIP_TEMPLATE_LANGUAGE") || "es_MX";
```

Send `POST ${infobipBaseUrl}/whatsapp/1/message/template` with `Authorization: App <API key>` and the Task 1 JSON payload. Store `messages[0].messageId` in `whatsapp_recordatorio_sid`; do not mark a reminder sent if it is absent. Keep the existing query, state updates, scheduling secret and no-phone behaviour unchanged.

Document only the new `INFOBIP_*` secrets, template requirements, deployment command and five-minute cron request in `supabase/functions/whatsapp-reminders/README.md`.

- [ ] **Step 4: Run tests and static checks**

Run: `npm test -- --runInBand src/utils/whatsapp-reminders.test.js && npm run lint`

Expected: all focused tests pass and ESLint exits 0.

- [ ] **Step 5: Commit the scheduled transport change**

```bash
git add supabase/functions/whatsapp-reminders/index.ts supabase/functions/whatsapp-reminders/README.md src/utils/whatsapp-reminders.js src/utils/whatsapp-reminders.test.js
git commit -m "feat: send appointment reminders with Infobip"
```

### Task 3: Parse and authenticate Infobip inbound responses

**Files:**

- Modify: `src/utils/whatsapp-webhook.js`
- Modify: `src/utils/whatsapp-webhook.test.js`
- Modify: `supabase/functions/whatsapp-webhook/index.ts`
- Delete: `supabase/functions/_shared/twilio-signature.js`
- Delete: `src/utils/twilio-signature.test.js`

- [ ] **Step 1: Write failing parser tests**

Add tests for an Infobip inbound envelope:

```js
const inbound = {
  results: [{
    from: "5213221939613",
    messageId: "inbound-123",
    message: { type: "INTERACTIVE", interactive: { type: "BUTTON_REPLY", buttonReply: { id: "confirmar_cita" } } },
  }],
};
expect(extraerRespuestaInfobip(inbound)).toEqual({
  telefono: "3221939613", messageId: "inbound-123", buttonPayload: "confirmar_cita", body: null,
});
expect(extraerRespuestaInfobip({ results: [] })).toBeNull();
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- --runInBand src/utils/whatsapp-webhook.test.js`

Expected: FAIL because `extraerRespuestaInfobip` is not exported.

- [ ] **Step 3: Implement parsing and authorization**

Implement `extraerRespuestaInfobip` in `src/utils/whatsapp-webhook.js`, accepting `TEXT` (`message.text`) and interactive button reply IDs. In the Edge Function:

```ts
const webhookSecret = Deno.env.get("INFOBIP_WEBHOOK_SECRET");
if (!esSecretoBearerValido(req.headers.get("Authorization"), webhookSecret || "")) {
  return new Response(null, { status: 403 });
}
const inbound = await req.json();
const respuesta = extraerRespuestaInfobip(inbound, codigoPais);
```

Remove Twilio form parsing, TwiML responses and signature validation. Preserve the `citas` selection predicates, atomic `whatsapp_respuesta_sid` guard, confirmed/cancelled state transitions and safe empty 200 response for an unsupported payload. Delete the Twilio signature helper and its test because no code uses it.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --runInBand src/utils/whatsapp-webhook.test.js src/utils/request-auth.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the inbound migration**

```bash
git add src/utils/whatsapp-webhook.js src/utils/whatsapp-webhook.test.js supabase/functions/whatsapp-webhook/index.ts supabase/functions/_shared/twilio-signature.js src/utils/twilio-signature.test.js
git commit -m "feat: process Infobip WhatsApp confirmations"
```

### Task 4: Complete operational documentation and regression verification

**Files:**

- Modify: `supabase/functions/whatsapp-webhook/README.md`
- Modify: `README.md`
- Modify: `docs/operations/access-control.md`

- [ ] **Step 1: Document the production setup**

Replace Twilio references with Infobip in the webhook README and access-control guide. Specify the public HTTPS endpoint, `Authorization: Bearer <INFOBIP_WEBHOOK_SECRET>` header, `INBOUND_MESSAGE` subscription, API-key scope `whatsapp:message:send`, and the explicit prohibition on frontend secrets. Change README staging guidance to require an Infobip trial/shared sender or no WhatsApp secrets.

- [ ] **Step 2: Verify no runtime Twilio dependency remains**

Run: `rg -n "TWILIO_|Twilio|twilio-signature" README.md docs supabase src`

Expected: no runtime configuration, provider documentation or imported helper references; only historical documents may be excluded deliberately.

- [ ] **Step 3: Run the complete verification suite**

Run: `npm test -- --runInBand && npm run lint && npm run build`

Expected: Jest, ESLint and Vite build all exit 0.

- [ ] **Step 4: Commit documentation and final verification result**

```bash
git add README.md docs/operations/access-control.md supabase/functions/whatsapp-webhook/README.md
git commit -m "docs: configure Infobip WhatsApp reminders"
git status --short
```

Expected: no unintended working-tree changes.

