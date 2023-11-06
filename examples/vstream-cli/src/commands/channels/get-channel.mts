import { input } from "@inquirer/prompts";
import fetch from "node-fetch";
import { z } from "zod";
import { channels } from "./index.mjs";
import { requireSavedToken } from "../../utils/token.mjs";
import { API_URL } from "../../utils/constants.mjs";
import { FORMAT_OPTION, format } from "../../utils/format.mjs";

channels
  .command("get-channel")
  .description("get basic public information about a channel")
  .option("-i, --channel-id <id>", "channel ID")
  .addOption(FORMAT_OPTION)
  .action(async (options) => {
    const token = await requireSavedToken();

    const channelId =
      options.channelId ??
      (await input({
        message: "Enter a channel ID",
      }));

    const url = `${API_URL}/channels/${channelId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });
    if (response.status === 404) {
      throw new Error("Channel not found");
    }
    if (!response.ok) {
      throw new Error("Failed to fetch channel");
    }

    const json = await response.json();
    const data = z.object({ data: z.unknown() }).parse(json).data;

    console.info(format(options.format, data));
  });
