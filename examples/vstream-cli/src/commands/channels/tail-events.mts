import { Option } from "@commander-js/extra-typings";
import { input, select } from "@inquirer/prompts";
import closeWithGrace from "close-with-grace";
import { WebSocket } from "ws";
import { z } from "zod";
import { channels } from "./index.mjs";
import { SavedToken, requireSavedToken } from "../../utils/token.mjs";
import { API_URL, EVENTS_URL } from "../../utils/constants.mjs";
import { FORMAT_OPTION, format } from "../../utils/format.mjs";

channels
  .command("tail-events")
  .description("subscribe to realtime channel events")
  .option("-i, --channel-id <id>", "channel ID")
  .addOption(
    new Option(
      "-a, --auth-method <method>",
      "how to authenticate the request"
    ).choices(["header", "queryparam"] as const)
  )
  .addOption(FORMAT_OPTION)
  .action(async (options) => {
    const token = await requireSavedToken();

    const channelId =
      options.channelId ??
      (await input({
        message: "Enter a channel ID",
      }));

    const authMethod = z.enum(["header", "queryparam"]).parse(
      options.authMethod ??
        (await select({
          message: "Select an authentication method",
          choices: [
            {
              value: "header",
              name: "Authorization header",
              description:
                "The access token is sent as a bearer token in the Authorization header",
            },
            {
              value: "queryparam",
              name: "Query parameter",
              description:
                "A single-use connection token is sent as a query parameter",
            },
          ],
        }))
    );

    const url = `${EVENTS_URL}/channels/${channelId}/events`;
    const ws =
      authMethod === "header"
        ? createWebSocketWithHeaderAuth(url, token)
        : await createWebSocketWithQueryParamAuth(url, token);

    ws.on("error", (err) => {
      console.error(err);
    });

    let pingTimeout: NodeJS.Timeout;
    ws.on("open", () => {
      console.info(format(options.format, { message: "Connected" }));

      pingTimeout = setInterval(() => {
        // console.info(format(options.format, { message: "Ping" }));
        // ws.ping();
      }, 10000);
    });

    ws.on("close", () => {
      clearInterval(pingTimeout);
      console.info(format(options.format, { message: "Disconnected" }));
    });

    ws.on("pong", () => {
      console.info(format(options.format, { message: "Pong" }));
    });

    ws.on("message", (data) => {
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

/**
 * Creates a WebSocket which authenticates using an access token in the Authorization
 * header.
 */
function createWebSocketWithHeaderAuth(url: string, savedToken: SavedToken) {
  const ws = new WebSocket(url, {
    followRedirects: true,
    headers: {
      Authorization: `Bearer ${savedToken.access_token}`,
    },
  });

  return ws;
}

/**
 * Creates a WebSocket which authenticates using a single-use connection token
 * in a query parameter.
 */
async function createWebSocketWithQueryParamAuth(
  baseUrl: string,
  savedToken: SavedToken
) {
  const connectionToken = await getConnectionToken(savedToken);
  const url = new URL(baseUrl);
  url.searchParams.set("authorization", connectionToken);
  const ws = new WebSocket(url.toString(), {
    followRedirects: true,
  });

  return ws;
}

/**
 * Gets a single-use connection token which can be used to connect to the PubSub WebSocket API
 * via a query parameter. This is useful for clients that cannot set headers, such as browser-based
 * clients.
 */
async function getConnectionToken(token: SavedToken) {
  const url = `${API_URL}/events/connect`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to get a connection token");
  }

  const json = await response.json();
  const result = z
    .object({ data: z.object({ token: z.string() }) })
    .safeParse(json);

  if (!result.success) {
    throw new Error("Unexpected response from server");
  }

  return result.data.data.token;
}
