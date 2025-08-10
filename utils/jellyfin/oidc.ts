/**
 * OIDC (OpenID Connect) Authentication for Jellyfin
 *
 * This module implements OIDC authentication flow for Streamyfin to work with
 * Jellyfin servers that have the SSO plugin configured.
 *
 * Flow:
 * 1. Check for available OIDC providers via GET /sso/OID/GetNames
 * 2. Open browser to GET /sso/OID/start/{providerName} which redirects to OIDC provider
 * 3. User authenticates with OIDC provider
 * 4. OIDC provider redirects back to /sso/OID/redirect/{providerName} with state
 * 5. Extract state and call POST /sso/OID/Auth/{providerName} to complete auth
 * 6. Use the returned access token for authenticated requests
 *
 * Requirements:
 * - Jellyfin server with SSO plugin installed and configured
 * - Configured OIDC providers (e.g., Authelia, Keycloak, etc.)
 * - OIDC provider configured with redirect URI: https://your-jellyfin-server/sso/OID/redirect/{provider}
 *
 * Note: The callback URL in your OIDC provider should be:
 * https://your-jellyfin-server.com/sso/OID/redirect/{provider_name}
 * NOT the mobile app's deep link URL.
 */ import type { Api } from "@jellyfin/sdk";
import * as WebBrowser from "expo-web-browser";

export interface OIDCProvider {
  name: string;
  displayName: string;
}

export interface OIDCAuthResult {
  success: boolean;
  accessToken?: string;
  user?: any;
  error?: string;
}

/**
 * Fetches available OIDC providers from the Jellyfin server
 */
export const getOIDCProviders = async (api: Api): Promise<OIDCProvider[]> => {
  try {
    const response = await api.axiosInstance.get(
      `${api.basePath}/sso/OID/GetNames`,
    );

    if (response.status === 200 && Array.isArray(response.data)) {
      return response.data.map((name: string) => ({
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
      }));
    }

    return [];
  } catch (error) {
    console.error("Failed to fetch OIDC providers:", error);
    return [];
  }
};

/**
 * Initiates OIDC authentication flow
 */
export const initiateOIDCLogin = async (
  api: Api,
  providerName: string,
  deviceId?: string,
): Promise<OIDCAuthResult> => {
  try {
    // The OIDC flow works by:
    // 1. Calling GET /sso/OID/start/{provider} which redirects to the OIDC provider
    // 2. The OIDC provider redirects back to /sso/OID/redirect/{provider}
    // 3. We extract the state from the callback and call POST /sso/OID/Auth/{provider}

    const startUrl = `${api.basePath}/sso/OID/start/${providerName}`;

    // Open the browser for authentication - this will handle the full flow
    const result = await WebBrowser.openAuthSessionAsync(
      startUrl,
      `${api.basePath}/sso/OID/redirect/${providerName}`,
    );

    if (result.type === "success" && result.url) {
      // Extract the state parameter from the redirect URL
      const url = new URL(result.url);
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        throw new Error(`OIDC authentication error: ${error}`);
      }

      if (!state) {
        throw new Error("No state parameter received from OIDC callback");
      }

      // Now complete the authentication by calling the Auth endpoint
      const authResponse = await api.axiosInstance.post(
        `${api.basePath}/sso/OID/Auth/${providerName}`,
        {
          Data: state,
          DeviceID: deviceId || "streamyfin-device",
          DeviceName: "Streamyfin",
          AppName: "Streamyfin",
          AppVersion: "0.29.13",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (authResponse.status === 200 && authResponse.data?.AccessToken) {
        return {
          success: true,
          accessToken: authResponse.data.AccessToken,
          user: authResponse.data.User,
        };
      } else {
        throw new Error("Failed to complete OIDC authentication");
      }
    } else if (result.type === "cancel") {
      return {
        success: false,
        error: "Authentication cancelled by user",
      };
    } else {
      throw new Error("Authentication failed or was dismissed");
    }
  } catch (error) {
    console.error("OIDC authentication error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown authentication error",
    };
  }
};
