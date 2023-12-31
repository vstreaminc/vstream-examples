import { z } from "zod";
import { API_URL } from "./constants.mjs";

export type DiscoveryResponse = z.infer<typeof DiscoveryResponse>;

const DiscoveryResponse = z.object({
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  scopes_supported: z.array(z.string()),
});

export async function getDiscovery() {
  try {
    const discoveryUrl = `${API_URL}/oidc/.well-known/openid-configuration`;
    const response = await fetch(discoveryUrl).then((res) => res.json());
    return DiscoveryResponse.parse(response);
  } catch (error) {
    console.error("Failed to fetch discovery document");
    throw error;
  }
}
