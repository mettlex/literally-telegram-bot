import { sendMessage } from "../../telegram/lib.ts";
import { TelegramMessage } from "../../types.ts";
import { checkSpell } from "./spell-checker.ts";

export const handle = async (message: TelegramMessage) => {
  if (message.from.is_bot || !message.text) {
    return;
  }

  const content = message.text.toLowerCase();

  if (
    content.startsWith("wc.check ") ||
    content.startsWith("/spellcheck ") ||
    content.startsWith("/spell_check ")
  ) {
    const lastWord = content.split(" ").slice(-1)[0];

    const correct = await checkSpell(lastWord);

    await sendMessage({
      chat_id: message.chat.id,
      text: correct ? `Correct spelling ✅` : `Incorrect spelling ❌`,
      reply_to_message_id: message.message_id,
    });
  }
};
