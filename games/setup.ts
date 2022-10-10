import type { TelegramMessage } from "../types.ts";
import { handle as wcHandle } from "./word-chain/index.ts";

export const setup = (message: TelegramMessage) => {
  wcHandle(message).catch((e) => {
    console.error(e);
  });
};
