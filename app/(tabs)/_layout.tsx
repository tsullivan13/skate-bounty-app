// app/(tabs)/_layout.tsx
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { useAuth } from "../../src/providers/AuthProvider";

export default function TabsLayout() {
  const { session, loading } = useAuth();

  // Waiting for session check
  if (loading) return null;

  // Redirect unauthenticated users to login
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: "Skate Bounty",
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          headerTitle: "Create Bounty",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerTitle: "My Profile",
        }}
      />
    </Tabs>
  );
}
