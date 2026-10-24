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

## Telegram direction

Telegram should be the next delivery channel, not a second task-management
backend. The existing normalized ingress in `src/server/agent.ts` is the seam
for a Telegram adapter:

1. Receive a Telegram update through a webhook.
2. Authenticate the webhook and map the Telegram chat/user to a Jeera user.
3. Convert the message into `{ userId, body, submissionKey, channel,
   conversationKey, externalMessageId }`.
4. Call the shared agent ingress so interpretation, task permissions,
   dependency handling, and review-before-apply remain unchanged.
5. Send the agent response back to the same Telegram conversation.

The bot token, webhook URL, Telegram identity mapping, and deployment target
are not committed here. For the first demo, keep the web Agent as the
canonical conversation and use Telegram only as an adapter once those values
are configured.

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
