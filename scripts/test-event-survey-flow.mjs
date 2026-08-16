const cdpPort = process.env.BECKY_CDP_PORT || "9223";
const targets = await fetch(`http://127.0.0.1:${cdpPort}/json`).then((response) =>
  response.json(),
);
const page = targets.find(
  (target) =>
    target.type === "page" && target.url.includes("chestionar-evenimente"),
);
if (!page) throw new Error("Questionnaire page not found in Chrome");

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let callId = 0;
const errors = [];

process.on("uncaughtException", (error) => {
  console.error(error);
  socket.close();
  setTimeout(() => process.exit(1), 0);
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails.text);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function command(method, params = {}) {
  const id = ++callId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.text || "Evaluation failed");
  return result.result.value;
}

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitFor(expression, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await pause(80);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

const click = (selector, index = 0) =>
  evaluate(
    `document.querySelectorAll(${JSON.stringify(selector)})[${index}]?.click()`,
  );
const next = () => click("[data-next]");

await command("Runtime.enable");
await command("Page.enable");
await command("Page.reload", { ignoreCache: true });
await waitFor("typeof state !== 'undefined' && state.step === 0");
const initialProgress = await evaluate(
  `({inline: document.querySelector('#progressFill').style.width, pixels: getComputedStyle(document.querySelector('#progressFill')).width})`,
);
if (initialProgress.inline !== "0%")
  throw new Error(`Initial progress is not zero: ${initialProgress.inline}`);

await next();
await click('input[name="childCount"]');
await next();
await click('input[name="childAges"]');
await next();
await click('input[name="motivation"]', 0);
await click('input[name="motivation"]', 1);
await next();
await click('[data-rank-group="worth"] .rank-choice', 0);
await click('[data-rank-group="worth"] .rank-choice', 1);
await click('[data-rank-group="worth"] .rank-choice', 2);
await next();
await waitFor("state.milestone === 1");
await next();
await click('[data-rank-group="blockers"] .rank-choice', 0);
await click('[data-rank-group="blockers"] .rank-choice', 1);
await next();
await click('input[name="weekdays"]', 0);
await click('input[name="weekdays"]', 1);
await click('input[name="weekdays"]', 5);
if (
  (await evaluate(
    `[...document.querySelectorAll('input[name="weekdays"]:checked')].map(input => input.value).join('|')`,
  )) !== "Niciuna dintre aceste zile"
)
  throw new Error("The unavailable weekday option is not exclusive");
await click('input[name="weekdays"]', 0);
await click('input[name="weekdays"]', 1);
await next();
await click('input[name="startTime"]', 0);
await click('input[name="startTime"]', 1);
await click('input[name="eventDuration"]', 1);
await next();
await click('input[name="desiredOutcomes"]', 0);
await click('input[name="desiredOutcomes"]', 1);
await next();
await waitFor("state.milestone === 2");
await next();
await next();
await waitFor("state.step === 10");

await click("[data-pick]", 0);
await pause(600);
await click("[data-back]");
await waitFor("Boolean(document.querySelector('#duelBackNotice'))");
await click("[data-leave-duel]");
await waitFor("state.step === 9 && state.duels.length === 1");
await next();
await waitFor("state.step === 10 && state.duels.length === 1");

for (let round = 1; round < 7; round += 1) {
  await waitFor(
    `[...document.querySelectorAll('[data-pick]')].length === 2 && [...document.querySelectorAll('[data-pick]')].every(button => !button.disabled)`,
  );
  await click("[data-pick]", round % 2);
  await waitFor(`state.duels.length === ${round + 1}`);
  await pause(420);
}
await waitFor("state.step === 11 && state.duels.length === 7");

await click("[data-back]");
await waitFor("state.step === 9 && state.duels.length === 7");
await next();
await waitFor("state.step === 11 && state.duels.length === 7");
await next();
await waitFor("state.step === 12");
await click("[data-submit]");
await waitFor("state.step === 13", 8000);

if (errors.length) throw new Error(`Browser exceptions: ${errors.join("; ")}`);
console.log(
  JSON.stringify(
    {
      initialProgress,
      finalStep: await evaluate("state.step"),
      duelAnswers: await evaluate("state.duels.length"),
      conceptRanking: await evaluate("state.conceptRanking.length"),
    },
    null,
    2,
  ),
);
socket.close();
