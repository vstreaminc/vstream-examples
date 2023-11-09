import { input } from "@inquirer/prompts";
import fetch from "node-fetch";
import { z } from "zod";
import { videos } from "./index.mjs";
import { requireSavedToken } from "../../utils/token.mjs";
import { API_URL } from "../../utils/constants.mjs";
import { FORMAT_OPTION, format } from "../../utils/format.mjs";

videos
  .command("lookup-video")
  .description("look up a video by its web ID")
  .option("-i, --web-id <web-id>", "web ID")
  .addOption(FORMAT_OPTION)
  .action(async (options) => {
    const token = await requireSavedToken();

    const username =
      options.webId ??
      (await input({
        message: "Enter a video web ID to look up",
      }));

    const url = new URL(`${API_URL}/videos/lookup`);
    url.searchParams.set("webID", username);
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });
    if (response.status === 404) {
      throw new Error("Video not found");
    }
    if (!response.ok) {
      throw new Error("Failed to look up video");
    }

    const json = await response.json();
    const data = z.object({ data: z.unknown() }).parse(json).data;

    console.info(format(options.format, data));
  });
