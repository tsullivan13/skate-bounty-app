// app/(tabs)/_layout.tsx
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "../../constants/theme";
import { HeaderLogo } from "../../src/components/HeaderLogo";
import { useAuth } from "../../src/providers/AuthProvider";

export default function TabsLayout() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerTitleAlign: "left",
        headerStyle: { backgroundColor: palette.card },
        headerTintColor: palette.text,
        headerTitleStyle: { fontWeight: "800" },
        headerTitle: "",
        headerLeft: () => {
          const titles: Record<string, string> = {
            index: "Skate Bounty",
            create: "Create Bounty",
            spots: "Spots",
            profile: "My Profile",
          };

          return <HeaderLogo title={titles[route.name] ?? route.name} />;
        },
        tabBarStyle: { backgroundColor: palette.card, borderTopColor: palette.outline },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarLabelStyle: { fontWeight: "600" },
        tabBarIcon: ({ color, focused, size }) => {
          const iconName = (() => {
            switch (route.name) {
              case "index":
                return focused ? "home" : "home-outline";
              case "create":
                return focused ? "add-circle" : "add-circle-outline";
              case "spots":
                return focused ? "navigate" : "navigate-outline";
              case "profile":
                return focused ? "person" : "person-outline";
              default:
                return "ellipse-outline";
            }
          })();
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Skate Bounty" }} />
      <Tabs.Screen name="create" options={{ title: "Create Bounty" }} />
      <Tabs.Screen name="spots" options={{ title: "Spots" }} />
      <Tabs.Screen name="profile" options={{ title: "My Profile" }} />
    </Tabs>
  );
}
