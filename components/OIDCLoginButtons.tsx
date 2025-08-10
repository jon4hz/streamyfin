import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/common/Text";
import { Loader } from "@/components/Loader";
import { useJellyfin } from "@/providers/JellyfinProvider";
import type { OIDCProvider } from "@/utils/jellyfin/oidc";

interface OIDCLoginButtonsProps {
  onLoginSuccess?: () => void;
  onLoginError?: (error: string) => void;
}

export const OIDCLoginButtons: React.FC<OIDCLoginButtonsProps> = ({
  onLoginSuccess,
  onLoginError,
}) => {
  const { t } = useTranslation();
  const { getOIDCProviders, loginWithOIDC } = useJellyfin();
  const [providers, setProviders] = useState<OIDCProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginInProgress, setLoginInProgress] = useState<string | null>(null);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const oidcProviders = await getOIDCProviders();
        setProviders(oidcProviders);
      } catch (error) {
        console.error("Failed to load OIDC providers:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, [getOIDCProviders]);

  const handleOIDCLogin = async (providerName: string) => {
    setLoginInProgress(providerName);

    try {
      await loginWithOIDC(providerName);
      onLoginSuccess?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("login.oidc_login_failed");
      onLoginError?.(errorMessage);

      Alert.alert(t("login.error_title"), errorMessage);
    } finally {
      setLoginInProgress(null);
    }
  };

  if (loading) {
    return (
      <View className='flex items-center py-4'>
        <Loader />
        <Text className='mt-2 text-sm text-neutral-400'>
          {t("login.loading_oidc_providers")}
        </Text>
      </View>
    );
  }

  if (providers.length === 0) {
    return null;
  }

  return (
    <View className='w-full'>
      <Text className='text-center text-neutral-400 text-sm mb-4'>
        {t("login.oidc_providers")}
      </Text>

      <View className='space-y-3'>
        {providers.map((provider) => (
          <TouchableOpacity
            key={provider.name}
            onPress={() => handleOIDCLogin(provider.name)}
            disabled={loginInProgress !== null}
            className={`
              flex-row items-center justify-center px-4 py-3 rounded-xl border
              ${
                loginInProgress === provider.name
                  ? "bg-neutral-800 border-neutral-600"
                  : "bg-neutral-900 border-neutral-700 active:bg-neutral-800"
              }
            `}
          >
            {loginInProgress === provider.name ? (
              <>
                <Loader size='small' />
                <Text className='ml-3 text-white font-medium'>
                  {t("login.login_with", { provider: provider.displayName })}...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name='log-in-outline' size={20} color='white' />
                <Text className='ml-3 text-white font-medium'>
                  {t("login.login_with", { provider: provider.displayName })}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View className='flex-row items-center my-6'>
        <View className='flex-1 h-px bg-neutral-700' />
        <Text className='mx-4 text-neutral-400 text-sm'>
          {t("login.or_login_with_credentials")}
        </Text>
        <View className='flex-1 h-px bg-neutral-700' />
      </View>
    </View>
  );
};
