/**
 * AI MCQ List Screen
 * Shows list of all AI-generated MCQ sessions stored locally
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

// @ts-ignore
import { useTheme } from '../../Reference/theme/ThemeContext';
import {
    AIMCQSession,
    getAllMCQSessions,
    deleteMCQSession,
    getSessionStats,
} from '../utils/aiMCQStorage';

interface AIMCQListScreenProps {
    navigation: any;
}

const AIMCQListScreen: React.FC<AIMCQListScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const colors = theme.colors;

    const [sessions, setSessions] = useState<AIMCQSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Load sessions
    const loadSessions = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            const data = await getAllMCQSessions();
            setSessions(data);
        } catch (error) {
            console.error('Failed to load MCQ sessions:', error);
            Alert.alert('Error', 'Failed to load saved MCQs. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Load on mount
    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    // Reload on focus
    useFocusEffect(
        useCallback(() => {
            loadSessions(false);
        }, [loadSessions])
    );

    // Delete session
    const handleDelete = (item: AIMCQSession) => {
        Alert.alert(
            'Delete MCQ Session',
            `Are you sure you want to delete "${item.title}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteMCQSession(item.id);
                            setSessions(prev => prev.filter(s => s.id !== item.id));
                        } catch (error) {
                            console.error('Failed to delete session:', error);
                            Alert.alert('Error', 'Failed to delete MCQ session.');
                        }
                    },
                },
            ]
        );
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Render session item
    const renderItem = ({ item }: { item: AIMCQSession }) => {
        const stats = getSessionStats(item);
        const hasAnswers = stats.answered > 0;

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                onPress={() => navigation.navigate('AIMCQGenerator', { sessionId: item.id })}
                activeOpacity={0.7}
            >
                <View style={[styles.cardIcon, { backgroundColor: hasAnswers ? colors.primaryLight : colors.surfaceSecondary }]}>
                    <Ionicons
                        name={hasAnswers ? 'checkmark-circle' : 'document-text-outline'}
                        size={24}
                        color={hasAnswers ? colors.primary : colors.textTertiary}
                    />
                </View>

                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <View style={styles.cardMeta}>
                        <Text style={[styles.cardDate, { color: colors.textTertiary }]}>
                            {formatDate(item.createdAt)}
                        </Text>
                        <View style={[styles.mcqBadge, { backgroundColor: colors.surfaceSecondary }]}>
                            <Text style={[styles.mcqCount, { color: colors.textSecondary }]}>
                                {item.mcqs.length} MCQs
                            </Text>
                        </View>
                        {hasAnswers && (
                            <View style={[styles.scoreBadge, { backgroundColor: stats.percentage >= 70 ? '#D1FAE5' : stats.percentage >= 40 ? '#FEF3C7' : '#FEE2E2' }]}>
                                <Text style={[styles.scoreText, { color: stats.percentage >= 70 ? '#065F46' : stats.percentage >= 40 ? '#92400E' : '#991B1B' }]}>
                                    {stats.percentage}%
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.tagsRow}>
                        <View style={[styles.tag, { backgroundColor: isDark ? '#2A2A2E' : '#F3F4F6' }]}>
                            <Text style={[styles.tagText, { color: colors.textSecondary }]}>{item.examType.toUpperCase()}</Text>
                        </View>
                        <View style={[styles.tag, { backgroundColor: isDark ? '#2A2A2E' : '#F3F4F6' }]}>
                            <Text style={[styles.tagText, { color: colors.textSecondary }]}>{item.paperType}</Text>
                        </View>
                        <View style={[styles.tag, { backgroundColor: isDark ? '#2A2A2E' : '#F3F4F6' }]}>
                            <Text style={[styles.tagText, { color: colors.textSecondary }]}>{item.difficulty}</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' }]}
                    onPress={() => handleDelete(item)}
                >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    // Empty state
    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="document-text" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Saved MCQs Yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Generate UPSC-level MCQs using AI. All your sessions will be saved here automatically.
            </Text>
            <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('AIMCQGenerator')}
            >
                <Ionicons name="sparkles" size={20} color="#FFF" />
                <Text style={styles.emptyBtnText}>Generate New MCQs</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading saved MCQs...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
                <TouchableOpacity
                    style={[styles.headerBtn, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Ionicons name="document-text" size={24} color={colors.primary} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>My MCQs</Text>
                    <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.countText, { color: colors.primary }]}>{sessions.length}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.createBtn, { backgroundColor: colors.primary }]}
                    onPress={() => navigation.navigate('AIMCQGenerator')}
                >
                    <Ionicons name="add" size={22} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Info Banner */}
            <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}>
                <Ionicons name="save-outline" size={18} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.primary }]}>
                    All MCQs are saved locally on your device
                </Text>
            </View>

            {/* List */}
            <FlatList
                data={sessions}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.list, sessions.length === 0 && styles.listEmpty]}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadSessions(false);
                        }}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 14 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    countText: { fontSize: 13, fontWeight: '600' },
    createBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    infoText: { fontSize: 13, fontWeight: '500' },

    list: { padding: 16 },
    listEmpty: { flex: 1 },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    cardIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    cardContent: { flex: 1, marginLeft: 14 },
    cardTitle: { fontSize: 16, fontWeight: '600' },
    cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
    cardDate: { fontSize: 11 },
    mcqBadge: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 8,
    },
    mcqCount: { fontSize: 10, fontWeight: '500' },
    scoreBadge: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 8,
    },
    scoreText: { fontSize: 10, fontWeight: '600' },
    tagsRow: { flexDirection: 'row', marginTop: 6, gap: 6, flexWrap: 'wrap' },
    tag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
    tagText: { fontSize: 10, fontWeight: '500', textTransform: 'capitalize' },
    deleteBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 22, fontWeight: '700' },
    emptyText: { fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 22 },
    emptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        marginTop: 28,
        gap: 8,
    },
    emptyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

export default AIMCQListScreen;
