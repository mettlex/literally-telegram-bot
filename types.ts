export interface TelegramMessage {
  message_id: number;
  from: TelegramMessageAuthor;
  chat: TelegramMessageChat;
  date: number;
  text?: string;
  photo?: TelegramMessagePhoto[];
}

export interface TelegramMessageChat {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  type: string;
}

export interface TelegramMessageAuthor {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name: string;
  username: string;
  language_code: string;
}

export interface TelegramMessagePhoto {
  file_id: string;
  file_unique_id: string;
  file_size: number;
  width: number;
  height: number;
}

export interface TelegramMessageRequest {
  chat_id: number | string;
  text: string;
  parse_mode?: string;
  entities?: unknown[];
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  reply_markup?: unknown;
}

export type WiktionaryAPIResponse = [string, [string, string] | []];

export type WordChainGameMode =
  | "Noob"
  | "Casual"
  | "Challenge"
  | "Banned Letters"
  | "Me vs Bot";

export interface WordChainGame {
  gameStartedAt: Date;
  joinable: boolean;
  users: TelegramMessageAuthor[];
  longestWord: string;
  longestWordUser: TelegramMessageAuthor;
  currentUser: TelegramMessageAuthor;
  currentStartingLetter: string;
  currentWordMinLength: number;
  roundIndex: number;
  usedWords: string[];
  reduce: boolean;
  mode: WordChainGameMode;
  maxLives: number;
  playerLives: {
    [userId: string]: number;
  };
  bannedLetters: string[];
  shouldAddBannedLetter: boolean;
  score: {
    [key: string]: number;
  };
}
export interface ActiveWordChainGames {
  [chatId: string]: WordChainGame | undefined;
}
