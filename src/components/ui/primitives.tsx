// src/components/ui/primitives.tsx
import React, { PropsWithChildren } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
    ViewProps,
} from 'react-native';
import { palette, radius, shadow, space, type } from '../../../constants/theme';

export function Screen({ children }: PropsWithChildren) {
    return <View style={styles.screen}>{children}</View>;
}

export function Title({ children }: PropsWithChildren) {
    return <Text style={type.title}>{children}</Text>;
}

export function H2({ children }: PropsWithChildren) {
    return <Text style={[type.h2, { marginBottom: space.xs }]}>{children}</Text>;
}

export function Card({
    children,
    elevated,
    style,
}: PropsWithChildren<{ elevated?: boolean; style?: ViewProps['style'] }>) {
    return (
        <View style={[styles.card, elevated ? styles.cardElevated : undefined, style]}>
            {children}
        </View>
    );
}

export function Row({ children, style }: PropsWithChildren<{ style?: ViewProps['style'] }>) {
    return <View style={[styles.row, style]}>{children}</View>;
}

export function Pill({ children }: PropsWithChildren) {
    return (
        <View style={styles.pill}>
            <Text style={type.pill}>{children}</Text>
        </View>
    );
}

export function Badge({
    children,
    tone = 'neutral',
}: PropsWithChildren<{ tone?: 'neutral' | 'accent' | 'warning' | 'danger' }>) {
    const bg =
        tone === 'accent'
            ? '#1E293B'
            : tone === 'warning'
                ? '#2A1F10'
                : tone === 'danger'
                    ? '#2A1414'
                    : palette.subtle;
    const color =
        tone === 'accent'
            ? palette.accent
            : tone === 'warning'
                ? palette.warning
                : tone === 'danger'
                    ? palette.danger
                    : palette.textMuted;
    return (
        <View style={[styles.badge, { backgroundColor: bg }]}>
            <Text style={[type.small, { color }]}>{children}</Text>
        </View>
    );
}

export function Button({
    children,
    onPress,
    kind = 'primary',
    loading = false,
}: PropsWithChildren<{
    onPress?: () => void;
    kind?: 'primary' | 'ghost';
    loading?: boolean;
}>) {
    const isGhost = kind === 'ghost';
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={loading}
            style={[styles.btn, isGhost && styles.btnGhost]}
        >
            {loading ? (
                <ActivityIndicator color={isGhost ? palette.text : palette.primaryTextOn} />
            ) : (
                <Text style={[type.button, isGhost && { color: palette.text }]}>{children}</Text>
            )}
        </TouchableOpacity>
    );
}

export function Input(props: TextInputProps) {
    return (
        <TextInput
            {...props}
            placeholderTextColor={palette.textMuted}
            style={[styles.input, props.style]}
        />
    );
}

export function Muted({ children }: PropsWithChildren) {
    return <Text style={type.small}>{children}</Text>;
}

export function Mono({ children }: PropsWithChildren) {
    return <Text style={[type.code]}>{children}</Text>;
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: palette.bg,
        padding: space.lg,
        gap: space.lg,
    },
    card: {
        backgroundColor: palette.card,
        borderRadius: radius.lg,
        padding: space.lg,
        borderWidth: 1,
        borderColor: palette.outline,
        gap: space.sm,
    },
    cardElevated: {
        backgroundColor: palette.cardElevated,
        ...shadow.card,
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space.sm,
        alignItems: 'center',
    },
    pill: {
        backgroundColor: palette.subtle,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.outline,
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.outline,
        alignSelf: 'flex-start',
    },
    btn: {
        backgroundColor: palette.primary,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    btnGhost: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: palette.outline,
    },
    input: {
        borderWidth: 1,
        borderColor: palette.outline,
        backgroundColor: palette.subtle,
        borderRadius: radius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: palette.text,
        fontSize: 16,
    },
});
