// src/components/HeaderLogo.tsx
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { palette } from "../../constants/theme";

const logo = require("../../assets/images/icon.png");

type HeaderLogoProps = {
    title?: string;
    centered?: boolean;
};

export function HeaderLogo({ title, centered }: HeaderLogoProps) {
    const router = useRouter();

    const goHome = () => {
        router.push("/");
    };

    return (
        <Pressable
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Go to home"
            style={({ pressed }) => [styles.container, centered && styles.centered, pressed && styles.pressed]}
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
        alignSelf: "flex-start",
        justifyContent: "center",
        paddingHorizontal: 6,
    },
    centered: {
        alignSelf: "center",
    } satisfies ViewStyle,
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
        flexShrink: 1,
    },
});

