import { z } from 'zod';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { RequestContext } from '@mastra/core/request-context';
import { type VocabularyEntry } from './vocabulary-tools';
import type { WorkflowRequestContext, DraftStore } from './request-context-types';
import type { Rule } from './request-context-types';
import type { ModelMode } from '../openrouter';
import { activeModelId } from '../openrouter';
import {
  type StepTiming,
  recordStepTiming,
  logWorkflowSummary,
  logAgentOutput,
  logValidationError,
  formatTimestamp,
} from './logging-utils';
import { streamWithRetry } from './agent-utils';
import {
  emitTraceEvent,
  createDraftStore,
  clearAllDraftStores,
  getRulesState,
  getRulesArray,
  getVocabularyState,
  getVocabularyArray,
} from './request-context-helpers';
import type { StepId } from '@/lib/workflow-events';
import { generateEventId } from '@/lib/workflow-events';
import {
  workflowStateSchema,
  type WorkflowState,
  initializeWorkflowState,
  rawProblemInputSchema,
  structuredProblemSchema,
  structuredProblemDataSchema,
  questionsAnsweredSchema,
  questionAnsweringInputSchema,
  dispatcherOutputSchema,
  improverDispatcherOutputSchema,
  verifierFeedbackSchema,
  type Perspective,
  type PerspectiveResult,
  type RoundResult,
  type VerificationMetadata,
} from './workflow-schemas';
import { logVerificationResults } from './logging-utils';

const extractionStep = createStep({
  id: 'extract-structure',
  description: 'Step 1: Extract structured problem data from raw text input.',
  inputSchema: rawProblemInputSchema,
  outputSchema: structuredProblemSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState, writer }) => {
    // Initialize workflow state at the start of the workflow
    const initialState = initializeWorkflowState();
    const modelMode = inputData.modelMode ?? 'testing';
    const maxRounds = inputData.maxRounds ?? 3;
    const perspectiveCount = inputData.perspectiveCount ?? 3;
    const stateWithMode = { ...initialState, modelMode, maxRounds, perspectiveCount };
    await setState(stateWithMode);
    const logFile = initialState.logFile;

    const stepId: StepId = 'extract-structure';
    await emitTraceEvent(writer, {
      type: 'data-step-start',
      data: { stepId, timestamp: new Date().toISOString() },
    });

    const requestContext = new RequestContext<WorkflowRequestContext>();
    requestContext.set('model-mode', modelMode as ModelMode);
    requestContext.set('workflow-start-time', initialState.workflowStartTime);

    const extractAgentId = generateEventId();
    const extractPrompt = `${inputData.rawProblemText}`;
    await emitTraceEvent(writer, {
      type: 'data-agent-start',
      data: {
        id: extractAgentId,
        stepId,
        agentName: 'Structured Problem Extractor',
        model: activeModelId(modelMode, 'openai/gpt-5-mini'),
        task: extractPrompt.slice(0, 500),
        timestamp: new Date().toISOString(),
      },
    });

    const step1StartTime = new Date();
    const response = await streamWithRetry(
      mastra.getAgentById('structured-problem-extractor'),
      {
        prompt: extractPrompt,
        options: {
          maxSteps: 100,
          requestContext,
          structuredOutput: {
            schema: structuredProblemSchema,
          },
        },
        onTextChunk: (chunk) => {
          emitTraceEvent(writer, {
            type: 'data-agent-text-chunk',
            data: { parentId: extractAgentId, text: chunk, timestamp: new Date().toISOString() },
          });
        },
      },
    );
    const step1DurationMs = new Date().getTime() - step1StartTime.getTime();

    await emitTraceEvent(writer, {
      type: 'data-agent-end',
      data: {
        id: extractAgentId,
        stepId,
        agentName: 'Structured Problem Extractor',
        reasoning: response.text || '',
        durationMs: step1DurationMs,
        attempt: 1,
        totalAttempts: 1,
        timestamp: new Date().toISOString(),
      },
    });

    const timing1 = recordStepTiming(
      'Step 1',
      'Structured Problem Extractor Agent',
      step1StartTime,
    );
    await setState({ ...stateWithMode, stepTimings: [...stateWithMode.stepTimings, timing1] });
    console.log(
      `${formatTimestamp(initialState.workflowStartTime)} [Step 1] Structured Problem Extractor Agent finished at ${timing1.endTime} (${timing1.durationMinutes} min).`,
    );

    // validate the agent response against the expected schema so the step returns the correct type
    const parseResult = structuredProblemSchema.safeParse(response.object);

    logAgentOutput(
      logFile,
      'Step 1: Extract Structure',
      'Structured Problem Extractor Agent',
      response.object,
      response.reasoningText,
      initialState.workflowStartTime,
    );

    if (!parseResult.success) {
      logValidationError(logFile, 'Step 1: Extract Structure', parseResult.error, initialState.workflowStartTime);
      return bail({
        success: false,
        message: '[Extract Structure Step] Validation failed: ' + parseResult.error.message,
      });
    }

    const parsed = parseResult.data;

    if (parsed.success === false) {
      return bail({
        success: false,
        message: '[Extract Structure Step] Extraction failed: ' + parsed.explanation,
      });
    }

    await emitTraceEvent(writer, {
      type: 'data-step-complete',
      data: {
        stepId,
        durationMs: Math.round(timing1.durationMinutes * 60_000),
        timestamp: new Date().toISOString(),
      },
    });

    return parsed;
  },
});

