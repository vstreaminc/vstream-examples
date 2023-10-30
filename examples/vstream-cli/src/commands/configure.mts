import * as fs from "node:fs/promises";
import * as path from "node:path";
import ospath from "ospath";
import TOML from "@iarna/toml";
import z from "zod";
import { input } from "@inquirer/prompts";
import { program } from "../program.mjs";

program
  .command("configure")
  .description("configure your VStream app client credentials")
  .option("-c, --client-id <id>", "OAuth client ID")
  .option("-s, --client-secret <secret>", "OAuth client secret")
  .option("-p, --port <number>", "OAuth redirect port")
  .action(async (options) => {
    const clientId =
      options.clientId ??
      (await input({
        message: "Enter your client ID",
      }));

    const clientSecret =
      options.clientSecret ??
      (await input({
        message: "Enter your client secret",
      }));

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
    const config = {
      client: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_port: portRes.data,
      },
    };

    try {
      await fs.writeFile(configFile, TOML.stringify(config));
    } catch (error) {
      console.error("Failed to write config file");
      throw error;
    }

    console.info(`Wrote config file to ${configFile}`);
  });
