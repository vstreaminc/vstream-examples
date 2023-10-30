import * as crypto from "node:crypto";
import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import fetch from "node-fetch";
import keytar from "keytar";
import z from "zod";
import open from "open";
import ospath from "ospath";
import invariant from "tiny-invariant";
import TOML from "@iarna/toml";
import { checkbox } from "@inquirer/prompts";
import { program } from "../program.mjs";

const VSTREAM_URL = process.env.VSTREAM_URL ?? "https://api.vstream.com";

const Config = z.object({
  client: z.object({
    client_id: z.string(),
    client_secret: z.string(),
    redirect_port: z.number().int(),
  }),
});

const DiscoveryResponse = z.object({
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  scopes_supported: z.array(z.string()),
});

const TokenResponse = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
});

const Scope = (discovery: z.infer<typeof DiscoveryResponse>) =>
  z.string().refine((scope) => discovery.scopes_supported.includes(scope));

program
  .command("login")
  .description("log in to VStream with OAuth")
  .option("-s, --scopes <scopes>", "OAuth scopes", (scopes) =>
    scopes.split(",")
  )
  .action(async (options) => {
    const config = await getConfig();
    const discovery = await getDiscovery();
    const scopes = await promptScopes(discovery, options.scopes);
    const verifier = generateCodeVerifier();
    const state = generateState();
    const authUrl = generateAuthUrl(discovery, config, scopes, verifier, state);
    const code = await retrieveAuthorizationCode(config, authUrl, state);
    const token = await retrieveAccessToken(discovery, config, verifier, code);
    await saveToken(token);

    console.log("Login successful!");
  });

async function promptScopes(
  discovery: z.infer<typeof DiscoveryResponse>,
  scopes?: string[]
) {
  return Scope(discovery)
    .array()
    .parse(
      scopes ??
        (await checkbox({
          message: "Select OAuth scopes",
          choices: discovery.scopes_supported.map((value) => ({ value })),
        }))
    );
}

async function getDiscovery() {
  try {
    const discoveryUrl = `${VSTREAM_URL}/oidc/.well-known/openid-configuration`;
    const response = await fetch(discoveryUrl).then((res) => res.json());
    return DiscoveryResponse.parse(response);
  } catch (error) {
    console.error("Failed to fetch discovery document");
    throw error;
  }
}

async function getConfig() {
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

function generateState() {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeVerifier() {
  return crypto.randomBytes(96).toString("base64url");
}

function generateCodeChallenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateAuthUrl(
  discovery: z.infer<typeof DiscoveryResponse>,
  config: z.infer<typeof Config>,
  scopes: string[],
  verifier: string,
  state: string
) {
  const authUrl = new URL(discovery.authorization_endpoint);

  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", config.client.client_id);
  authUrl.searchParams.append("scope", scopes.join(" "));
  authUrl.searchParams.append(
    "redirect_uri",
    `http://localhost:${config.client.redirect_port}/`
  );
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append(
    "code_challenge",
    generateCodeChallenge(verifier)
  );
  authUrl.searchParams.append("code_challenge_method", "S256");

  if (scopes.includes("offline_access")) {
    authUrl.searchParams.append("prompt", "consent");
  }

  return authUrl.toString();
}

async function retrieveAuthorizationCode(
  config: z.infer<typeof Config>,
  authUrl: string,
  state: string
) {
  await open(authUrl);
  return withHttpServer(config.client.redirect_port, (req) => {
    invariant(req.url, "Expected req.url to be defined");
    invariant(req.method === "GET", "Expected req.method to be GET");
    const url = new URL(
      req.url,
      `http://localhost:${config.client.redirect_port}/`
    );
    invariant(url.searchParams.get("state") === state, "Invalid state");

    if (url.searchParams.get("error")) {
      throw new Error(url.searchParams.get("error_description")!);
    }

    const code = url.searchParams.get("code");
    invariant(code, "Expected code to be defined");

    return code;
  });
}

async function retrieveAccessToken(
  discovery: z.infer<typeof DiscoveryResponse>,
  config: z.infer<typeof Config>,
  verifier: string,
  code: string
) {
  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.client.client_id,
      client_secret: config.client.client_secret,
      code_verifier: verifier,
      code,
      redirect_uri: `http://localhost:${config.client.redirect_port}/`,
    }),
  }).then((res) => res.json());

  return TokenResponse.parse(response);
}

async function saveToken(token: z.infer<typeof TokenResponse>) {
  await keytar.setPassword("vstream", "token", JSON.stringify(token));
}

function withHttpServer<T>(
  port: number,
  callback: (req: http.IncomingMessage) => T
) {
  return new Promise<T>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        res.write("You may now close this window and return to the CLI.");
        res.end();
        server.closeAllConnections();
        server.close();
        resolve(await callback(req));
      } catch (error) {
        reject(error);
      }
    });
    server.listen(port);
  });
}
