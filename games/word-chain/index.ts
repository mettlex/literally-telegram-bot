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

// todo: reboot games after restart
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

    activeWCGames[message.chat.id] = {
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
      mode: "Random Letters",
      playerLives: {
        [message.from.id]: maxLives,
      },
      reduce: false,
      roundIndex: 0,
      score: {
        [message.from.id]: 0,
      },
      shouldAddBannedLetter: false,
      turnSeconds: 30,
      initialTurnSeconds: 30,
      usedWords: [],
      users: [message.from],
    };

    const game = activeWCGames[message.chat.id]!;

    const buildHeadersText = (words: string[]) => {
      return words.map((w) => `__${w}__`).join(" ".repeat(10));
    };

    let headersText = buildHeadersText(["Max Lives", "Mode"]);

    const buildDataText = (words: (string | number)[]) => {
      const spaceDiff = headersText.length - words.join("").length;
      return words.map((w) => `${w}${" ".repeat(spaceDiff)}`).join("");
    };

    let data = [game.maxLives.toString(), game.mode];

    let response = await sendMessage({
      chat_id: message.chat.id,
      text: escapeText(
        `*Word-Chain Game Started!*\n\n${headersText}\n${buildDataText(
          data,
        )}\n\n${buildHeadersText(["Time Per Turn"])}\n${buildDataText([
          `${game.turnSeconds} seconds`,
        ])}`,
      ),
      // reply_to_message_id: message.message_id,
      parse_mode: "MarkdownV2",
    });

    console.log(await response.text());

    headersText = buildHeadersText(["First Letter", "Minimum Word Length"]);

    data = [
      game.currentStartingLetter.toUpperCase(),
      `${game.currentWordMinLength} letters`,
    ];

    response = await sendMessage({
      chat_id: message.chat.id,
      text: escapeText(
        `*Send an English word following the criteria below in ${
          game.initialTurnSeconds
        } seconds.*\n\n${headersText}\n${buildDataText(data)}`,
      ),
      // reply_to_message_id: message.message_id,
      parse_mode: "MarkdownV2",
    });

    console.log(await response.text());

    if (game.turnSeconds) {
      game.interval = setInterval(() => {
        tick({ game, message });
      }, 1200);
    }

    return;
  }

  const runningGame = activeWCGames[message.chat.id];

  // stop here if there's no running game
  if (!runningGame) {
    return;
  }

  // match game criterias

  const word = message.text
    .toLowerCase()
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w)
    .slice(-1)[0];

  const matchingFirstLetter =
    word[0] === runningGame.currentStartingLetter.toLowerCase();

  const equalOrMoreThanRequiredLength =
    word.length >= runningGame.currentWordMinLength;

  const correctSpelling = await checkSpell(word);

  const notUsedBefore = !runningGame.usedWords.includes(word);

  console.log({
    word,
    correctSpelling,
    matchingFirstLetter,
    equalOrMoreThanRequiredLength,
    notUsedBefore,
  });

  if (!notUsedBefore) {
    const response = await sendMessage({
      chat_id: message.chat.id,
      text: escapeText(`❌ The word "${word}" has been used before.`),
      parse_mode: "MarkdownV2",
      reply_to_message_id: message.message_id,
    });

    console.log(await response.text());
  } else if (!correctSpelling) {
    const response = await sendMessage({
      chat_id: message.chat.id,
      text: escapeText(`❌ Incorrect spelling`),
      parse_mode: "MarkdownV2",
      reply_to_message_id: message.message_id,
    });

    console.log(await response.text());
  } else if (!matchingFirstLetter) {
    const response = await sendMessage({
      chat_id: message.chat.id,
      text: escapeText(
        `❌ First letter is not matching with ${runningGame.currentStartingLetter.toUpperCase()}`,
      ),
      parse_mode: "MarkdownV2",
      reply_to_message_id: message.message_id,
    });

    console.log(await response.text());
  } else if (!equalOrMoreThanRequiredLength) {
    const response = await sendMessage({
      chat_id: message.chat.id,
      text: escapeText(
        `❌ It must have at least ${runningGame.currentWordMinLength} letters.`,
      ),
      parse_mode: "MarkdownV2",
      reply_to_message_id: message.message_id,
    });

    console.log(await response.text());
  } else if (
    correctSpelling &&
    matchingFirstLetter &&
    equalOrMoreThanRequiredLength &&
    notUsedBefore
  ) {
    clearInterval(runningGame.interval);
    runningGame.turnSeconds = runningGame.initialTurnSeconds;

    runningGame.roundIndex++;
    runningGame.score[message.from.id] = runningGame.score[message.from.id] + 1;

    {
      const response = await sendMessage({
        chat_id: message.chat.id,
        text: escapeText(`✅ Score: ${runningGame.score[message.from.id]}`),
        parse_mode: "MarkdownV2",
        reply_to_message_id: message.message_id,
      });

      console.log(await response.text());
    }

    runningGame.usedWords.push(word);

    runningGame.currentStartingLetter = String.fromCodePoint(
      Math.floor(Math.random() * ("z".charCodeAt(0) - "a".charCodeAt(0) + 1)) +
        "a".charCodeAt(0),
    );

    runningGame.currentWordMinLength = Math.min(
      ++runningGame.currentWordMinLength,
      7,
    );

    const buildHeadersText = (words: string[]) => {
      return words.map((w) => `__${w}__`).join(" ".repeat(10));
    };

    const headersText = buildHeadersText([
      "First Letter",
      "Minimum Word Length",
    ]);

    const buildDataText = (words: (string | number)[]) => {
      const spaceDiff = headersText.length - words.join("").length;
      return words.map((w) => `${w}${" ".repeat(spaceDiff)}`).join("");
    };

    const data = [
      runningGame.currentStartingLetter.toUpperCase(),
      `${runningGame.currentWordMinLength} letters`,
    ];

    const response = await sendMessage({
      chat_id: message.chat.id,
      text: escapeText(
        `*Send an English word following the criteria below in ${
          runningGame.initialTurnSeconds
        } seconds.*\n\n${headersText}\n${buildDataText(data)}`,
      ),
      parse_mode: "MarkdownV2",
    });

    console.log(await response.text());

    runningGame.interval = setInterval(() => {
      tick({ game: runningGame, message });
    }, 1200);
  }
};

