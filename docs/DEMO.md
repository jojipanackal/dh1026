# Jeera demo runbook

This runbook creates a realistic team-delivery scenario for the execution
agent. It is intentionally fake data and is safe to run repeatedly: it creates
or refreshes the dedicated `Kochi Metro App — Execution Demo` project without
deleting other projects.

## Prepare the demo

```bash
npm run db:migrate
npm run db:seed
npm run db:seed:demo
npm run dev
```

Open `http://localhost:3000`, choose **Joji** from the user menu, and open
**Agent**.

The seed creates these project members:

| Person | Demo role |
| --- | --- |
| Joji | Project owner; implementing the QR scanner |
| George | Working on the ticket validation API |
| Vaishakh | Testing the payment flow on staging |
| Jaice | Preparing the launch checklist |

## Demo story

The project contains six tasks:

- Joji's **Wire up QR ticket scanner** is blocked, explicitly waiting on
  George's validation contract.
- George's **Finalize ticket validation API** is in progress and has evidence
  that he was testing on staging 30 minutes ago.
- Vaishakh's **Verify staging payment flow** is in progress with a recorded
  sandbox timeout.
- Jaice owns the launch checklist.
- Joji owns the offline station-map cache.
- **Choose QR over NFC for beta** is done with completion details.

Try these messages as Joji:

```text
What is George doing on Finalize ticket validation API?
```

Expected result: Jeera answers from George's recorded evidence and shows when
it was last updated.

```text
What is blocked?
```

Expected result: Jeera shows the QR scanner and explains that it is waiting on
George.

```text
Which tasks assigned to George should be prioritized for today?
```

Expected result: Jeera returns George's open work ordered by priority and due
date.

Then open the project **Overview** and use **Resolve & resume** on the QR
scanner dependency. The task moves from Blocked to In progress and both the
dependency resolution and task transition are recorded in activity history.

Finally, return to Agent and submit:

```text
The QR scanner is done. I verified scanning, invalid-ticket handling, and the
handoff to the validation API.
```

Review the proposal, select the task update, and apply it. The completion note
appears on the task and in its history.

## Connect Telegram for the demo

The first Telegram adapter is now implemented at
`/api/telegram/webhook`. It uses the same normalized agent ingress as the web
conversation. Task questions can be answered entirely in Telegram; write
updates return a reviewable proposal and should be applied from the web Agent
until Telegram review buttons are added.

Create a bot with `@BotFather`, then set these local environment variables in
`.env.local`:

```dotenv
TELEGRAM_BOT_TOKEN=the-token-from-botfather
TELEGRAM_WEBHOOK_SECRET=a-long-random-secret
TELEGRAM_DEFAULT_USER_ID=the-Joji-user-id
TELEGRAM_ALLOWED_CHAT_ID=the-demo-chat-id
```

For the seeded demo, `TELEGRAM_DEFAULT_USER_ID` should be Joji's user id. This
single-user mapping is intentional for the first demo; it means messages in
the allowed chat are attributed to Joji. Per-person Telegram identity linking
is the next production step.

The webhook must be publicly reachable over HTTPS. After deploying the app,
set it with Telegram's official Bot API:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://YOUR_DOMAIN.example/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  -d 'allowed_updates=["message"]'
```

Check delivery with:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

Then send the bot a message such as `What is blocked?`. Telegram sends the
update to the Next.js Route Handler, Jeera records it as a Telegram journal
entry, runs the normal task/status path, and replies with `sendMessage`.

Telegram's Bot API requires HTTPS for webhook delivery and supports a
`secret_token` header for authenticating webhook requests; see the [official
Bot API webhook documentation](https://core.telegram.org/bots/api#setwebhook).

## Resetting the story

`npm run db:seed:demo` is additive and does not delete data. It restores the
known demo task fields and recreates missing dependency/evidence records. Use a
separate local database if you want a completely clean demo environment:

```bash
createdb jeera_demo
DATABASE_URL=postgresql://YOUR_USER@localhost:5432/jeera_demo npm run db:migrate
DATABASE_URL=postgresql://YOUR_USER@localhost:5432/jeera_demo npm run db:seed
DATABASE_URL=postgresql://YOUR_USER@localhost:5432/jeera_demo npm run db:seed:demo
```
