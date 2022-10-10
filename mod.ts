import { Application, Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";

import { TelegramMessage } from "./types.ts";
import { setup } from "./games/setup.ts";

const telegramBotWebhook = new Router().post("/", async (ctx) => {
  try {
    const webhookBody = (await ctx.request.body({ type: "json" }).value) as {
      message: TelegramMessage;
    };

    const { message } = webhookBody;

    console.log(JSON.stringify(message));

    setup(message);
  } catch (error) {
    console.log(error);
  }

  ctx.response.body = "";
});

const botWebhook = new Router().use(
  "/bot/telegram",
  telegramBotWebhook.routes(),
  telegramBotWebhook.allowedMethods(),
);

const app = new Application();

app.addEventListener("listen", (server) => {
  console.log(`> Listening at http://${server.hostname}:${server.port}`);
});

app.use(botWebhook.routes());

await app.listen({ port: parseInt(Deno.env.get("PORT") || "3000") });