export const tick = async ({
  game,
  message,
}: {
  game: WordChainGame;
  message: TelegramMessage;
}) => {
  const buildHeadersText = (words: string[]) => {
    return words.map((w) => `__${w}__`).join(" ".repeat(10));
  };

  const headersText = buildHeadersText(["First Letter", "Minimum Word Length"]);

  const data = [
    game.currentStartingLetter.toUpperCase(),
    `${game.currentWordMinLength} letters`,
  ];

  const buildDataText = (words: (string | number)[]) => {
    const spaceDiff = headersText.length - words.join("").length;
    return words.map((w) => `${w}${" ".repeat(spaceDiff)}`).join("");
  };

  if (game.turnSeconds! <= 0) {
    game.playerLives[message.from.id] = game.playerLives[message.from.id] - 1;

    if (game.playerLives[message.from.id] === 0) {
      const data = [`${game.score[message.from.id]}`, `${game.roundIndex + 1}`];

      const response = await sendMessage({
        chat_id: message.chat.id,
        text: escapeText(
          `*Game Over!*\n\n${buildHeadersText([
            "Your Score",
            "Rounds Played",
          ])}\n${buildDataText(data)}`,
        ),
        parse_mode: "MarkdownV2",
      });

      console.log(await response.text());

      activeWCGames[message.chat.id] = undefined;

      clearInterval(game.interval);
    } else if (game.playerLives[message.from.id] > 0) {
      let response = await sendMessage({
        chat_id: message.chat.id,
        text: escapeText(
          `*You have ${game.playerLives[message.from.id]} ${
            game.playerLives[message.from.id] > 1 ? "lives" : "life"
          } left!*`,
        ),
        parse_mode: "MarkdownV2",
      });

      console.log(await response.text());

      response = await sendMessage({
        chat_id: message.chat.id,
        text: escapeText(
          `*Send an English word following the criteria below in ${
            game.initialTurnSeconds
          } seconds.*\n\n${headersText}\n${buildDataText(data)}`,
        ),
        parse_mode: "MarkdownV2",
      });

      console.log(await response.text());
    }

    game.roundIndex++;
    game.turnSeconds = game.initialTurnSeconds;

    return;
  }

  if (
    game.turnSeconds! >= 1 &&
    game.turnSeconds! < game.initialTurnSeconds! &&
    (game.turnSeconds! % 10 === 0 || game.turnSeconds! <= 5)
  ) {
    const response = await sendMessage({
      chat_id: message.chat.id,
      text:
        game.turnSeconds! > 5
          ? escapeText(
              `*You have ${game.turnSeconds!} second${
                game.turnSeconds! > 1 ? "s" : ""
              } left!*`,
            )
          : `${game.turnSeconds}`,
      parse_mode: "MarkdownV2",
    });

    console.log(await response.text());
  }

  game.turnSeconds!--;
};
