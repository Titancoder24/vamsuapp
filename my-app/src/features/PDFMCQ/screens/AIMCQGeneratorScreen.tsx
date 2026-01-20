/**
 * AI MCQ Generator Screen
 * 
 * Generates UPSC-level MCQs using AI based on:
 * - Exam Type (Prelims/Mains)
 * - Paper Type (GS1, GS2, GS3, GS4, Optional)
 * - Difficulty Level (Beginner, Pro, Advanced)
 * - Language (English/Hindi)
 * - Number of Questions
 * 
 * Works on: Web, iOS, Android
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
// @ts-ignore
import { useTheme } from '../../Reference/theme/ThemeContext';
// @ts-ignore
import { useWebStyles } from '../../../components/WebContainer';
import { OPENROUTER_API_KEY } from '../../../utils/secureKey';
import { useAIFeature, CreditInfoBanner } from '../../../hooks/useAIFeature';
import {
    createMCQSession,
    saveMCQSession,
    updateSessionAnswer,
    getStorageInfo,
    AIMCQSession
} from '../utils/aiMCQStorage';

// ===================== CONFIGURATION =====================
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3-flash-preview';

// ===================== TYPES =====================
interface MCQ {
    id: number;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
}

type DifficultyLevel = 'beginner' | 'pro' | 'advanced';
type ExamType = 'prelims' | 'mains';
type PaperType = 'GS1' | 'GS2' | 'GS3' | 'GS4' | 'Optional';
type Language = 'english' | 'hindi';

// ===================== PAPER TOPICS =====================
const PAPER_TOPICS: Record<PaperType, string> = {
    GS1: 'History, Geography, Art & Culture, Indian Society',
    GS2: 'Polity, Governance, Constitution, International Relations, Social Justice',
    GS3: 'Economy, Environment, Science & Technology, Disaster Management, Security',
    GS4: 'Ethics, Integrity, Aptitude, Case Studies',
    Optional: 'General Knowledge across all subjects'
};

// ===================== WORLD-CLASS MCQ PROMPT =====================
const buildPrompt = (
    examType: ExamType,
    paperType: PaperType,
    difficulty: DifficultyLevel,
    language: Language,
    count: number,
    preferences: string
) => {
    const difficultyText = {
        beginner: 'BEGINNER level - Test basic factual knowledge with clear, direct questions. 70-80% of aspirants should answer correctly.',
        pro: 'INTERMEDIATE level (UPSC Prelims standard) - Require conceptual understanding, not just memorization. Include application-based questions with plausible distractors. 40-60% of aspirants should answer correctly.',
        advanced: 'EXPERT level (Top 0.1% aspirants) - Test deep analytical ability with multi-concept questions. Include statement-based questions with subtle distinctions. Only 15-25% of serious aspirants should answer correctly.'
    };

    const topicFocus = preferences ? `\nSPECIFIC FOCUS: ${preferences}` : '';

    return `You are India's most elite UPSC question setter, known for creating questions that appear in actual Civil Services Examinations.

TASK: Generate ${count} world-class Multiple Choice Questions for UPSC ${examType.toUpperCase()}.

SUBJECT AREA: ${PAPER_TOPICS[paperType]}${topicFocus}

DIFFICULTY: ${difficultyText[difficulty]}

LANGUAGE: ${language === 'hindi' ? 'Generate everything in Hindi (हिंदी में)' : 'Generate in English'}

QUALITY STANDARDS:
• Questions must match actual UPSC examination standards
• Each question tests genuine understanding, not trivia
• Options must be carefully crafted - all should be plausible
• Exactly ONE correct answer per question
• Explanations must cite sources, facts, and reasoning
• No ambiguous or controversial statements

OUTPUT FORMAT - Return ONLY valid JSON (no markdown, no explanation):
{
  "questions": [
    {
      "question": "The question text here",
      "options": [
        {"text": "Option A text", "isCorrect": false},
        {"text": "Option B text", "isCorrect": true},
        {"text": "Option C text", "isCorrect": false},
        {"text": "Option D text", "isCorrect": false}
      ],
      "explanation": "Detailed explanation with reasoning and source references"
    }
  ]
}

Generate ${count} questions now:`;
};

// ===================== MCQ GENERATION =====================
async function generateMCQs(
    examType: ExamType,
    paperType: PaperType,
    difficulty: DifficultyLevel,
    language: Language,
    count: number,
    preferences: string
): Promise<MCQ[]> {
    console.log('[MCQ] Starting generation...');
    console.log('[MCQ] API Key present:', !!OPENROUTER_API_KEY);
    console.log('[MCQ] API Key length:', OPENROUTER_API_KEY?.length);

    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.length < 10) {
        throw new Error('API key not configured. Please check your setup.');
    }

    const prompt = buildPrompt(examType, paperType, difficulty, language, count, preferences);
    console.log('[MCQ] Prompt built, length:', prompt.length);

    try {
        console.log('[MCQ] Sending request to:', API_URL);
        console.log('[MCQ] Using model:', MODEL);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://upsc-prep.app',
                'X-Title': 'UPSC Prep MCQ Generator',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 8192,
            })
        });

        console.log('[MCQ] Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[MCQ] API Error:', errorText);
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[MCQ] Response received');

        if (!data.choices?.[0]?.message?.content) {
            throw new Error('No content in response');
        }

        const content = data.choices[0].message.content;
        console.log('[MCQ] Content length:', content.length);

        // Parse JSON from response
        let parsed;
        try {
            // Try direct parse
            parsed = JSON.parse(content);
        } catch {
            // Try extracting from code block
            const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) {
                parsed = JSON.parse(match[1].trim());
            } else {
                // Try finding JSON object
                const objMatch = content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
                if (objMatch) {
                    parsed = JSON.parse(objMatch[0]);
                } else {
                    throw new Error('Could not parse response');
                }
            }
        }

        if (!parsed?.questions?.length) {
            throw new Error('No questions in response');
        }

        console.log('[MCQ] Parsed', parsed.questions.length, 'questions');

        return parsed.questions.map((q: any, i: number) => {
            const opts = q.options || [];
            let correct = 'A';
            if (opts[1]?.isCorrect) correct = 'B';
            if (opts[2]?.isCorrect) correct = 'C';
            if (opts[3]?.isCorrect) correct = 'D';

            return {
                id: i + 1,
                question: q.question || '',
                optionA: opts[0]?.text || '',
                optionB: opts[1]?.text || '',
                optionC: opts[2]?.text || '',
                optionD: opts[3]?.text || '',
                correctAnswer: correct,
                explanation: q.explanation || ''
            };
        });

    } catch (error: any) {
        console.error('[MCQ] Error:', error.message);
        throw error;
    }
}

// ===================== EXPORT UTILITIES =====================
function downloadFile(content: string, filename: string, mimeType: string): void {
    if (Platform.OS !== 'web') {
        Alert.alert('Export', 'Export is only available on web');
        return;
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportToCSV(mcqs: MCQ[], answers: Record<number, string>): void {
    const headers = ['Q.No', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Your Answer', 'Result', 'Explanation'];
    const rows = mcqs.map((m, i) => {
        const userAnswer = answers[m.id] || 'Not Answered';
        const isCorrect = userAnswer === m.correctAnswer ? 'Correct' : (userAnswer === 'Not Answered' ? 'Skipped' : 'Wrong');
        return [
            i + 1,
            `"${m.question.replace(/"/g, '""')}"`,
            `"${m.optionA.replace(/"/g, '""')}"`,
            `"${m.optionB.replace(/"/g, '""')}"`,
            `"${m.optionC.replace(/"/g, '""')}"`,
            `"${m.optionD.replace(/"/g, '""')}"`,
            m.correctAnswer,
            userAnswer,
            isCorrect,
            `"${m.explanation.replace(/"/g, '""')}"`
        ].join(',');
    });
    downloadFile([headers.join(','), ...rows].join('\n'), 'mcq-results.csv', 'text/csv');
}

function exportToXLSX(mcqs: MCQ[], answers: Record<number, string>): void {
    const escapeXml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="MCQ Results"><Table>
<Row><Cell><Data ss:Type="String">Q.No</Data></Cell><Cell><Data ss:Type="String">Question</Data></Cell><Cell><Data ss:Type="String">Option A</Data></Cell><Cell><Data ss:Type="String">Option B</Data></Cell><Cell><Data ss:Type="String">Option C</Data></Cell><Cell><Data ss:Type="String">Option D</Data></Cell><Cell><Data ss:Type="String">Correct</Data></Cell><Cell><Data ss:Type="String">Your Answer</Data></Cell><Cell><Data ss:Type="String">Result</Data></Cell><Cell><Data ss:Type="String">Explanation</Data></Cell></Row>`;

    mcqs.forEach((m, i) => {
        const ua = answers[m.id] || 'Not Answered';
        const result = ua === m.correctAnswer ? 'Correct' : (ua === 'Not Answered' ? 'Skipped' : 'Wrong');
        xml += `<Row><Cell><Data ss:Type="Number">${i + 1}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(m.question)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(m.optionA)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(m.optionB)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(m.optionC)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(m.optionD)}</Data></Cell><Cell><Data ss:Type="String">${m.correctAnswer}</Data></Cell><Cell><Data ss:Type="String">${ua}</Data></Cell><Cell><Data ss:Type="String">${result}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(m.explanation)}</Data></Cell></Row>`;
    });

    xml += `</Table></Worksheet></Workbook>`;
    downloadFile(xml, 'mcq-results.xls', 'application/vnd.ms-excel');
}

function exportToPDF(mcqs: MCQ[], answers: Record<number, string>): void {
    if (Platform.OS !== 'web') {
        Alert.alert('Export', 'Export is only available on web');
        return;
    }

    let correct = 0, answered = 0;
    mcqs.forEach(m => {
        if (answers[m.id]) {
            answered++;
            if (answers[m.id] === m.correctAnswer) correct++;
        }
    });
    const scorePercent = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MCQ Results Report</title>
<style>
body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto}
h1{color:#1a1a1a;text-align:center;border-bottom:2px solid #4F46E5;padding-bottom:10px}
.summary{background:#f0f9ff;padding:15px;border-radius:8px;margin:20px 0;text-align:center}
.score{font-size:32px;font-weight:bold;color:${scorePercent >= 70 ? '#10B981' : scorePercent >= 40 ? '#F59E0B' : '#EF4444'}}
.mcq{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:15px;margin:15px 0}
.question{font-weight:bold;font-size:14px;margin-bottom:10px}
.option{padding:5px 10px;margin:3px 0;border-radius:4px}
.correct{background:#d1fae5;border-left:3px solid #10B981}
.wrong{background:#fee2e2;border-left:3px solid #EF4444}
.explanation{background:#f3f4f6;padding:10px;border-radius:4px;font-size:12px;margin-top:10px}
.result-tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold}
.result-correct{background:#10B981;color:white}
.result-wrong{background:#EF4444;color:white}
.result-skipped{background:#9CA3AF;color:white}
@media print{body{padding:0}.mcq{page-break-inside:avoid}}
</style></head>
<body><h1>MCQ Results Report</h1>
<div class="summary"><h2>Your Score</h2><div class="score">${scorePercent}%</div><p>${correct} correct out of ${answered} answered (${mcqs.length} total)</p></div>
${mcqs.map((m, i) => {
        const ua = answers[m.id];
        const ic = ua === m.correctAnswer;
        const rc = !ua ? 'result-skipped' : ic ? 'result-correct' : 'result-wrong';
        const rt = !ua ? 'Skipped' : ic ? 'Correct' : 'Wrong';
        return `<div class="mcq"><div class="question">Q${i + 1}. ${m.question} <span class="result-tag ${rc}">${rt}</span></div>
<div class="options">${['A', 'B', 'C', 'D'].map(o => {
            const ot = m[`option${o}` as keyof MCQ];
            const ico = m.correctAnswer === o;
            const iua = ua === o;
            let oc = '';
            if (ico) oc = 'correct';
            else if (iua && !ic) oc = 'wrong';
            return `<div class="option ${oc}">${o}. ${ot} ${ico ? '✓' : ''}</div>`;
        }).join('')}</div>
<div class="explanation"><strong>Explanation:</strong> ${m.explanation}</div></div>`;
    }).join('')}
<p style="text-align:center;color:#9CA3AF;margin-top:30px">Generated by AI MCQ Generator</p></body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }
}


// ===================== MAIN COMPONENT =====================
export default function AIMCQGeneratorScreen() {
    const { theme, isDark } = useTheme();
    const { horizontalPadding } = useWebStyles();
    const navigation = useNavigation<any>();

    // AI Feature credit management (3 credits for MCQ generation)
    const { canUse, credits, cost, executeWithCredits, showInsufficientCreditsAlert } = useAIFeature('mcq_generator');

    const [examType, setExamType] = useState<ExamType>('prelims');
    const [paperType, setPaperType] = useState<PaperType>('GS1');
    const [difficulty, setDifficulty] = useState<DifficultyLevel>('pro');
    const [language, setLanguage] = useState<Language>('english');
    const [questionCount, setQuestionCount] = useState('10');
    const [preferences, setPreferences] = useState('');

    const [mcqs, setMcqs] = useState<MCQ[]>([]);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [showResults, setShowResults] = useState<Record<number, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentSession, setCurrentSession] = useState<AIMCQSession | null>(null);

    // Get storage info for display
    const storageInfo = getStorageInfo();

    const handleGenerate = async () => {
        // Check if user has enough credits (3 credits for MCQ generation)
        if (!canUse) {
            showInsufficientCreditsAlert();
            return;
        }

        // Use credits when starting generation
        await executeWithCredits(async () => {
            setIsLoading(true);
            setError('');
            setMcqs([]);
            setSelectedAnswers({});
            setShowResults({});
            setCurrentSession(null);

            try {
                const count = Math.min(30, Math.max(1, parseInt(questionCount) || 10));
                const result = await generateMCQs(examType, paperType, difficulty, language, count, preferences);
                if (!result.length) throw new Error('No MCQs generated');
                setMcqs(result);

                // Save to local storage
                const title = `${paperType} ${examType.toUpperCase()} - ${difficulty}`;
                const session = createMCQSession(title, examType, paperType, difficulty, language, result);
                await saveMCQSession(session);
                setCurrentSession(session);
                console.log('[MCQ] Session saved locally:', session.id);
            } catch (err: any) {
                console.error('[MCQ] Generation failed:', err);
                setError(err.message || 'Failed to generate MCQs. Please try again.');
            } finally {
                setIsLoading(false);
            }
        });
    };

    const handleSelectAnswer = async (id: number, opt: string) => {
        if (showResults[id]) return;
        setSelectedAnswers(p => ({ ...p, [id]: opt }));
        setShowResults(p => ({ ...p, [id]: true }));

        // Update session in local storage
        if (currentSession) {
            const updated = updateSessionAnswer(currentSession, id - 1, opt);
            await saveMCQSession(updated);
            setCurrentSession(updated);
        }
    };

    const handleReset = () => {
        setMcqs([]);
        setSelectedAnswers({});
        setShowResults({});
        setError('');
        setCurrentSession(null);
    };

    const getScore = () => {
        let correct = 0, answered = 0;
        mcqs.forEach(m => {
            if (selectedAnswers[m.id]) {
                answered++;
                if (selectedAnswers[m.id] === m.correctAnswer) correct++;
            }
        });
        return { correct, answered, total: mcqs.length };
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: horizontalPadding || 20 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>AI MCQ Generator</Text>
                <TouchableOpacity
                    style={[styles.savedBtn, { backgroundColor: theme.colors.primaryLight }]}
                    onPress={() => navigation.navigate('AIMCQList')}
                >
                    <Ionicons name="folder-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding || 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Local Storage Info Banner */}
                <View style={[styles.storageBanner, { backgroundColor: isDark ? '#1A2F1A' : '#D1FAE5', borderColor: isDark ? '#10B981' : '#10B981' }]}>
                    <Ionicons name="save-outline" size={18} color="#10B981" />
                    <Text style={[styles.storageBannerText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                        All generated MCQs are stored locally on your device. Nothing is uploaded to any server.
                    </Text>
                </View>

                {/* Form */}
                {mcqs.length === 0 && !isLoading && (
                    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <View style={[styles.accent, { backgroundColor: theme.colors.primary }]} />

                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                                <Ionicons name="sparkles" size={28} color={theme.colors.primary} />
                            </View>
                            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                                Generate UPSC MCQs with AI
                            </Text>
                            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                                Select your preferences and generate custom MCQs instantly
                            </Text>
                        </View>

                        {/* Difficulty */}
                        <Text style={[styles.label, { color: theme.colors.text }]}>Difficulty Level</Text>
                        <View style={styles.row}>
                            {(['beginner', 'pro', 'advanced'] as DifficultyLevel[]).map(d => {
                                const cfg = {
                                    beginner: { icon: 'leaf', color: '#10B981' },
                                    pro: { icon: 'flash', color: '#F59E0B' },
                                    advanced: { icon: 'flame', color: '#EF4444' }
                                }[d];
                                const active = difficulty === d;
                                return (
                                    <TouchableOpacity
                                        key={d}
                                        style={[styles.diffBtn, { backgroundColor: active ? cfg.color : (isDark ? '#333' : cfg.color + '20'), borderColor: cfg.color }]}
                                        onPress={() => setDifficulty(d)}
                                    >
                                        <Ionicons name={cfg.icon as any} size={18} color={active ? '#fff' : cfg.color} />
                                        <Text style={{ color: active ? '#fff' : theme.colors.text, fontWeight: '600' }}>
                                            {d.charAt(0).toUpperCase() + d.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Exam Type */}
                        <Text style={[styles.label, { color: theme.colors.text }]}>Exam Type</Text>
                        <View style={styles.row}>
                            {(['prelims', 'mains'] as ExamType[]).map(e => (
                                <TouchableOpacity
                                    key={e}
                                    style={[styles.optBtn, { backgroundColor: examType === e ? theme.colors.primary : 'transparent', borderColor: theme.colors.primary }]}
                                    onPress={() => setExamType(e)}
                                >
                                    <Text style={{ color: examType === e ? '#fff' : theme.colors.text }}>
                                        {e === 'prelims' ? 'Prelims' : 'Mains'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Paper Type */}
                        <Text style={[styles.label, { color: theme.colors.text }]}>Paper Type</Text>
                        <View style={styles.row}>
                            {(['GS1', 'GS2', 'GS3', 'GS4'] as PaperType[]).map(p => (
                                <TouchableOpacity
                                    key={p}
                                    style={[styles.optBtn, { backgroundColor: paperType === p ? theme.colors.primary : 'transparent', borderColor: theme.colors.primary }]}
                                    onPress={() => setPaperType(p)}
                                >
                                    <Text style={{ color: paperType === p ? '#fff' : theme.colors.text }}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Language */}
                        <Text style={[styles.label, { color: theme.colors.text }]}>Language</Text>
                        <View style={styles.row}>
                            {(['english', 'hindi'] as Language[]).map(l => (
                                <TouchableOpacity
                                    key={l}
                                    style={[styles.optBtn, { backgroundColor: language === l ? theme.colors.primary : 'transparent', borderColor: theme.colors.primary }]}
                                    onPress={() => setLanguage(l)}
                                >
                                    <Text style={{ color: language === l ? '#fff' : theme.colors.text }}>
                                        {l === 'english' ? 'English' : 'हिंदी'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Question Count */}
                        <Text style={[styles.label, { color: theme.colors.text }]}>Number of Questions</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDark ? '#333' : '#F0F0F5', color: theme.colors.text }]}
                            value={questionCount}
                            onChangeText={setQuestionCount}
                            keyboardType="number-pad"
                            maxLength={2}
                            placeholder="10"
                            placeholderTextColor={theme.colors.textSecondary}
                        />

                        {/* Preferences */}
                        <Text style={[styles.label, { color: theme.colors.text }]}>Specific Topics (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: isDark ? '#333' : '#F0F0F5', color: theme.colors.text }]}
                            value={preferences}
                            onChangeText={setPreferences}
                            placeholder="e.g., Focus on Indian Constitution amendments..."
                            placeholderTextColor={theme.colors.textSecondary}
                            multiline
                            numberOfLines={3}
                        />

                        {/* Error */}
                        {error && (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        {/* Generate Button */}
                        <TouchableOpacity style={styles.genBtn} onPress={handleGenerate} activeOpacity={0.8}>
                            <Ionicons name="sparkles-outline" size={22} color="#fff" />
                            <Text style={styles.genBtnText}>Generate MCQs</Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Loading */}
                {isLoading && (
                    <View style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={[styles.loadingIcon, { backgroundColor: '#F59E0B' }]}>
                            <ActivityIndicator size="large" color="#fff" />
                        </View>
                        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                            Generating {questionCount} MCQs...
                        </Text>
                        <Text style={[styles.loadingSubtext, { color: theme.colors.textSecondary }]}>
                            Creating world-class UPSC questions
                        </Text>
                    </View>
                )}

                {/* MCQ Results */}
                {mcqs.length > 0 && !isLoading && (
                    <>
                        {/* Score */}
                        {getScore().answered > 0 && (
                            <View style={[styles.scoreCard, { backgroundColor: theme.colors.surface }]}>
                                <Text style={[styles.scoreLabel, { color: theme.colors.text }]}>Your Score</Text>
                                <Text style={[styles.scoreValue, {
                                    color: getScore().correct / getScore().answered >= 0.7 ? '#10B981' :
                                        getScore().correct / getScore().answered >= 0.4 ? '#F59E0B' : '#EF4444'
                                }]}>
                                    {Math.round((getScore().correct / getScore().answered) * 100)}%
                                </Text>
                                <Text style={{ color: theme.colors.textSecondary }}>
                                    {getScore().correct}/{getScore().answered} correct
                                </Text>
                            </View>
                        )}

                        {/* Header */}
                        <View style={styles.mcqHeader}>
                            <Text style={[styles.mcqHeaderTitle, { color: theme.colors.text }]}>
                                {mcqs.length} MCQs Generated
                            </Text>
                            <TouchableOpacity onPress={handleReset}>
                                <Text style={{ color: '#EF4444', fontWeight: '600' }}>Reset</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Export */}
                        <View style={styles.exportRow}>
                            <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#EF4444' }]} onPress={() => exportToPDF(mcqs, selectedAnswers)}>
                                <Ionicons name="document-text" size={16} color="#fff" />
                                <Text style={styles.exportBtnText}>PDF</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#10B981' }]} onPress={() => exportToXLSX(mcqs, selectedAnswers)}>
                                <Ionicons name="grid" size={16} color="#fff" />
                                <Text style={styles.exportBtnText}>Excel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#3B82F6' }]} onPress={() => exportToCSV(mcqs, selectedAnswers)}>
                                <Ionicons name="download" size={16} color="#fff" />
                                <Text style={styles.exportBtnText}>CSV</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Questions */}
                        {mcqs.map((mcq, idx) => {
                            const selected = selectedAnswers[mcq.id];
                            const revealed = showResults[mcq.id];
                            const isCorrect = selected === mcq.correctAnswer;

                            return (
                                <View key={mcq.id} style={[styles.mcqCard, { backgroundColor: theme.colors.surface }]}>
                                    <Text style={[styles.mcqQ, { color: theme.colors.text }]}>
                                        {idx + 1}. {mcq.question}
                                    </Text>

                                    {(['A', 'B', 'C', 'D'] as const).map(opt => {
                                        const text = mcq[`option${opt}` as keyof MCQ] as string;
                                        const isSel = selected === opt;
                                        const isCorr = mcq.correctAnswer === opt;

                                        let bg = isDark ? '#2A2A2E' : '#F5F5F7';
                                        let border = 'transparent';

                                        if (revealed) {
                                            if (isCorr) { bg = '#10B98125'; border = '#10B981'; }
                                            else if (isSel && !isCorrect) { bg = '#EF444425'; border = '#EF4444'; }
                                        } else if (isSel) {
                                            bg = theme.colors.primary + '25';
                                            border = theme.colors.primary;
                                        }

                                        return (
                                            <TouchableOpacity
                                                key={opt}
                                                style={[styles.optCard, { backgroundColor: bg, borderColor: border, borderWidth: border !== 'transparent' ? 2 : 0 }]}
                                                onPress={() => handleSelectAnswer(mcq.id, opt)}
                                                disabled={revealed}
                                            >
                                                <View style={[styles.optCircle, { borderColor: theme.colors.border }]}>
                                                    <Text style={[styles.optLetter, { color: theme.colors.text }]}>{opt}</Text>
                                                </View>
                                                <Text style={[styles.optText, { color: theme.colors.text }]}>{text}</Text>
                                                {revealed && isCorr && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
                                                {revealed && isSel && !isCorrect && <Ionicons name="close-circle" size={22} color="#EF4444" />}
                                            </TouchableOpacity>
                                        );
                                    })}

                                    {revealed && (
                                        <View style={[styles.explBox, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}>
                                            <View style={styles.explHeader}>
                                                <Ionicons name="bulb" size={18} color={theme.colors.primary} />
                                                <Text style={[styles.explLabel, { color: theme.colors.primary }]}>Explanation</Text>
                                            </View>
                                            <Text style={[styles.explText, { color: theme.colors.text }]}>{mcq.explanation}</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        {/* Generate More */}
                        <TouchableOpacity style={[styles.moreBtn, { borderColor: theme.colors.primary }]} onPress={handleReset}>
                            <Ionicons name="refresh" size={24} color={theme.colors.primary} />
                            <Text style={[styles.moreBtnText, { color: theme.colors.primary }]}>Generate New MCQs</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// ===================== STYLES =====================
const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    content: { paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },

    card: { borderRadius: 20, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
    accent: { height: 4 },
    cardHeader: { padding: 24 },
    iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
    cardSubtitle: { fontSize: 14, lineHeight: 20 },

    label: { fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 16, paddingHorizontal: 24 },
    row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', paddingHorizontal: 24 },
    diffBtn: { flex: 1, minWidth: 100, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    optBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 2 },

    input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginHorizontal: 24 },
    textArea: { height: 80, textAlignVertical: 'top' },

    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, marginTop: 16, marginHorizontal: 24 },
    errorText: { color: '#DC2626', flex: 1 },

    genBtn: { marginTop: 24, marginHorizontal: 24, marginBottom: 24, backgroundColor: '#F59E0B', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    genBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },

    loadingCard: { padding: 40, borderRadius: 20, alignItems: 'center' },
    loadingIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
    loadingText: { fontSize: 18, fontWeight: '600', marginTop: 24 },
    loadingSubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },

    scoreCard: { padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 16 },
    scoreLabel: { fontSize: 16, fontWeight: '600' },
    scoreValue: { fontSize: 48, fontWeight: '800', marginVertical: 8 },

    mcqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    mcqHeaderTitle: { fontSize: 18, fontWeight: '700' },

    exportRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 },
    exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
    exportBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

    mcqCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
    mcqQ: { fontSize: 16, fontWeight: '600', lineHeight: 24, marginBottom: 16 },

    optCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 10, gap: 12 },
    optCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    optLetter: { fontSize: 14, fontWeight: '700' },
    optText: { flex: 1, fontSize: 15 },

    explBox: { marginTop: 16, padding: 16, borderRadius: 12 },
    explHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    explLabel: { fontSize: 15, fontWeight: '700' },
    explText: { fontSize: 14, lineHeight: 22 },

    moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', marginTop: 8 },
    moreBtnText: { fontSize: 16, fontWeight: '600' },

    // Local storage banner
    storageBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
    storageBannerText: { flex: 1, fontSize: 12, lineHeight: 18 },

    // Header button
    savedBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
