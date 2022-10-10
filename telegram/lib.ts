import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import type { TelegramMessageRequest } from "../types.ts";

const token = Deno.env.get("LITERALLY_BOT_TOKEN");

if (!token) {
  console.log("> Set LITERALLY_BOT_TOKEN env variable.");
  Deno.exit(1);
}

export const tgAPIBaseURL = `https://api.telegram.org/bot${token}`;

export const sendMessage = (messageRequest: TelegramMessageRequest) => {
  return fetch(`${tgAPIBaseURL}/sendMessage`, {
    method: "POST",
    body: JSON.stringify(messageRequest),
    headers: {
      "content-type": "application/json",
    },
  });
};

export const escapeText = (text: string) => {
  const chars = [
    // "_",
    // "*",
    "[",
    "]",
    "(",
    ")",
    // "~",
    "`",
    ">",
    "#",
    "+",
    "-",
    "=",
    "|",
    "{",
    "}",
    ".",
    "!",
  ];

  for (const c of chars) {
    text = text.replaceAll(c, `\\${c}`);
  }

  return text;
};
