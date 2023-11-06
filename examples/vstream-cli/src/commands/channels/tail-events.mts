import { input } from "@inquirer/prompts";
import closeWithGrace from "close-with-grace";
import { WebSocket } from "ws";
import { channels } from "./index.mjs";
import { requireSavedToken } from "../../utils/token.mjs";
import { EVENTS_URL } from "../../utils/constants.mjs";
import { FORMAT_OPTION, format } from "../../utils/format.mjs";
import { Agent } from "http";

channels
  .command("tail-events")
  .description("subscribe to realtime channel events")
  .option("-i, --channel-id <id>", "channel ID")
  .addOption(FORMAT_OPTION)
  .action(async (options) => {
    const token = await requireSavedToken();

    const channelId =
      options.channelId ??
      (await input({
        message: "Enter a channel ID",
      }));

    const url = `${EVENTS_URL}/channels/${channelId}/events`;
    const ws = new WebSocket(url, {
      followRedirects: true,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    ws.on("error", console.error);

    ws.on("open", function open() {
      console.info(format(options.format, { message: "Connected" }));
    });

    ws.on("message", function message(data) {
      const message = JSON.parse(data.toString("utf8"));
      console.info(format(options.format, { event: message }));
    });

    closeWithGrace(
      () =>
        new Promise((resolve) => {
          ws.close();
          ws.on("close", resolve);
        })
    );
  });
