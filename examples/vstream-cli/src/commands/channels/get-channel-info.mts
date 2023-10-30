import { input } from "@inquirer/prompts";
import fetch from "node-fetch";
import { z } from "zod";
import { channels } from "./index.mjs";
import { requireSavedToken } from "../../utils/token.mjs";
import { VSTREAM_URL } from "../../utils/constants.mjs";
import { FORMAT_OPTION, format } from "../../utils/format.mjs";

channels
  .command("get-channel-info")
  .description("get detailed public information about a channel")
  .option("-i, --channel-id <id>", "channel ID")
  .addOption(FORMAT_OPTION)
  .action(async (options) => {
    const token = await requireSavedToken();

    const channelId =
      options.channelId ??
      (await input({
        message: "Enter a channel ID",
      }));

    const url = `${VSTREAM_URL}/channels/${channelId}/info`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });
    if (response.status === 404) {
      console.error("Channel not found");
    }
    if (!response.ok) {
      console.error("Failed to fetch channel info");
    }

    const json = await response.json();
    const data = z.object({ data: z.unknown() }).parse(json).data;

    console.info(format(options.format, data));
  });
