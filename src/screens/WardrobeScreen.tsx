/**
 * WardrobeAI — Wardrobe Screen
 * Production-grade React Native screen.
 * Uses hooks. No direct service calls. Full TypeScript.
 */

import React, { useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
    ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth, useWardrobe } from '../hooks';
import type { ClothingItem } from '../models';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Wardrobe'>;

const CATEGORY_FILTERS = ['all', 'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'] as const;
type CategoryFilter = typeof CATEGORY_FILTERS[number];

export function WardrobeScreen({ navigation }: Props) {
    const { user } = useAuth();
    const { items, loading, error, deleteItem, refresh } = useWardrobe(user?.id ?? '');
    const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
    const [refreshing, setRefreshing] = useState(false);

    const filtered = activeFilter === 'all'
        ? items
        : items.filter((i) => i.category === activeFilter);

    const handleDelete = (item: ClothingItem) => {
        Alert.alert(
            'Remove Item',
            `Remove "${item.name}" from your wardrobe?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await deleteItem(item.id);
                        if (!result.success) Alert.alert('Error', result.error);
                    },
                },
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#6366F1" />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={refresh} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>My Wardrobe</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('AddItem')}
                    accessibilityLabel="Add clothing item"
                >
                    <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
            </View>

            {/* Category filters */}
            <FlatList
                data={CATEGORY_FILTERS}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                style={styles.filters}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => setActiveFilter(item)}
                        style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
                    >
                        <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
                            {item.charAt(0).toUpperCase() + item.slice(1)}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {/* Items grid */}
            {filtered.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyTitle}>Nothing here yet</Text>
                    <Text style={styles.emptySubtext}>
                        Add your first item to start building your wardrobe
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    numColumns={2}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.grid}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => navigation.navigate('ItemDetail', { item })}
                            onLongPress={() => handleDelete(item)}
                            accessibilityLabel={`${item.name}, ${item.category}, ${item.color}`}
                        >
                            <Image source={{ uri: item.image_url }} style={styles.image} />
                            <View style={styles.cardInfo}>
                                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.itemMeta}>
                                    {item.color} · Worn {item.times_worn}x
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F0F0F' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
    addButton: { backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    addButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    filters: { paddingHorizontal: 12, marginBottom: 8, maxHeight: 44 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginHorizontal: 4, backgroundColor: '#1F1F1F' },
    filterChipActive: { backgroundColor: '#6366F1' },
    filterText: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' },
    filterTextActive: { color: '#FFFFFF' },
    grid: { paddingHorizontal: 8, paddingBottom: 24 },
    card: { flex: 1, margin: 8, borderRadius: 16, backgroundColor: '#1F1F1F', overflow: 'hidden' },
    image: { width: '100%', aspectRatio: 0.8, backgroundColor: '#2A2A2A' },
    cardInfo: { padding: 10 },
    itemName: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
    itemMeta: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 8 },
    emptySubtext: { color: '#6B7280', fontSize: 14, textAlign: 'center' },
    errorText: { color: '#EF4444', textAlign: 'center', fontSize: 16 },
    retryButton: { marginTop: 12, alignSelf: 'center', padding: 12, backgroundColor: '#6366F1', borderRadius: 8 },
    retryText: { color: '#FFFFFF', fontWeight: '600' },
});
