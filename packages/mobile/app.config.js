export default {
  expo: {
    name: "Midpoint",
    slug: "midpoint",
    scheme: "midpoint",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.midpoint.app",
      usesAppleSignIn: true,
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME,
            ],
          },
        ],
      },
    },
    android: {
      package: "com.midpoint.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      intentFilters: [
        {
          action: "VIEW",
          category: ["DEFAULT", "BROWSABLE"],
          data: {
            scheme: "com.midpoint.app",
          },
        },
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "@react-native-community/datetimepicker",
      "expo-secure-store",
      "expo-web-browser",
      "expo-apple-authentication",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Midpoint uses your location to find restaurants near you when searching.",
        },
      ],
      [
        "./plugins/with-adi-registration",
        { snippet: process.env.ADI_REGISTRATION_SNIPPET },
      ],
    ],
    extra: {
      eas: {
        projectId: "0c812406-04b3-4a25-9c76-6d0f4ebb5210",
      },
    },
  },
};
