// app/(tabs)/_layout.tsx
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { useAuth } from "../../src/providers/AuthProvider";

export default function TabsLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/login" />; // <- matches your folder tree

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ title: "Home", headerTitle: "Skate Bounty" }}
      />
      {/* Keep or remove Explore as you like */}
      {/* <Tabs.Screen name="explore" options={{ title: "Explore" }} /> */}
    </Tabs>
  );
}
