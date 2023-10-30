import fetch from "node-fetch";
import keytar from "keytar";
import { z } from "zod";
import { getConfig, type Config } from "./config.mjs";
import { getDiscovery, type DiscoveryResponse } from "./discovery.mjs";

type TokenResponse = z.infer<typeof TokenResponse>;

const TokenResponse = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
});

const SavedToken = TokenResponse.extend({
  expires_at: z.number(),
});

export async function getNewToken(
  discovery: DiscoveryResponse,
  config: Config,
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

export async function getSavedToken() {
  const saved = await keytar.getPassword("vstream", "token");
  if (!saved) {
    return null;
  }

  const token = SavedToken.parse(JSON.parse(saved));

  if (token.expires_at < Date.now()) {
    return token.refresh_token ? refreshToken(token) : null;
  }

  return token;
}

export async function requireSavedToken() {
  const token = await getSavedToken();
  if (!token) {
    throw new Error("Not logged in - please login with `vstream login` first");
  }

  return token;
}

export async function refreshToken(token: TokenResponse) {
  const config = await getConfig();
  const discovery = await getDiscovery();

  const auth = `Basic ${Buffer.from(
    `${config.client.client_id}:${config.client.client_secret}`
  ).toString("base64")}`;

  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: auth,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    }),
  }).then((res) => res.json());

  const refreshed = TokenResponse.parse(response);
  return saveToken(refreshed);
}

export async function saveToken(token: TokenResponse) {
  const toSave = SavedToken.parse({
    ...token,
    expires_at: Date.now() + token.expires_in * 1000,
  });
  await keytar.setPassword("vstream", "token", JSON.stringify(toSave));
  return toSave;
}
