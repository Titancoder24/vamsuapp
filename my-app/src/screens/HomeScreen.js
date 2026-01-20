import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getStats, checkStreakStatus } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../features/Reference/theme/ThemeContext';
import { useWebStyles } from '../components/WebContainer';
import { checkNewsMatches } from '../services/NewsMatchService';
import CreditsBadge from '../components/CreditsBadge';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const { horizontalPadding, isWeb } = useWebStyles();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState({ totalTests: 0, correctAnswers: 0, totalQuestions: 0 });
  const [streak, setStreak] = useState({ currentStreak: 0 });

  // Notification State
  const [newsMatches, setNewsMatches] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Get first name from user
  const firstName = user?.name?.split(' ')[0] || 'Aspirant';

  useFocusEffect(
    useCallback(() => {
      loadStats();
      checkForNewsMatches();
    }, [])
  );

  // Check for matches periodically or on focus
  const checkForNewsMatches = async () => {
    setLoadingMatches(true);
    try {
      const matches = await checkNewsMatches();
      setNewsMatches(matches);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const loadStats = async () => {
    const [statsData, streakData] = await Promise.all([
      getStats(),
      checkStreakStatus(),
    ]);
    setStats(statsData);
    setStreak(streakData);
  };

  const avgScore = stats.totalQuestions > 0
    ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
    : 0;

  const mainFeatures = [
    // 1. News Feed
    {
      id: 'articles',
      icon: 'newspaper-outline',
      title: 'News Feed',
      desc: 'Current affairs & more',
      gradient: ['#8B5CF6', '#7C3AED'],
      screen: 'Articles',
    },
    // 2. MCQ Generator
    {
      id: 'aimcq',
      icon: 'create-outline',
      title: 'MCQ Generator',
      desc: 'Generate by topic',
      gradient: ['#007AFF', '#0055D4'],
      screen: 'AIMCQGenerator',
    },
    // 3. AI Mind Map
    {
      id: 'aimindmap',
      icon: 'git-network-outline',
      title: 'AI Mind Map',
      desc: 'AI-powered diagrams',
      gradient: ['#06B6D4', '#0891B2'],
      screen: 'AIMindMap',
    },
    // 4. PDF to MCQ
    {
      id: 'pdfmcq',
      icon: 'document-attach-outline',
      title: 'PDF to MCQ',
      desc: 'Generate from PDF',
      gradient: ['#FF2D55', '#FF375F'],
      screen: 'PDFMCQGenerator',
    },
    // 5. AI Essay Writing
    {
      id: 'essay',
      icon: 'document-text-outline',
      title: 'AI Essay Writing',
      desc: 'Practice essay topics',
      gradient: ['#FF9500', '#E68600'],
      screen: 'Essay',
    },
    // 6. Notes
    {
      id: 'notes',
      icon: 'create-outline',
      title: 'Notes',
      desc: 'Create & organize notes',
      gradient: ['#6366F1', '#8B5CF6'],
      screen: 'Notes',
    },
    // 7. Question Paper
    {
      id: 'questionpaper',
      icon: 'documents-outline',
      title: 'Question Paper',
      desc: 'Practice Questions',
      gradient: ['#F59E0B', '#D97706'],
      screen: 'QuestionSetList',
    },
    // ========== COMING SOON FEATURES ==========
    {
      id: 'bank',
      icon: 'folder-outline',
      title: 'Question Bank',
      desc: 'Your saved questions',
      gradient: ['#5856D6', '#4845B5'],
      screen: 'ComingSoon',
      comingSoon: true,
    },
    {
      id: 'reference',
      icon: 'library-outline',
      title: 'Visual Reference',
      desc: 'Maps, timelines & more',
      gradient: ['#FF6B6B', '#EE5A5A'],
      screen: 'ComingSoon',
      comingSoon: true,
    },
    {
      id: 'mindmap',
      icon: 'git-network-outline',
      title: 'Mind Map',
      desc: 'Visual knowledge graph',
      gradient: ['#14B8A6', '#0D9488'],
      screen: 'ComingSoon',
      comingSoon: true,
    },
    {
      id: 'progress',
      icon: 'stats-chart-outline',
      title: 'Progress',
      desc: 'Charts & analytics',
      gradient: ['#34C759', '#28A745'],
      screen: 'Progress',
    },
    {
      id: 'roadmap',
      icon: 'map-outline',
      title: 'Study Roadmap',
      desc: 'Your complete syllabus',
      gradient: ['#667eea', '#764ba2'],
      screen: 'ComingSoon',
      comingSoon: true,
    },
    {
      id: 'daily',
      icon: 'calendar-outline',
      title: "Today's Plan",
      desc: 'Daily study goals',
      gradient: ['#10B981', '#059669'],
      screen: 'ComingSoon',
      comingSoon: true,
    },
    {
      id: 'mcq',
      icon: 'sparkles-outline',
      title: 'Generate MCQs',
      desc: 'Create custom questions',
      gradient: ['#3B82F6', '#2563EB'],
      screen: 'ComingSoon',
      comingSoon: true,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding || 20 }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Hello, {firstName} 👋</Text>
              <Text style={[styles.title, { color: theme.colors.text }]}>UPSC Prep</Text>
            </View>

            <View style={styles.headerActions}>
              {/* Credits Badge - Shows actual credits */}
              <CreditsBadge />

              {/* Notification Bell */}
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => setShowNotifications(true)}
              >
                <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
                {newsMatches.length > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationCount}>
                      {newsMatches.length > 9 ? '9+' : newsMatches.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Settings Button */}
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => navigation.navigate('Settings')}
              >
                <Ionicons name="settings-outline" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Your daily preparation companion</Text>
        </View>

        {/* Streak Banner */}
        {streak.currentStreak > 0 && (
          <TouchableOpacity
            style={[styles.streakBanner, { backgroundColor: theme.colors.warning }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Progress')}
          >
            <Text style={styles.streakFire}>🔥</Text>
            <View style={styles.streakInfo}>
              <Text style={styles.streakText}>{streak.currentStreak} Day Streak!</Text>
              <Text style={styles.streakSubtext}>Keep it going!</Text>
            </View>
            <Text style={styles.streakArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Stats Card */}


        {/* Main Features */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Start Learning</Text>
        <View style={[styles.grid, (isWeb && width > 600) && styles.gridWeb]}>
          {mainFeatures.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[
                styles.featureCard,
                { backgroundColor: theme.colors.surface },
                (isWeb && width > 600) && styles.featureCardWeb,
                feature.comingSoon && styles.featureCardComingSoon
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(feature.screen, {
                type: feature.id,
                featureName: feature.title
              })}
            >
              <LinearGradient
                colors={feature.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featureGradient}
              >
                <Ionicons name={feature.icon} size={24} color="#FFFFFF" />
              </LinearGradient>
              {feature.comingSoon && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              )}
              <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{feature.title}</Text>
              <Text style={[styles.featureDesc, { color: theme.colors.textSecondary }]}>{feature.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Topics */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Popular Topics</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicsScroll}>
          {['Indian Polity', 'Geography', 'Economy', 'History', 'Science & Tech', 'Environment'].map((topic, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.topicChip, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Config', { topic })}
            >
              <Text style={[styles.topicText, { color: theme.colors.primary }]}>{topic}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: theme.colors.surface, opacity: 0.7 }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ComingSoon', { feature: 'Practice from Bank' })}
          >
            <View style={[styles.quickActionIconWrapper, { backgroundColor: isDark ? '#312E81' : '#EEF2FF' }]}>
              <Ionicons name="library" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.quickActionInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.quickActionTitle, { color: theme.colors.text }]}>Practice from Bank</Text>
                <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '700' }}>SOON</Text>
                </View>
              </View>
              <Text style={[styles.quickActionDesc, { color: theme.colors.textSecondary }]}>Review your saved questions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: theme.colors.surface, opacity: 0.7 }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ComingSoon', { feature: 'View Progress' })}
          >
            <View style={[styles.quickActionIconWrapper, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
              <Ionicons name="trending-up" size={24} color={theme.colors.success} />
            </View>
            <View style={styles.quickActionInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.quickActionTitle, { color: theme.colors.text }]}>View Progress</Text>
                <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '700' }}>SOON</Text>
                </View>
              </View>
              <Text style={[styles.quickActionDesc, { color: theme.colors.textSecondary }]}>Track your improvement</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Motivational Card */}
        <View style={[styles.motivationCard, { backgroundColor: isDark ? theme.colors.surface : '#1C1C1E' }]}>
          <Text style={styles.motivationQuote}>
            "Success is not final, failure is not fatal: it is the courage to continue that counts."
          </Text>
          <Text style={[styles.motivationAuthor, { color: theme.colors.textSecondary }]}>— Winston Churchill</Text>
        </View>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Knowledge Radar 📡
              </Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              News matching your study notes
            </Text>

            <FlatList
              data={newsMatches}
              keyExtractor={(item, index) => `${item.articleId}-${index}`}
              contentContainerStyle={styles.matchesList}
              ListEmptyComponent={
                <View style={styles.emptyMatches}>
                  <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyMatchesText, { color: theme.colors.textSecondary }]}>
                    No current affairs match your notes right now. Keep studying!
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.matchCard, { backgroundColor: isDark ? '#333' : '#F9F9F9' }]}
                  onPress={() => {
                    setShowNotifications(false);
                    navigation.navigate('ArticleDetail', { articleId: item.articleId });
                  }}
                >
                  <View style={styles.matchBadge}>
                    <Ionicons name="bookmark" size={12} color="#FFFFFF" />
                    <Text style={styles.matchBadgeText}>{item.matchReason}</Text>
                  </View>
                  <Text style={[styles.matchTitle, { color: theme.colors.text }]}>{item.articleTitle}</Text>
                  {item.articleSummary && (
                    <Text style={[styles.matchSummary, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                      {item.articleSummary}
                    </Text>
                  )}
                  <View style={styles.matchFooter}>
                    <Text style={[styles.tapToRead, { color: theme.colors.primary }]}>Tap to read Article →</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.8,
    marginTop: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  creditsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  creditsButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // settingsIcon removed - using Ionicons settings-outline
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  streakBanner: {
    backgroundColor: '#FF9500',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  streakFire: {
    fontSize: 32,
    marginRight: 12,
  },
  streakInfo: {
    flex: 1,
  },
  streakText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  streakSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  streakArrow: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 4,
    letterSpacing: -0.2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  gridWeb: {
    gap: 16,
    justifyContent: 'flex-start',
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
  },
  featureCardWeb: {
    width: 180,
    marginBottom: 0,
  },
  featureCardComingSoon: {
    opacity: 0.7,
  },
  featureGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comingSoonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  topicsScroll: {
    marginBottom: 28,
  },
  topicChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topicText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
    letterSpacing: -0.3,
  },
  quickActions: {
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  quickActionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  quickActionInfo: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  quickActionDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  // quickActionArrow removed - using Ionicons chevron-forward
  motivationCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
  },
  motivationQuote: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    fontStyle: 'italic',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  motivationAuthor: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 12,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  matchesList: {
    paddingBottom: 40,
  },
  matchCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
    gap: 4,
  },
  matchBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  matchSummary: {
    fontSize: 13,
    marginBottom: 10,
    opacity: 0.8,
  },
  matchFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  tapToRead: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyMatches: {
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyMatchesText: {
    textAlign: 'center',
    fontSize: 15,
  }
});
