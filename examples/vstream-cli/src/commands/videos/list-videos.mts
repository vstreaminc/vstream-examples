import { input } from "@inquirer/prompts";
import fetch from "node-fetch";
import { z } from "zod";
import { videos } from "./index.mjs";
import { requireSavedToken } from "../../utils/token.mjs";
import { API_URL } from "../../utils/constants.mjs";
import { FORMAT_OPTION, format } from "../../utils/format.mjs";

videos
  .command("list-videos")
  .description("list videos for a channel")
  .option("-a, --after <cursor>", "after cursor (for pagination)")
  .option("-i, --channel-id <id>", "channel ID")
  .option("-l, --limit <number>", "limit of videos to fetch")
  .addOption(FORMAT_OPTION)
  .action(async (options) => {
    const token = await requireSavedToken();

    const channelId =
      options.channelId ??
      (await input({
        message: "Enter a channel ID",
      }));

    const { after, limit } = options;

    const url = new URL(`${API_URL}/channels/${channelId}/videos`);
    if (limit !== undefined) {
      url.searchParams.append("limit", limit);
    }
    if (after !== undefined) {
      url.searchParams.append("after", after);
    }
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });
    if (response.status === 404) {
      throw new Error("Channel videos not found");
    }
    if (!response.ok) {
      throw new Error("Failed to fetch channel videos");
    }

    const json = await response.json();
    const data = z.object({ data: z.unknown() }).passthrough().parse(json);

    console.info(format(options.format, data));
  });
