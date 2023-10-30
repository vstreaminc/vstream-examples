import * as fs from "node:fs/promises";
import * as path from "node:path";
import ospath from "ospath";
import TOML from "@iarna/toml";
import { z } from "zod";

export type Config = z.infer<typeof Config>;

const Config = z.object({
  client: z.object({
    client_id: z.string(),
    client_secret: z.string(),
    redirect_port: z.number().int(),
  }),
});

export async function getConfig() {
  try {
    const dir = path.join(ospath.data(), "vstream");
    const file = path.join(dir, "config.toml");
    const data = await fs.readFile(file, "utf-8").then(TOML.parse);
    return Config.parse(data);
  } catch (error) {
    console.error("Failed to read config file");
    throw error;
  }
}
