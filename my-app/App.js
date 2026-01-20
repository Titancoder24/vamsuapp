import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RoadmapProvider } from './src/context/RoadmapContext';
import { VisualReferenceProvider } from './src/context/VisualReferenceContext';
import { WebLayout } from './src/components/WebContainer';

// Auth Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';

// Main App Screens
import HomeScreen from './src/screens/HomeScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import QuestionsListScreen from './src/screens/QuestionsListScreen';
import TestScreen from './src/screens/TestScreen';
import ResultScreen from './src/screens/ResultScreen';
import EssayScreen from './src/screens/EssayScreen';
import QuestionBankScreen from './src/screens/QuestionBankScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ArticlesScreen from './src/screens/ArticlesScreen';
import ArticleDetailScreen from './src/screens/ArticleDetailScreen';
import QuestionPaperScreen from './src/screens/QuestionPaperScreen';
import QuestionSetListScreen from './src/screens/QuestionSetListScreen';

// Roadmap Screens
import RoadmapScreen from './src/screens/RoadmapScreen';
import TopicDetailScreen from './src/screens/TopicDetailScreen';
import DailyPlanScreen from './src/screens/DailyPlanScreen';
import UserPreferencesScreen from './src/screens/UserPreferencesScreen';

// Visual Reference Screens
import {
  ReferenceScreen,
  HistoryTimelineScreen,
  PolityFlowScreen,
  GeographyViewScreen,
  EconomyCardsScreen,
  EnvironmentCardsScreen,
  ScienceTechViewScreen,
  ThemeProvider as ReferenceThemeProvider,
} from './src/features/Reference';

// Mind Map Screens
import { MindMapScreen, MindMapListScreen, AIMindMapScreen, AIMindMapListScreen } from './src/features/MindMap';

// Notes Screens
import {
  NoteListScreen,
  NoteEditorScreen,
  NotePreviewScreen,
  UPSCNotesScreen,
  WebClipperScreen,
  CreateNoteScreen,
  NoteDetailScreen,
} from './src/features/Notes';

// PDF MCQ Screens
import { PDFGeneratorScreen, PDFMCQListScreen, AIMCQGeneratorScreen, AIMCQListScreen } from './src/features/PDFMCQ';

// Coming Soon Screen
import ComingSoonScreen from './src/screens/ComingSoonScreen';

// Billing Screen
import BillingScreen from './src/screens/BillingScreen';

const Stack = createNativeStackNavigator();

// Loading Screen
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#8E54E9" />
  </View>
);

// Auth Navigator (Welcome + Login)
const AuthNavigator = () => {
  const { isFirstLaunch } = useAuth();

  return (
    <Stack.Navigator
      initialRouteName={isFirstLaunch ? 'Welcome' : 'Login'}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

// Main App Navigator
const MainNavigator = () => (
  <Stack.Navigator
    initialRouteName="Home"
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#F2F2F7' },
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Config" component={ConfigScreen} />
    <Stack.Screen name="QuestionsList" component={QuestionsListScreen} />
    <Stack.Screen name="Test" component={TestScreen} />
    <Stack.Screen name="Result" component={ResultScreen} />
    <Stack.Screen name="Essay" component={EssayScreen} />
    <Stack.Screen name="QuestionBank" component={QuestionBankScreen} />
    <Stack.Screen name="Progress" component={ProgressScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Roadmap" component={RoadmapScreen} />
    <Stack.Screen name="TopicDetail" component={TopicDetailScreen} />
    <Stack.Screen name="DailyPlan" component={DailyPlanScreen} />
    <Stack.Screen name="UserPreferences" component={UserPreferencesScreen} />
    {/* Visual Reference Screens */}
    <Stack.Screen name="Reference" component={ReferenceScreen} />
    <Stack.Screen name="HistoryTimeline" component={HistoryTimelineScreen} />
    <Stack.Screen name="PolityFlow" component={PolityFlowScreen} />
    <Stack.Screen name="GeographyView" component={GeographyViewScreen} />
    <Stack.Screen name="EconomyCards" component={EconomyCardsScreen} />
    <Stack.Screen name="EnvironmentCards" component={EnvironmentCardsScreen} />
    <Stack.Screen name="ScienceTechView" component={ScienceTechViewScreen} />
    {/* Articles Screens */}
    <Stack.Screen name="Articles" component={ArticlesScreen} />
    <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
    {/* Mind Map Screens */}
    <Stack.Screen name="MindMap" component={MindMapListScreen} />
    <Stack.Screen name="MindMapEditor" component={MindMapScreen} />
    {/* AI Mind Map Screens */}
    <Stack.Screen name="AIMindMap" component={AIMindMapListScreen} />
    <Stack.Screen name="AIMindMapEditor" component={AIMindMapScreen} />
    {/* Notes Screens */}
    <Stack.Screen name="Notes" component={UPSCNotesScreen} />
    <Stack.Screen name="WebClipperScreen" component={WebClipperScreen} />
    <Stack.Screen name="CreateNoteScreen" component={CreateNoteScreen} />
    <Stack.Screen name="NoteDetailScreen" component={NoteDetailScreen} />
    <Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
    <Stack.Screen name="NotePreview" component={NotePreviewScreen} />
    {/* PDF MCQ Generator */}
    <Stack.Screen name="PDFMCQGenerator" component={PDFGeneratorScreen} />
    <Stack.Screen name="PDFMCQList" component={PDFMCQListScreen} />
    {/* AI MCQ Generator (without PDF upload) */}
    <Stack.Screen name="AIMCQGenerator" component={AIMCQGeneratorScreen} />
    <Stack.Screen name="AIMCQList" component={AIMCQListScreen} />
    <Stack.Screen name="QuestionPaper" component={QuestionPaperScreen} />
    <Stack.Screen name="QuestionSetList" component={QuestionSetListScreen} />
    {/* Coming Soon */}
    <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
    {/* Billing */}
    <Stack.Screen name="Billing" component={BillingScreen} />
  </Stack.Navigator>
);

// Root Navigator
const RootNavigator = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen
          name="Main"
          component={MainNavigator}
          options={{ animation: 'fade' }}
        />
      ) : (
        <Stack.Screen
          name="Auth"
          component={AuthNavigator}
          options={{ animation: 'fade' }}
        />
      )}
    </Stack.Navigator>
  );
};

import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'upscprep://'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: 'home',
          Notes: 'notes',
          WebClipperScreen: 'clip',
          CreateNoteScreen: 'create-note',
          NoteDetailScreen: 'note/:noteId',
          Roadmap: 'roadmap',
          QuestionSetList: 'questions',
          Essay: 'essay',
          Reference: 'reference',
          MindMap: 'mindmap',
          PDFMCQGenerator: 'pdf-mcq',
          AIMCQGenerator: 'ai-mcq',
          Progress: 'progress',
          Settings: 'settings',
        },
      },
      Auth: {
        screens: {
          Welcome: 'welcome',
          Login: 'login',
        },
      },
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RoadmapProvider>
          <VisualReferenceProvider>
            <ReferenceThemeProvider>
              <WebLayout>
                <NavigationContainer linking={linking} fallback={<LoadingScreen />}>
                  <StatusBar style="dark" />
                  <RootNavigator />
                </NavigationContainer>
              </WebLayout>
            </ReferenceThemeProvider>
          </VisualReferenceProvider>
        </RoadmapProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFF',
  },
});
