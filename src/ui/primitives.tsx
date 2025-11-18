// src/ui/primitives.tsx
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
import { palette, radius, shadow, space, type } from '../../constants/theme';

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
            ? '#13233C'
            : tone === 'warning'
                ? '#2E2416'
                : tone === 'danger'
                    ? '#2E1A1A'
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
            style={[styles.btn, isGhost && styles.btnGhost, loading && styles.btnDisabled]}
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
        padding: space.xl,
        gap: space.lg,
        paddingTop: space.xl + 4,
    },
    card: {
        backgroundColor: palette.card,
        borderRadius: radius.lg,
        padding: space.lg,
        borderWidth: 1,
        borderColor: palette.outline,
        gap: space.sm,
        shadowColor: palette.surfaceGlow,
        shadowOpacity: 0.25,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 12 },
    },
    cardElevated: {
        backgroundColor: palette.cardElevated,
        ...shadow.card,
        borderColor: '#1F2E45',
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space.sm,
        alignItems: 'center',
    },
    pill: {
        backgroundColor: palette.surfaceGlow,
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
        shadowColor: palette.primary,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
    },
    btnGhost: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: palette.outline,
        shadowOpacity: 0,
    },
    btnDisabled: {
        opacity: 0.75,
    },
    input: {
        borderWidth: 1,
        borderColor: '#1E314A',
        backgroundColor: palette.subtle,
        borderRadius: radius.lg,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: palette.text,
        fontSize: 16,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
    },
});
