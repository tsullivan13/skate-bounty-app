// src/components/HeaderLogo.tsx
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { palette } from "../../constants/theme";

const logo = require("../../assets/images/icon.png");

export function HeaderLogo({ title }: { title?: string }) {
    const router = useRouter();

    const goHome = () => {
        router.push("/");
    };

    return (
        <Pressable
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Go to home"
            style={({ pressed }) => [styles.container, pressed && styles.pressed]}
        >
            <View style={styles.logoWrapper}>
                <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
            {title ? <Text style={styles.title}>{title}</Text> : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    pressed: {
        opacity: 0.75,
    },
    logoWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: palette.subtle,
        borderWidth: 1,
        borderColor: palette.outline,
    },
    logo: {
        width: "100%",
        height: "100%",
    },
    title: {
        color: palette.text,
        fontWeight: "800",
        fontSize: 18,
    },
});

