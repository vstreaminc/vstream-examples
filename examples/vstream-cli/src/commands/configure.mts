import * as fs from "node:fs/promises";
import * as path from "node:path";
import ospath from "ospath";
import { Option } from "@commander-js/extra-typings";
import TOML from "@iarna/toml";
import z from "zod";
import { input, select } from "@inquirer/prompts";
import { program } from "../program.mjs";

program
  .command("configure")
  .description("configure your VStream app client credentials")
  .addOption(
    new Option("-t, --client-type <type>", "OAuth client type").choices([
      "confidential",
      "public",
    ] as const)
  )
  .option("-c, --client-id <id>", "OAuth client ID")
  .option("-s, --client-secret <secret>", "OAuth client secret")
  .option("-p, --port <number>", "OAuth redirect port")
  .action(async (options) => {
    const clientType = z.enum(["confidential", "public"]).parse(
      options.clientType ??
        (await select({
          message: "Enter your client type",
          choices: [
            {
              value: "confidential",
              name: "Confidential",
              description:
                "Confidential clients can keep a client secret private",
            },
            {
              value: "public",
              name: "Public",
              description: "Public clients cannot keep a client secret private",
            },
          ],
        }))
    );

    const clientId =
      options.clientId ??
      (await input({
        message: "Enter your client ID",
      }));

    const clientSecret =
      clientType === "confidential"
        ? options.clientSecret ??
          (await input({
            message: "Enter your client secret",
          }))
        : "";

    const portRes = z.coerce
      .number()
      .int()
      .safeParse(
        options.port ??
          (await input({
            message: "Enter your OAuth redirect port - http://localhost:",
            default: "3000",
          }))
      );

    if (!portRes.success) {
      throw new Error("Invalid port");
    }

    const configDir = path.join(ospath.data(), "vstream");
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create config directory");
      throw error;
    }

    const configFile = path.join(configDir, "config.toml");

    try {
      if (clientType === "confidential") {
        const config = {
          client: {
            client_id: clientId,
            client_secret: clientSecret,
            redirect_port: portRes.data,
          },
        };

        await fs.writeFile(configFile, TOML.stringify(config));
      } else {
        const config = {
          client: {
            client_id: clientId,
            redirect_port: portRes.data,
          },
        };

        await fs.writeFile(configFile, TOML.stringify(config));
      }
    } catch (error) {
      console.error("Failed to write config file");
      throw error;
    }

    console.info(`Wrote config file to ${configFile}`);
  });
