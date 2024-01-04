import * as crypto from "node:crypto";
import * as http from "node:http";
import { decodeJwt } from "jose";
import z from "zod";
import open from "open";
import invariant from "tiny-invariant";
import { checkbox } from "@inquirer/prompts";
import { program } from "../program.mjs";
import { getConfig, type Config } from "../utils/config.mjs";
import { getDiscovery, type DiscoveryResponse } from "../utils/discovery.mjs";
import { getNewToken, saveToken } from "../utils/token.mjs";
import { formatPretty } from "../utils/format.mjs";

const Scope = (discovery: DiscoveryResponse) =>
  z.string().refine((scope) => discovery.scopes_supported.includes(scope));

const Claim = (discovery: DiscoveryResponse) =>
  z.string().refine((claim) => discovery.claims_supported.includes(claim));

program
  .command("login")
  .description("log in to VStream with OAuth")
  .option("-s, --scopes <scopes>", "OAuth scopes", (scopes) =>
    scopes.split(",")
  )
  .option("-c, --claims <claims>", "OpenID Connect claims", (claims) =>
    claims.split(",")
  )
  .action(async (options) => {
    const config = await getConfig();
    const discovery = await getDiscovery();
    const scopes = await promptScopes(discovery, options.scopes);
    const claims = scopes.includes("openid")
      ? await promptClaims(discovery, options.claims)
      : [];
    const verifier = generateCodeVerifier();
    const state = generateState();
    const authUrl = generateAuthUrl(
      discovery,
      config,
      scopes,
      claims,
      verifier,
      state
    );
    const code = await retrieveAuthorizationCode(config, authUrl, state);
    const token = await getNewToken(discovery, config, verifier, code);
    await saveToken(token);

    console.info("Login successful!");

    if (token.id_token) {
      console.info("User info from ID token:");
      console.info(formatPretty(decodeJwt(token.id_token)));
    }
  });

async function promptScopes(discovery: DiscoveryResponse, scopes?: string[]) {
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

async function promptClaims(discovery: DiscoveryResponse, claims?: string[]) {
  return Claim(discovery)
    .array()
    .parse(
      claims ??
        (await checkbox({
          message: "Select OpenID Connect claims",
          choices: discovery.claims_supported.map((value) => ({ value })),
        }))
    );
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
  discovery: DiscoveryResponse,
  config: Config,
  scopes: string[],
  claims: string[],
  verifier: string,
  state: string
) {
  const authUrl = new URL(discovery.authorization_endpoint);

  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", config.client.client_id);
  authUrl.searchParams.append("scope", scopes.join(" "));
  if (claims.length > 0) {
    authUrl.searchParams.append(
      "claims",
      JSON.stringify({
        userinfo: Object.fromEntries(claims.map((claim) => [claim, null])),
        id_token: Object.fromEntries(claims.map((claim) => [claim, null])),
      })
    );
  }
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
  config: Config,
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