// Step 2: Multi-perspective hypothesis generation
// Implements dispatch -> hypothesize (parallel) -> verify -> synthesize loop
const multiPerspectiveHypothesisStep = createStep({
  id: 'multi-perspective-hypothesis',
  description:
    'Step 2: Generate rules via multi-perspective dispatch, parallel hypothesis, verification, and synthesis.',
  inputSchema: structuredProblemDataSchema,
  outputSchema: questionAnsweringInputSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState, writer }) => {
    const structuredProblem = inputData;
    const logFile = state.logFile;
    const stepId: StepId = 'multi-perspective-hypothesis';
    let currentStepTimings = [...state.stepTimings];

    await emitTraceEvent(writer, {
      type: 'data-step-start',
      data: { stepId, timestamp: new Date().toISOString() },
    });

    const stepStartTime = new Date();

    // Read maxRounds and perspectiveCount from state, apply testing mode limits
    const effectiveMaxRounds =
      state.modelMode === 'testing' ? Math.min(state.maxRounds, 2) : state.maxRounds;
    const effectivePerspectiveCount =
      state.modelMode === 'testing'
        ? Math.min(state.perspectiveCount, 2)
        : state.perspectiveCount;

    // Initialize main RequestContext with empty main stores
    const mainRequestContext = new RequestContext<WorkflowRequestContext>();
    const mainVocabulary = new Map<string, VocabularyEntry>();
    const mainRules = new Map<string, Rule>();
    const draftStores = new Map<string, DraftStore>();
    mainRequestContext.set('vocabulary-state', mainVocabulary);
    mainRequestContext.set('rules-state', mainRules);
    mainRequestContext.set('draft-stores', draftStores);
    mainRequestContext.set('structured-problem', structuredProblem);
    mainRequestContext.set('log-file', logFile);
    mainRequestContext.set('model-mode', state.modelMode as ModelMode);
    mainRequestContext.set('step-writer', writer);
    mainRequestContext.set('step-id', stepId);
    mainRequestContext.set('workflow-start-time', state.workflowStartTime);

    let lastTestResults: unknown = null;
    let previousPerspectiveIds: string[] = [];

    // Round-by-round tracking for verification metadata
    const roundResults: RoundResult[] = [];
    let bestRound = 0;
    let bestPassRate = 0;
    let finalConclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES' = 'MAJOR_ISSUES';
    let finalFeedback: z.infer<typeof verifierFeedbackSchema> | null = null;

    for (let round = 1; round <= effectiveMaxRounds; round++) {
      const isImproverRound = round > 1;

      await emitTraceEvent(writer, {
        type: 'data-round-start',
        data: { round, isImproverRound, timestamp: new Date().toISOString() },
      });

      // ---------------------------------------------------------------
      // a. DISPATCH: Get perspectives
      // ---------------------------------------------------------------
      let perspectives: Perspective[];

      if (!isImproverRound) {
        // Round 1: Use dispatcher agent
        const dispatcherPrompt = JSON.stringify({
          structuredProblem,
          perspectiveCount: effectivePerspectiveCount,
        });

        const dispatchAgentId = generateEventId();
        await emitTraceEvent(writer, {
          type: 'data-agent-start',
          data: {
            id: dispatchAgentId,
            stepId,
            agentName: `Perspective Dispatcher (Round ${round})`,
            model: activeModelId(
              state.modelMode as ModelMode,
              'google/gemini-3-flash-preview',
            ),
            task: dispatcherPrompt.slice(0, 500),
            timestamp: new Date().toISOString(),
          },
        });

        mainRequestContext.set('parent-agent-id', dispatchAgentId);
        const dispatchStartTime = new Date();
        const dispatcherResponse = await streamWithRetry(
          mastra.getAgentById('perspective-dispatcher'),
          {
            prompt: dispatcherPrompt,
            options: {
              maxSteps: 100,
              requestContext: mainRequestContext,
              structuredOutput: { schema: dispatcherOutputSchema },
            },
            onTextChunk: (chunk) => {
              emitTraceEvent(writer, {
                type: 'data-agent-text-chunk',
                data: { parentId: dispatchAgentId, text: chunk, timestamp: new Date().toISOString() },
              });
            },
          },
        );
        const dispatchDurationMs = new Date().getTime() - dispatchStartTime.getTime();
        mainRequestContext.set('parent-agent-id', undefined);

        await emitTraceEvent(writer, {
          type: 'data-agent-end',
          data: {
            id: dispatchAgentId,
            stepId,
            agentName: `Perspective Dispatcher (Round ${round})`,
            reasoning: dispatcherResponse.text || '',
            durationMs: dispatchDurationMs,
            attempt: 1,
            totalAttempts: 1,
            timestamp: new Date().toISOString(),
          },
        });

        const dispatchTiming = recordStepTiming(
          `Round ${round} Dispatch`,
          'Perspective Dispatcher Agent',
          dispatchStartTime,
        );
        currentStepTimings.push(dispatchTiming);
        console.log(
          `${formatTimestamp(state.workflowStartTime)} [Round ${round}] Dispatcher finished at ${dispatchTiming.endTime} (${dispatchTiming.durationMinutes} min).`,
        );

        logAgentOutput(
          logFile,
          `Round ${round}: Dispatch`,
          'Perspective Dispatcher Agent',
          dispatcherResponse.object,
          dispatcherResponse.reasoningText,
          state.workflowStartTime,
        );

        const dispatchParsed = dispatcherOutputSchema.safeParse(dispatcherResponse.object);
        if (!dispatchParsed.success || !dispatchParsed.data.perspectives) {
          return bail({
            success: false,
            message:
              '[Multi-Perspective] Dispatcher failed: ' +
              (dispatchParsed.error?.message ?? 'No perspectives generated'),
          });
        }

        perspectives = dispatchParsed.data.perspectives;
      } else {
        // Round 2+: Use improver-dispatcher with current state + test results
        const mainRulesArray = Array.from(mainRules.values());
        const mainVocabArray = Array.from(mainVocabulary.values());

        const improverPrompt = JSON.stringify({
          structuredProblem,
          perspectiveCount: effectivePerspectiveCount,
          currentRules: mainRulesArray,
          currentVocabulary: mainVocabArray,
          testResults: lastTestResults,
          previousPerspectiveIds,
        });

        const improverDispatchAgentId = generateEventId();
        await emitTraceEvent(writer, {
          type: 'data-agent-start',
          data: {
            id: improverDispatchAgentId,
            stepId,
            agentName: `Improver Dispatcher (Round ${round})`,
            model: activeModelId(
              state.modelMode as ModelMode,
              'google/gemini-3-flash-preview',
            ),
            task: improverPrompt.slice(0, 500),
            timestamp: new Date().toISOString(),
          },
        });

        mainRequestContext.set('parent-agent-id', improverDispatchAgentId);
        const improverDispatchStartTime = new Date();
        const improverDispatcherResponse = await streamWithRetry(
          mastra.getAgentById('improver-dispatcher'),
          {
            prompt: improverPrompt,
            options: {
              maxSteps: 100,
              requestContext: mainRequestContext,
              structuredOutput: { schema: improverDispatcherOutputSchema },
            },
            onTextChunk: (chunk) => {
              emitTraceEvent(writer, {
                type: 'data-agent-text-chunk',
                data: { parentId: improverDispatchAgentId, text: chunk, timestamp: new Date().toISOString() },
              });
            },
          },
        );
        const improverDispatchDurationMs = new Date().getTime() - improverDispatchStartTime.getTime();
        mainRequestContext.set('parent-agent-id', undefined);

        await emitTraceEvent(writer, {
          type: 'data-agent-end',
          data: {
            id: improverDispatchAgentId,
            stepId,
            agentName: `Improver Dispatcher (Round ${round})`,
            reasoning: improverDispatcherResponse.text || '',
            durationMs: improverDispatchDurationMs,
            attempt: 1,
            totalAttempts: 1,
            timestamp: new Date().toISOString(),
          },
        });

        const improverDispatchTiming = recordStepTiming(
          `Round ${round} Improver Dispatch`,
          'Improver Dispatcher Agent',
          improverDispatchStartTime,
        );
        currentStepTimings.push(improverDispatchTiming);
        console.log(
          `${formatTimestamp(state.workflowStartTime)} [Round ${round}] Improver Dispatcher finished at ${improverDispatchTiming.endTime} (${improverDispatchTiming.durationMinutes} min).`,
        );

        logAgentOutput(
          logFile,
          `Round ${round}: Improver Dispatch`,
          'Improver Dispatcher Agent',
          improverDispatcherResponse.object,
          improverDispatcherResponse.reasoningText,
          state.workflowStartTime,
        );

        const improverParsed = improverDispatcherOutputSchema.safeParse(
          improverDispatcherResponse.object,
        );
        if (!improverParsed.success || !improverParsed.data.perspectives) {
          // If improver-dispatcher returns no perspectives, stop iteration
          console.log(
            `${formatTimestamp(state.workflowStartTime)} [Round ${round}] Improver returned no new perspectives, stopping.`,
          );
          break;
        }

        perspectives = improverParsed.data.perspectives;
      }

      // Track perspective IDs for future rounds
      previousPerspectiveIds.push(...perspectives.map((p) => p.id));

      // ---------------------------------------------------------------
      // b. HYPOTHESIZE: Run hypothesizers in parallel
      // ---------------------------------------------------------------
      const hypothesizePromises = perspectives.map(async (perspective) => {
        await emitTraceEvent(writer, {
          type: 'data-perspective-start',
          data: {
            perspectiveId: perspective.id,
            perspectiveName: perspective.name,
            round,
            timestamp: new Date().toISOString(),
          },
        });

        // Create a draft store for this perspective
        const draftStore = createDraftStore(
          mainRequestContext,
          perspective.id,
          isImproverRound, // pull from main on round 2+
        );

        // Create a fresh RequestContext pointing to this perspective's draft stores
        const perspectiveRequestContext = new RequestContext<WorkflowRequestContext>();
        perspectiveRequestContext.set('vocabulary-state', draftStore.vocabulary);
        perspectiveRequestContext.set('rules-state', draftStore.rules);
        perspectiveRequestContext.set('structured-problem', structuredProblem);
        perspectiveRequestContext.set('log-file', logFile);
        perspectiveRequestContext.set('model-mode', state.modelMode as ModelMode);
        perspectiveRequestContext.set('step-writer', writer);
        perspectiveRequestContext.set('step-id', stepId);
        perspectiveRequestContext.set('event-source', 'draft');
        perspectiveRequestContext.set('workflow-start-time', state.workflowStartTime);

        const existingRules = isImproverRound ? Array.from(mainRules.values()) : [];
        const existingVocabulary = isImproverRound ? Array.from(mainVocabulary.values()) : [];

        const hypothesizerPrompt = JSON.stringify({
          structuredProblem,
          perspective,
          existingRules,
          existingVocabulary,
        });

        const hypAgentId = generateEventId();
        await emitTraceEvent(writer, {
          type: 'data-agent-start',
          data: {
            id: hypAgentId,
            perspectiveId: perspective.id,
            stepId,
            agentName: `Hypothesizer (${perspective.name})`,
            model: activeModelId(
              state.modelMode as ModelMode,
              'google/gemini-3-flash-preview',
            ),
            task: hypothesizerPrompt.slice(0, 500),
            timestamp: new Date().toISOString(),
          },
        });

        perspectiveRequestContext.set('parent-agent-id', hypAgentId);
        const hypStartTime = new Date();
        const hypothesizerResponse = await streamWithRetry(
          mastra.getAgentById('initial-hypothesizer'),
          {
            prompt: hypothesizerPrompt,
            options: { maxSteps: 100, requestContext: perspectiveRequestContext },
            responseCheck: 'toolActivity',
            onTextChunk: (chunk) => {
              emitTraceEvent(writer, {
                type: 'data-agent-text-chunk',
                data: { parentId: hypAgentId, text: chunk, timestamp: new Date().toISOString() },
              });
            },
          },
        );
        const hypDurationMs = new Date().getTime() - hypStartTime.getTime();
        perspectiveRequestContext.set('parent-agent-id', undefined);

        await emitTraceEvent(writer, {
          type: 'data-agent-end',
          data: {
            id: hypAgentId,
            perspectiveId: perspective.id,
            stepId,
            agentName: `Hypothesizer (${perspective.name})`,
            reasoning: hypothesizerResponse.text || '',
            durationMs: hypDurationMs,
            attempt: 1,
            totalAttempts: 1,
            timestamp: new Date().toISOString(),
          },
        });

        const hypTiming = recordStepTiming(
          `Round ${round} Hypothesizer (${perspective.id})`,
          'Initial Hypothesizer Agent',
          hypStartTime,
        );
        console.log(
          `${formatTimestamp(state.workflowStartTime)} [Round ${round}] Hypothesizer (${perspective.id}) finished at ${hypTiming.endTime} (${hypTiming.durationMinutes} min).`,
        );

        logAgentOutput(
          logFile,
          `Round ${round}: Hypothesizer (${perspective.id})`,
          'Initial Hypothesizer Agent',
          { naturalLanguageOutput: hypothesizerResponse.text },
          hypothesizerResponse.reasoningText,
          state.workflowStartTime,
        );

        await emitTraceEvent(writer, {
          type: 'data-perspective-complete',
          data: {
            perspectiveId: perspective.id,
            perspectiveName: perspective.name,
            round,
            testPassRate: 0, // Will be computed during verification
            rulesCount: draftStore.rules.size,
            vocabularyCount: draftStore.vocabulary.size,
            timestamp: new Date().toISOString(),
          },
        });

        return { perspective, draftStore, timing: hypTiming };
      });

      const hypothesisResults = await Promise.all(hypothesizePromises);
      for (const h of hypothesisResults) {
        currentStepTimings.push(h.timing);
      }

      // ---------------------------------------------------------------
      // c. VERIFY: Score each perspective's draft store
      // ---------------------------------------------------------------
      const perspectiveResults: PerspectiveResult[] = [];

      const verifyPromises = hypothesisResults.map(async ({ perspective, draftStore }) => {
        // Create a RequestContext with draft rules as current-rules for verifier
        const verifyRequestContext = new RequestContext<WorkflowRequestContext>();
        verifyRequestContext.set('vocabulary-state', draftStore.vocabulary);
        verifyRequestContext.set('structured-problem', structuredProblem);
        verifyRequestContext.set('current-rules', Array.from(draftStore.rules.values()));
        verifyRequestContext.set('log-file', logFile);
        verifyRequestContext.set('model-mode', state.modelMode as ModelMode);
        verifyRequestContext.set('step-writer', writer);
        verifyRequestContext.set('step-id', stepId);
        verifyRequestContext.set('event-source', 'draft');
        verifyRequestContext.set('workflow-start-time', state.workflowStartTime);

        const verifyVocabulary = Array.from(draftStore.vocabulary.values());
        const verifyRules = Array.from(draftStore.rules.values());

        const verifierPrompt = JSON.stringify({
          vocabulary: verifyVocabulary,
          structuredProblem,
          rules: verifyRules,
        });

        // Step 1: Call verifier orchestrator
        const verifierAgentId = generateEventId();
        await emitTraceEvent(writer, {
          type: 'data-agent-start',
          data: {
            id: verifierAgentId,
            perspectiveId: perspective.id,
            stepId,
            agentName: `Verifier (${perspective.name})`,
            model: activeModelId(
              state.modelMode as ModelMode,
              'google/gemini-3-flash-preview',
            ),
            task: verifierPrompt.slice(0, 500),
            timestamp: new Date().toISOString(),
          },
        });

        verifyRequestContext.set('parent-agent-id', verifierAgentId);
        const verifierStartTime = new Date();
        const verifierResponse = await streamWithRetry(
          mastra.getAgentById('verifier-orchestrator'),
          {
            prompt: verifierPrompt,
            options: { maxSteps: 100, requestContext: verifyRequestContext },
            responseCheck: 'toolActivity',
            onTextChunk: (chunk) => {
              emitTraceEvent(writer, {
                type: 'data-agent-text-chunk',
                data: { parentId: verifierAgentId, text: chunk, timestamp: new Date().toISOString() },
              });
            },
          },
        );
        const verifierDurationMs = new Date().getTime() - verifierStartTime.getTime();
        verifyRequestContext.set('parent-agent-id', undefined);

        await emitTraceEvent(writer, {
          type: 'data-agent-end',
          data: {
            id: verifierAgentId,
            perspectiveId: perspective.id,
            stepId,
            agentName: `Verifier (${perspective.name})`,
            reasoning: verifierResponse.text || '',
            durationMs: verifierDurationMs,
            attempt: 1,
            totalAttempts: 1,
            timestamp: new Date().toISOString(),
          },
        });

        const verifierTiming = recordStepTiming(
          `Round ${round} Verify (${perspective.id})`,
          'Verifier Orchestrator Agent',
          verifierStartTime,
        );
        currentStepTimings.push(verifierTiming);
        console.log(
          `${formatTimestamp(state.workflowStartTime)} [Round ${round}] Verifier (${perspective.id}) finished at ${verifierTiming.endTime} (${verifierTiming.durationMinutes} min).`,
        );

        // Step 2: Extract structured feedback
        const extractorPrompt =
          'Please extract the verification feedback from the following analysis:\\n\\n' +
          verifierResponse.text;

        const extractorAgentId = generateEventId();
        await emitTraceEvent(writer, {
          type: 'data-agent-start',
          data: {
            id: extractorAgentId,
            perspectiveId: perspective.id,
            stepId,
            agentName: `Feedback Extractor (${perspective.name})`,
            model: activeModelId(
              state.modelMode as ModelMode,
              'openai/gpt-5-mini',
            ),
            task: extractorPrompt.slice(0, 500),
            timestamp: new Date().toISOString(),
          },
        });

        verifyRequestContext.set('parent-agent-id', extractorAgentId);
        const extractorStartTime = new Date();
        const extractorResponse = await streamWithRetry(
          mastra.getAgentById('verifier-feedback-extractor'),
          {
            prompt: extractorPrompt,
            options: {
              maxSteps: 100,
              requestContext: verifyRequestContext,
              structuredOutput: { schema: verifierFeedbackSchema },
            },
            onTextChunk: (chunk) => {
              emitTraceEvent(writer, {
                type: 'data-agent-text-chunk',
                data: { parentId: extractorAgentId, text: chunk, timestamp: new Date().toISOString() },
              });
            },
          },
        );
        const extractorDurationMs = new Date().getTime() - extractorStartTime.getTime();
        verifyRequestContext.set('parent-agent-id', undefined);

        await emitTraceEvent(writer, {
          type: 'data-agent-end',
          data: {
            id: extractorAgentId,
            perspectiveId: perspective.id,
            stepId,
            agentName: `Feedback Extractor (${perspective.name})`,
            reasoning: extractorResponse.text || '',
            durationMs: extractorDurationMs,
            attempt: 1,
            totalAttempts: 1,
            timestamp: new Date().toISOString(),
          },
        });

        const extractorTiming = recordStepTiming(
          `Round ${round} Verify Extract (${perspective.id})`,
          'Verifier Feedback Extractor Agent',
          extractorStartTime,
        );
        currentStepTimings.push(extractorTiming);

        const feedbackParsed = verifierFeedbackSchema.safeParse(extractorResponse.object);

        logAgentOutput(
          logFile,
          `Round ${round}: Verify (${perspective.id})`,
          'Verifier Feedback Extractor Agent',
          extractorResponse.object,
          extractorResponse.reasoningText,
          state.workflowStartTime,
        );

        if (!feedbackParsed.success) {
          // If verification feedback fails to parse, assign a 0 score
          console.warn(
            `${formatTimestamp(state.workflowStartTime)} [Round ${round}] Verifier feedback parse failed for ${perspective.id}:`,
            feedbackParsed.error.message,
          );
          return {
            perspectiveId: perspective.id,
            perspectiveName: perspective.name,
            rulesCount: draftStore.rules.size,
            vocabularyCount: draftStore.vocabulary.size,
            testPassRate: 0,
            verifierConclusion: 'MAJOR_ISSUES' as const,
            errantRulesCount: draftStore.rules.size,
            errantSentencesCount: 0,
          };
        }

        const feedback = feedbackParsed.data;
        const totalChecks = feedback.rulesTestedCount + feedback.sentencesTestedCount;
        const failedChecks = feedback.errantRules.length + feedback.errantSentences.length;
        const testPassRate = totalChecks > 0 ? 1 - failedChecks / totalChecks : 0;

        return {
          perspectiveId: perspective.id,
          perspectiveName: perspective.name,
          rulesCount: draftStore.rules.size,
          vocabularyCount: draftStore.vocabulary.size,
          testPassRate,
          verifierConclusion: feedback.conclusion,
          errantRulesCount: feedback.errantRules.length,
          errantSentencesCount: feedback.errantSentences.length,
        };
      });

      const verifyResults = await Promise.all(verifyPromises);
      perspectiveResults.push(...verifyResults);

      // ---------------------------------------------------------------
      // d. SYNTHESIZE: Merge best rulesets
      // ---------------------------------------------------------------
      // Mark main context as merged source for synthesis events
      mainRequestContext.set('event-source', 'merged');

      await emitTraceEvent(writer, {
        type: 'data-synthesis-start',
        data: {
          round,
          perspectiveCount: perspectives.length,
          timestamp: new Date().toISOString(),
        },
      });

      // Sort perspectives by testPassRate descending
      const sortedResults = [...perspectiveResults].sort(
        (a, b) => b.testPassRate - a.testPassRate,
      );

      // Programmatic vocabulary merge: iterate draft stores in score order
      // Higher-scored perspective's entries take priority (last write wins, but we go best-first)
      // Clear main vocabulary first, then merge from worst to best so best wins
      mainVocabulary.clear();
      for (const result of [...sortedResults].reverse()) {
        const draft = draftStores.get(result.perspectiveId);
        if (draft) {
          for (const [key, entry] of draft.vocabulary) {
            mainVocabulary.set(key, entry);
          }
        }
      }

      // Clear main rules before synthesis (synthesizer rebuilds from scratch)
      mainRules.clear();

      // Build serialized rules for each perspective (for synthesizer prompt)
      const perspectiveRulesData = sortedResults.map((result) => {
        const draft = draftStores.get(result.perspectiveId);
        return {
          perspectiveId: result.perspectiveId,
          perspectiveName: result.perspectiveName,
          testPassRate: result.testPassRate,
          verifierConclusion: result.verifierConclusion,
          rules: draft ? Array.from(draft.rules.values()) : [],
          vocabularyCount: result.vocabularyCount,
        };
      });

      const synthesizerPrompt = JSON.stringify({
        structuredProblem,
        perspectiveResults: sortedResults,
        perspectiveRules: perspectiveRulesData,
        mergedVocabulary: Array.from(mainVocabulary.values()),
      });

      const synthesizerAgentId = generateEventId();
      await emitTraceEvent(writer, {
        type: 'data-agent-start',
        data: {
          id: synthesizerAgentId,
          stepId,
          agentName: `Hypothesis Synthesizer (Round ${round})`,
          model: activeModelId(
            state.modelMode as ModelMode,
            'google/gemini-3-flash-preview',
          ),
          task: synthesizerPrompt.slice(0, 500),
          timestamp: new Date().toISOString(),
        },
      });

      mainRequestContext.set('parent-agent-id', synthesizerAgentId);
      const synthesizerStartTime = new Date();
      const synthesizerResponse = await streamWithRetry(
        mastra.getAgentById('hypothesis-synthesizer'),
        {
          prompt: synthesizerPrompt,
          options: { maxSteps: 100, requestContext: mainRequestContext },
          responseCheck: 'toolActivity',
          onTextChunk: (chunk) => {
            emitTraceEvent(writer, {
              type: 'data-agent-text-chunk',
              data: { parentId: synthesizerAgentId, text: chunk, timestamp: new Date().toISOString() },
            });
          },
        },
      );
      const synthesizerDurationMs = new Date().getTime() - synthesizerStartTime.getTime();
      mainRequestContext.set('parent-agent-id', undefined);

      await emitTraceEvent(writer, {
        type: 'data-agent-end',
        data: {
          id: synthesizerAgentId,
          stepId,
          agentName: `Hypothesis Synthesizer (Round ${round})`,
          reasoning: synthesizerResponse.text || '',
          durationMs: synthesizerDurationMs,
          attempt: 1,
          totalAttempts: 1,
          timestamp: new Date().toISOString(),
        },
      });

      const synthesizerTiming = recordStepTiming(
        `Round ${round} Synthesis`,
        'Hypothesis Synthesizer Agent',
        synthesizerStartTime,
      );
      currentStepTimings.push(synthesizerTiming);
      console.log(
        `${formatTimestamp(state.workflowStartTime)} [Round ${round}] Synthesizer finished at ${synthesizerTiming.endTime} (${synthesizerTiming.durationMinutes} min).`,
      );

      logAgentOutput(
        logFile,
        `Round ${round}: Synthesis`,
        'Hypothesis Synthesizer Agent',
        { naturalLanguageOutput: synthesizerResponse.text },
        synthesizerResponse.reasoningText,
        state.workflowStartTime,
      );

      // Read the merged state from main stores (synthesizer writes via tools)
      const mergedRulesCount = mainRules.size;
      const mergedVocabCount = mainVocabulary.size;

      await emitTraceEvent(writer, {
        type: 'data-synthesis-complete',
        data: {
          round,
          mergedRulesCount,
          mergedVocabCount,
          testPassRate: 0, // Will be computed during convergence check
          timestamp: new Date().toISOString(),
        },
      });

      // ---------------------------------------------------------------
      // e. CONVERGENCE CHECK: Verify synthesized rules
      // ---------------------------------------------------------------
      await emitTraceEvent(writer, {
        type: 'data-convergence-start',
        data: { round, timestamp: new Date().toISOString() },
      });

      const convergenceRequestContext = new RequestContext<WorkflowRequestContext>();
      convergenceRequestContext.set('vocabulary-state', mainVocabulary);
      convergenceRequestContext.set('structured-problem', structuredProblem);
      convergenceRequestContext.set('current-rules', Array.from(mainRules.values()));
      convergenceRequestContext.set('log-file', logFile);
      convergenceRequestContext.set('model-mode', state.modelMode as ModelMode);
      convergenceRequestContext.set('step-writer', writer);
      convergenceRequestContext.set('step-id', stepId);
      convergenceRequestContext.set('event-source', 'merged');
      convergenceRequestContext.set('workflow-start-time', state.workflowStartTime);

      const convergenceVerifierPrompt = JSON.stringify({
        vocabulary: Array.from(mainVocabulary.values()),
        structuredProblem,
        rules: Array.from(mainRules.values()),
      });

      const convergenceAgentId = generateEventId();
      await emitTraceEvent(writer, {
        type: 'data-agent-start',
        data: {
          id: convergenceAgentId,
          stepId,
          agentName: `Convergence Verifier (Round ${round})`,
          model: activeModelId(
            state.modelMode as ModelMode,
            'google/gemini-3-flash-preview',
          ),
          task: convergenceVerifierPrompt.slice(0, 500),
          timestamp: new Date().toISOString(),
        },
      });

      convergenceRequestContext.set('parent-agent-id', convergenceAgentId);
      const convergenceStartTime = new Date();
      const convergenceVerifierResponse = await streamWithRetry(
        mastra.getAgentById('verifier-orchestrator'),
        {
          prompt: convergenceVerifierPrompt,
          options: { maxSteps: 100, requestContext: convergenceRequestContext },
          responseCheck: 'toolActivity',
          onTextChunk: (chunk) => {
            emitTraceEvent(writer, {
              type: 'data-agent-text-chunk',
              data: { parentId: convergenceAgentId, text: chunk, timestamp: new Date().toISOString() },
            });
          },
        },
      );
      const convergenceDurationMs = new Date().getTime() - convergenceStartTime.getTime();
      convergenceRequestContext.set('parent-agent-id', undefined);

      await emitTraceEvent(writer, {
        type: 'data-agent-end',
        data: {
          id: convergenceAgentId,
          stepId,
          agentName: `Convergence Verifier (Round ${round})`,
          reasoning: convergenceVerifierResponse.text || '',
          durationMs: convergenceDurationMs,
          attempt: 1,
          totalAttempts: 1,
          timestamp: new Date().toISOString(),
        },
      });

      const convergenceTiming = recordStepTiming(
        `Round ${round} Convergence Check`,
        'Verifier Orchestrator Agent',
        convergenceStartTime,
      );
      currentStepTimings.push(convergenceTiming);

      // Extract convergence feedback
      const convergenceExtractorPrompt =
        'Please extract the verification feedback from the following analysis:\\n\\n' +
        convergenceVerifierResponse.text;

      const convergenceExtractorAgentId = generateEventId();
      await emitTraceEvent(writer, {
        type: 'data-agent-start',
        data: {
          id: convergenceExtractorAgentId,
          stepId,
          agentName: `Convergence Extractor (Round ${round})`,
          model: activeModelId(
            state.modelMode as ModelMode,
            'openai/gpt-5-mini',
          ),
          task: convergenceExtractorPrompt.slice(0, 500),
          timestamp: new Date().toISOString(),
        },
      });

      convergenceRequestContext.set('parent-agent-id', convergenceExtractorAgentId);
      const convergenceExtractorStartTime = new Date();
      const convergenceExtractorResponse = await streamWithRetry(
        mastra.getAgentById('verifier-feedback-extractor'),
        {
          prompt: convergenceExtractorPrompt,
          options: {
            maxSteps: 100,
            requestContext: convergenceRequestContext,
            structuredOutput: { schema: verifierFeedbackSchema },
          },
          onTextChunk: (chunk) => {
            emitTraceEvent(writer, {
              type: 'data-agent-text-chunk',
              data: { parentId: convergenceExtractorAgentId, text: chunk, timestamp: new Date().toISOString() },
            });
          },
        },
      );
      const convergenceExtractorDurationMs = new Date().getTime() - convergenceExtractorStartTime.getTime();
      convergenceRequestContext.set('parent-agent-id', undefined);

      await emitTraceEvent(writer, {
        type: 'data-agent-end',
        data: {
          id: convergenceExtractorAgentId,
          stepId,
          agentName: `Convergence Extractor (Round ${round})`,
          reasoning: convergenceExtractorResponse.text || '',
          durationMs: convergenceExtractorDurationMs,
          attempt: 1,
          totalAttempts: 1,
          timestamp: new Date().toISOString(),
        },
      });

      const convergenceExtractorTiming = recordStepTiming(
        `Round ${round} Convergence Extract`,
        'Verifier Feedback Extractor Agent',
        convergenceExtractorStartTime,
      );
      currentStepTimings.push(convergenceExtractorTiming);

      const convergenceParsed = verifierFeedbackSchema.safeParse(
        convergenceExtractorResponse.object,
      );

      logAgentOutput(
        logFile,
        `Round ${round}: Convergence Check`,
        'Verifier Feedback Extractor Agent',
        convergenceExtractorResponse.object,
        convergenceExtractorResponse.reasoningText,
        state.workflowStartTime,
      );

      let converged = false;

      // Build round result for metadata tracking
      const convergencePassRate = convergenceParsed.success
        ? (() => {
            const fb = convergenceParsed.data;
            const total = fb.rulesTestedCount + fb.sentencesTestedCount;
            const failed = fb.errantRules.length + fb.errantSentences.length;
            return total > 0 ? 1 - failed / total : 0;
          })()
        : 0;

      const convergenceConclusion = convergenceParsed.success
        ? convergenceParsed.data.conclusion
        : ('MAJOR_ISSUES' as const);

      await emitTraceEvent(writer, {
        type: 'data-convergence-complete',
        data: {
          round,
          converged: convergenceConclusion === 'ALL_RULES_PASS',
          testPassRate: convergencePassRate,
          timestamp: new Date().toISOString(),
        },
      });

      const roundResult: RoundResult = {
        round,
        perspectives: verifyResults.map((r) => ({
          perspectiveId: r.perspectiveId,
          perspectiveName: r.perspectiveName,
          testPassRate: r.testPassRate,
          verifierConclusion: r.verifierConclusion,
          rulesCount: r.rulesCount,
          errantRulesCount: r.errantRulesCount,
          errantSentencesCount: r.errantSentencesCount,
        })),
        convergencePassRate,
        convergenceConclusion,
        converged:
          convergenceParsed.success &&
          convergenceParsed.data.conclusion === 'ALL_RULES_PASS',
      };
      roundResults.push(roundResult);

      // Track best round (highest convergence pass rate)
      if (convergencePassRate > bestPassRate) {
        bestPassRate = convergencePassRate;
        bestRound = round;
      }

      if (convergenceParsed.success) {
        finalConclusion = convergenceParsed.data.conclusion;
        finalFeedback = convergenceParsed.data;
      }

      if (convergenceParsed.success) {
        const feedback = convergenceParsed.data;
        lastTestResults = feedback;

        await emitTraceEvent(writer, {
          type: 'data-iteration-update',
          data: {
            iteration: round,
            conclusion: feedback.conclusion,
            rulesTestedCount: feedback.rulesTestedCount,
            errantRulesCount: feedback.errantRules.length,
            sentencesTestedCount: feedback.sentencesTestedCount,
            errantSentencesCount: feedback.errantSentences.length,
            errantRules: feedback.errantRules,
            errantSentences: feedback.errantSentences,
            passRate: convergencePassRate,
            timestamp: new Date().toISOString(),
          },
        });

        // Log detailed per-rule verification results
        logVerificationResults(
          logFile,
          `Round ${round}: Convergence Verification`,
          feedback,
          Array.from(mainRules.keys()),
          state.workflowStartTime,
        );

        if (feedback.conclusion === 'ALL_RULES_PASS') {
          converged = true;
        }
      }

      await emitTraceEvent(writer, {
        type: 'data-round-complete',
        data: { round, converged, timestamp: new Date().toISOString() },
      });

      // Save state after each round
      await setState({
        ...state,
        vocabulary: Object.fromEntries(mainVocabulary),
        rules: Object.fromEntries(mainRules),
        currentRound: round,
        stepTimings: currentStepTimings,
      });

      if (converged) {
        console.log(`${formatTimestamp(state.workflowStartTime)} [Round ${round}] Converged! All rules pass.`);
        break;
      }

      // ---------------------------------------------------------------
      // f. Clear draft stores for next round
      // ---------------------------------------------------------------
      clearAllDraftStores(mainRequestContext);
    }

    // After all rounds: return structuredProblem + rules for answering step
    const finalRules = Array.from(mainRules.values());

    // If we exhausted rounds without convergence, warn
    if (!roundResults.some((r) => r.converged)) {
      console.warn(
        `${formatTimestamp(state.workflowStartTime)} [Multi-Perspective] Max rounds (${effectiveMaxRounds}) reached without convergence. ` +
          `Best pass rate: ${bestPassRate.toFixed(2)} (round ${bestRound}). Using best-so-far rules.`,
      );
      await emitTraceEvent(writer, {
        type: 'data-iteration-update',
        data: {
          iteration: effectiveMaxRounds,
          conclusion: finalConclusion,
          rulesTestedCount: finalFeedback?.rulesTestedCount ?? 0,
          errantRulesCount: finalFeedback?.errantRules.length ?? 0,
          sentencesTestedCount: finalFeedback?.sentencesTestedCount ?? 0,
          errantSentencesCount: finalFeedback?.errantSentences.length ?? 0,
          errantRules: finalFeedback?.errantRules ?? [],
          errantSentences: finalFeedback?.errantSentences ?? [],
          passRate: bestPassRate,
          isConvergenceWarning: true,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const verificationMetadata: VerificationMetadata = {
      totalRounds: roundResults.length,
      converged: roundResults.some((r) => r.converged),
      bestRound,
      bestPassRate,
      finalConclusion,
      rounds: roundResults,
      finalRulesCount: finalFeedback?.rulesTestedCount ?? finalRules.length,
      finalErrantRulesCount: finalFeedback?.errantRules.length ?? 0,
      finalSentencesTestedCount: finalFeedback?.sentencesTestedCount ?? 0,
      finalErrantSentencesCount: finalFeedback?.errantSentences.length ?? 0,
    };

    const totalDurationMs = new Date().getTime() - stepStartTime.getTime();

    await emitTraceEvent(writer, {
      type: 'data-step-complete',
      data: {
        stepId,
        durationMs: totalDurationMs,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      structuredProblem,
      rules: finalRules,
      verificationMetadata,
    };
  },
});

// Step 3: Answer questions using the validated rules and vocabulary from state
const answerQuestionsStep = createStep({
  id: 'answer-questions',
  description:
    "Step 3: Answer the user's questions using the validated rules and vocabulary from workflow state.",
  inputSchema: questionAnsweringInputSchema,
  outputSchema: questionsAnsweredSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState, writer }) => {
    const { structuredProblem, rules } = inputData;
    const logFile = state.logFile;

    const stepId: StepId = 'answer-questions';
    await emitTraceEvent(writer, {
      type: 'data-step-start',
      data: { stepId, timestamp: new Date().toISOString() },
    });

    // Rebuild vocabulary from workflow state (read-only for question answerer)
    const vocabularyState = new Map(Object.entries(state.vocabulary));
    const answererVocabulary = Array.from(vocabularyState.values());

    const answererPrompt = JSON.stringify({
      vocabulary: answererVocabulary,
      context: structuredProblem.context,
      dataset: structuredProblem.dataset,
      questions: structuredProblem.questions,
      rules: rules,
    });

    const requestContext = new RequestContext<WorkflowRequestContext>();
    requestContext.set('model-mode', state.modelMode as ModelMode);
    requestContext.set('workflow-start-time', state.workflowStartTime);

    const answererAgentId = generateEventId();
    await emitTraceEvent(writer, {
      type: 'data-agent-start',
      data: {
        id: answererAgentId,
        stepId,
        agentName: 'Question Answerer',
        model: activeModelId(state.modelMode as ModelMode, 'google/gemini-3-flash-preview'),
        task: answererPrompt.slice(0, 500),
        timestamp: new Date().toISOString(),
      },
    });

    const answererStartTime = new Date();
    const answererResponse = await streamWithRetry(
      mastra.getAgentById('question-answerer'),
      {
        prompt: answererPrompt,
        options: {
          maxSteps: 100,
          requestContext,
          structuredOutput: {
            schema: questionsAnsweredSchema,
          },
        },
        onTextChunk: (chunk) => {
          emitTraceEvent(writer, {
            type: 'data-agent-text-chunk',
            data: { parentId: answererAgentId, text: chunk, timestamp: new Date().toISOString() },
          });
        },
      },
    );
    const answererDurationMs = new Date().getTime() - answererStartTime.getTime();

    await emitTraceEvent(writer, {
      type: 'data-agent-end',
      data: {
        id: answererAgentId,
        stepId,
        agentName: 'Question Answerer',
        reasoning: answererResponse.text || '',
        durationMs: answererDurationMs,
        attempt: 1,
        totalAttempts: 1,
        timestamp: new Date().toISOString(),
      },
    });

    const answererTiming = recordStepTiming('Step 3', 'Question Answerer Agent', answererStartTime);
    const finalStepTimings = [...state.stepTimings, answererTiming];
    console.log(
      `${formatTimestamp(state.workflowStartTime)} [Step 3] Question Answerer Agent finished at ${answererTiming.endTime} (${answererTiming.durationMinutes} min).`,
    );

    const answererParseResult = questionsAnsweredSchema.safeParse(answererResponse.object);

    logAgentOutput(
      logFile,
      'Step 3: Answer Questions',
      'Question Answerer Agent',
      answererResponse.object,
      answererResponse.reasoningText,
      state.workflowStartTime,
    );

    if (!answererParseResult.success) {
      logValidationError(logFile, 'Step 3: Answer Questions', answererParseResult.error, state.workflowStartTime);
      return bail({
        success: false,
        message: '[Answer Questions Step] Validation failed: ' + answererParseResult.error.message,
      });
    }

    const answererParsed = answererParseResult.data;

    if (answererParsed.success === false) {
      return bail({
        success: false,
        message:
          '[Answer Questions Step] Failed to answer questions: ' + answererParsed.explanation,
      });
    }

    // Log the workflow timing summary at the end
    logWorkflowSummary(logFile, state.startTime, finalStepTimings);

    // Save final state
    await setState({ ...state, stepTimings: finalStepTimings });

    await emitTraceEvent(writer, {
      type: 'data-step-complete',
      data: {
        stepId,
        durationMs: Math.round(answererTiming.durationMinutes * 60_000),
        timestamp: new Date().toISOString(),
      },
    });

    return answererParsed;
  },
});

export const solverWorkflow = createWorkflow({
  id: 'solver-workflow',
  inputSchema: rawProblemInputSchema,
  outputSchema: questionsAnsweredSchema,
  stateSchema: workflowStateSchema,
})
  // Step 1: Extract structured problem data from raw text input.
  .then(extractionStep)
  .map(async ({ inputData }) => inputData.data!)
  // Step 2: Multi-perspective hypothesis generation (dispatch -> hypothesize -> verify -> synthesize loop)
  .then(multiPerspectiveHypothesisStep)
  // Step 3: Answer the user's questions using the validated rules and extracted vocabulary.
  .then(answerQuestionsStep)
  .commit();
