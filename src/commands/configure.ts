import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as ospath from "ospath";
import TOML from "@iarna/toml";
import { input } from "@inquirer/prompts";
import { program } from "../program";

program
  .command("configure")
  .description("Configure the CLI with your VStream app credentials.")
  .option("-c, --client-id <id>", "OAuth client ID")
  .option("-s, --client-secret <secret>", "OAuth client secret")
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
