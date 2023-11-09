import { input } from "@inquirer/prompts";
import fetch from "node-fetch";
import { z } from "zod";
import { channels } from "./index.mjs";
import { requireSavedToken } from "../../utils/token.mjs";
import { API_URL } from "../../utils/constants.mjs";
import { FORMAT_OPTION, format } from "../../utils/format.mjs";

channels
  .command("lookup-channel")
  .description("look up a channel by its username")
  .option("-u, --username <username>", "username")
  .addOption(FORMAT_OPTION)
  .action(async (options) => {
    const token = await requireSavedToken();

    const username =
      options.username ??
      (await input({
        message: "Enter a username to look up",
      }));

    const url = new URL(`${API_URL}/channels/lookup`);
    url.searchParams.set("username", username);
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });
    if (response.status === 404) {
      throw new Error("Channel not found");
    }
    if (!response.ok) {
      throw new Error("Failed to look up channel");
    }

    const json = await response.json();
    const data = z.object({ data: z.unknown() }).parse(json).data;

    console.info(format(options.format, data));
  });
