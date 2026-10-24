# Jeera demo runbook

This runbook creates a realistic team-delivery scenario for the execution
agent. It is intentionally fake data and is safe to run repeatedly: it creates
or refreshes the dedicated `Landing Page Launch — Execution Demo` project
without deleting other projects.

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
| Joji | Project owner; building the landing page and publishing the launch |
| George | Adding the signup form and launch analytics |
| Vaishakh | Testing the landing page on staging |
| Jaice | Writing and handing off the launch copy |

## Demo story

The project contains six simple tasks with a connected dependency chain:

- Jaice's **Write the landing page copy** is done with completion details.
- Joji is building the **landing page**.
- George's **Add the signup form** waits on Joji's landing page.
- Vaishakh's **QA the landing page on staging** waits on George's signup form.
- Joji's **Publish the launch** waits on Vaishakh's QA sign-off.
- George owns **Set up basic launch analytics**.

Try these messages as Joji:

```text
What is George doing on the signup form?
```

Expected result: Jeera answers from George's recorded evidence and shows that
the signup form is waiting on Joji.

```text
What is blocked?
```

Expected result: Jeera shows the signup form, staging QA, and publishing as a
connected chain of work waiting on Joji, George, and Vaishakh respectively.

```text
Which tasks assigned to George should be prioritized for today?
```

Expected result: Jeera returns George's open work ordered by priority and due
date.

Open the project **Overview** and use **Resolve & resume** on one dependency in
the chain. The selected task moves from Blocked to In progress and both the
dependency resolution and task transition are recorded in activity history.

Finally, return to Agent and submit:

```text
The landing page is ready. I verified the responsive layout, the signup form
handoff, and the staging deployment.
```

Review the proposal, select the task update, and apply it. The completion note
appears on the task and in its history.

## Five-minute team check-ins

For a real demo, run this in a separate terminal alongside Next.js:

```bash
npm run agent:worker
```

The worker checks every project membership every five minutes, even when no
browser is open. It uses a PostgreSQL advisory lock so two worker copies do
not compete, and the database dedupe key makes retries safe. For cron or a
platform scheduled job, use the one-shot command instead:

```bash
npm run agent:follow-ups
```

The Agent page still runs a sweep immediately on open and every five minutes
as a local browser fallback. If an assigned person has no recent evidence,
Jeera writes a deduplicated check-in to that person's Agent conversation:

```text
Checking in, George: “Add the signup form” has had no update for about 40 minutes. It is still waiting on Joji. What changed, what is blocked, or is it ready to close?
```

Switch the demo identity to George or Vaishakh to show their check-in in their
own conversation. The worker currently records web Agent messages; Telegram
delivery and quiet hours are separate follow-up policy work.

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

`npm run db:seed:demo` resets only the dedicated demo project and its seeded
tasks, evidence, activity, and agent messages. It does not delete other
projects or users. Use a separate local database if you want a completely
clean demo environment:

```bash
createdb jeera_demo
DATABASE_URL=postgresql://YOUR_USER@localhost:5432/jeera_demo npm run db:migrate
DATABASE_URL=postgresql://YOUR_USER@localhost:5432/jeera_demo npm run db:seed
DATABASE_URL=postgresql://YOUR_USER@localhost:5432/jeera_demo npm run db:seed:demo
```
