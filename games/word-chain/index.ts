import { escapeText, sendMessage } from "../../telegram/lib.ts";
import type {
  ActiveWordChainGames,
  TelegramMessage,
  WordChainGame,
} from "../../types.ts";
import { checkSpell } from "./spell-checker.ts";

const activeWCGames: ActiveWordChainGames = {};

const wcPrivateChatDirPath = `${Deno.cwd()}/.data/wc/private/`;

try {
  Deno.statSync(wcPrivateChatDirPath);
} catch (_error) {
  Deno.mkdirSync(wcPrivateChatDirPath, { recursive: true });
}

const results = Deno.readDirSync(wcPrivateChatDirPath);

for (const result of results) {
  if (result.isFile && result.name.endsWith(".json")) {
    const filePath = `${wcPrivateChatDirPath}/${result.name}`;

    const content = new TextDecoder("utf-8").decode(
      Deno.readFileSync(filePath),
    );

    const data = JSON.parse(content);

    if (data.currentWordMinLength || data.currentStartingLetter) {
      activeWCGames[result.name.replace(".json", "")] = data;
    }
  }
}

console.log(activeWCGames);

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

  // handle only private chat below
  if (message.chat.type !== "private") {
    return;
  }

  if (
    content.startsWith("wc.start ") ||
    content.startsWith("/start_word_chain")
  ) {
    const maxLives = 3;

    const game: WordChainGame = {
      bannedLetters: [],
      currentStartingLetter: String.fromCodePoint(
        Math.floor(
          Math.random() * ("z".charCodeAt(0) - "a".charCodeAt(0) + 1),
        ) + "a".charCodeAt(0),
      ),
      currentUser: message.from,
      currentWordMinLength: 3,
      gameStartedAt: new Date(),
      joinable: false,
      longestWord: "",
      longestWordUser: message.from,
      maxLives,
      mode: "Me vs Bot",
      playerLives: {
        [message.from.id]: maxLives,
      },
      reduce: false,
      roundIndex: 0,
      score: {
        [message.from.id]: 0,
      },
      shouldAddBannedLetter: false,
      usedWords: [],
      users: [message.from],
    };

    activeWCGames[message.chat.id] = game;

    console.log(activeWCGames);

    const buildHeadersText = (words: string[]) => {
      return words.map((w) => `__${w}__`).join(" ".repeat(10));
    };

    const buildDataText = (words: (string | number)[]) => {
      const spaceDiff = headersText.length - words.join("").length;
      return words.map((w) => `${w}${" ".repeat(spaceDiff)}`).join("");
    };

    let headersText = buildHeadersText(["Max Lives", "Mode"]);

    let data = [game.maxLives.toString(), game.mode];

    let response = await sendMessage({
      chat_id: message.chat.id,
      text: escapeText(
        `*Word-Chain Game Started!*\n\n${headersText}\n${buildDataText(data)}`,
      ),
      // reply_to_message_id: message.message_id,
      parse_mode: "MarkdownV2",
    });

    console.log(await response.text());

    headersText = buildHeadersText(["First Letter", "Minimum Word Length"]);

    data = [
      game.currentStartingLetter.toUpperCase(),
      game.currentWordMinLength.toString(),
    ];

    response = await sendMessage({
      chat_id: message.chat.id,
      text: escapeText(
        `*Send an English word following the criteria below.*\n\n${headersText}\n${buildDataText(
          data,
        )}`,
      ),
      // reply_to_message_id: message.message_id,
      parse_mode: "MarkdownV2",
    });

    console.log(await response.text());
  }
};
