import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { Text } from "@/components/common/Text";
import { Loader } from "@/components/Loader";

/**
 * OIDC Callback page - handles the callback from OIDC authentication
 * This page is shown briefly while processing the authentication result
 */
export default function OIDCCallback() {
  const params = useLocalSearchParams();

  useEffect(() => {
    // Extract parameters from the callback URL
    const { code, error } = params as {
      code?: string;
      error?: string;
    };

    // Process the callback parameters
    if (error) {
      console.error("OIDC authentication error:", error);
      // Redirect back to login with error
      router.replace({
        pathname: "/login",
        params: { oidcError: error },
      });
    } else if (code) {
      console.log("OIDC authentication successful, processing...");
      // The actual token exchange is handled by the WebBrowser session
      // This page is just a placeholder for the callback URL
      router.replace("/login");
    } else {
      console.warn("OIDC callback received with no code or error");
      router.replace("/login");
    }
  }, [params]);

  return (
    <View className='flex-1 items-center justify-center bg-neutral-950'>
      <Loader />
      <Text className='mt-4 text-neutral-400'>
        Processing authentication...
      </Text>
    </View>
  );
}
