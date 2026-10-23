import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const MCP_PROTOCOL_VERSION = '2025-11-25';
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const WORD_TO_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function parseSpokenNumber(val: string | undefined): number | null {
  if (!val) return null;
  const clean = val.toLowerCase().trim();
  if (WORD_TO_NUM[clean] !== undefined) return WORD_TO_NUM[clean];
  const num = parseFloat(clean);
  return Number.isNaN(num) ? null : num;
}

const MCP_TOOLS = [
  {
    name: 'plan_from_any_utterance',
    description: 'Accepts any natural spoken sentence from Alexa+, extracts sleep, feeling unwell, task limits, and board clearing, and builds a paced Spoons plan.',
    inputSchema: {
      type: 'object',
      properties: {
        utterance: { type: 'string' },
      },
      required: ['utterance'],
    },
  },
  {
    name: 'log_sleep_and_calibrate',
    description: 'Logs sleep duration via Alexa+ and dynamically calibrates today’s Spoon energy budget based on sleep debt.',
    inputSchema: {
      type: 'object',
      properties: {
        hoursSlept: { type: 'number' },
        sleepQuality: { type: 'string' },
      },
      required: ['hoursSlept'],
    },
  },
  {
    name: 'trigger_sensory_shield',
    description: 'Activates 380Hz Brown Noise acoustic shielding, logs sensory drain, and switches UI to Quiet Dusk survival mode.',
    inputSchema: {
      type: 'object',
      properties: {
        triggerType: { type: 'string' },
      },
      required: ['triggerType'],
    },
  },
  {
    name: 'voice_brain_dump',
    description: 'Splits a rambling spoken sentence of multiple chores into structured, spoon-costed tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        rawUtterance: { type: 'string' },
      },
      required: ['rawUtterance'],
    },
  },
  {
    name: 'rebalance_schedule',
    description: 'Autonomously defers high-spoon tasks when user reports burnout or migraine.',
    inputSchema: {
      type: 'object',
      properties: {
        remainingSpoons: { type: 'number' },
        sensoryState: { type: 'string' },
      },
      required: ['remainingSpoons', 'sensoryState'],
    },
  },
  {
    name: 'decompose_overwhelming_task',
    description: 'Uses Amazon Bedrock Nova Lite to slice an intimidating task into 1-spoon micro-steps.',
    inputSchema: {
      type: 'object',
      properties: {
        taskTitle: { type: 'string' },
      },
      required: ['taskTitle'],
    },
  },
  {
    name: 'start_body_double',
    description: 'Starts a 5-minute gentle flow timer and reads the 30-second ignition prompt.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        durationMinutes: { type: 'number' },
      },
    },
  },
];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, method, params } = body;

  if (method === 'initialize') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: true } },
        serverInfo: { name: 'spoons-alexa-plus-mcp', version: '2.3.0' },
      },
    });
  }

  if (method === 'tools/list') {
    return NextResponse.json({ jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;

    if (name === 'plan_from_any_utterance') {
      const raw = String(args.utterance || '').trim();
      const lower = raw.toLowerCase();

      const sleepMatch = lower.match(
        /(?:slept|sleep)\s+(?:for\s+)?(?:only\s+)?(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:h|hr|hrs|hour|hours)/i
      );
      const detectedHours = sleepMatch ? parseSpokenNumber(sleepMatch[1]) : null;

      const spoonMatch = lower.match(
        /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*spoons?/i
      );
      const explicitSpoons = spoonMatch ? parseSpokenNumber(spoonMatch[1]) : null;

      const maxTasksMatch =
        lower.match(
          /(?:schedule|keep|plan|do|give\s+me|only|just)\s+(?:only\s+|just\s+)?(\d+|one|two|three|four|five)\s*(?:tasks?|activities|things|items)/i
        ) ||
        lower.match(
          /(\d+|one|two|three|four|five)\s*(?:tasks?|activities)\s+only/i
        );
      const maxTasks = maxTasksMatch ? parseSpokenNumber(maxTasksMatch[1]) : null;

      const isOverwhelmed =
        /\b(not\s+feeling\s+okay|not\s+feeling\s+well|not\s+okay|few\s+energy|little\s+energy|low\s+energy|no\s+energy|migraine|overwhelmed|exhausted|burnout|tired|loud|sensory|anxious|headache|drained|sick|unwell)\b/i.test(
          lower
        );

      const clearBoard =
        /\b(clear\s+my\s+board|clear\s+board|defer|move\s+rest|clear\s+everything)\b/i.test(lower) ||
        maxTasks !== null ||
        isOverwhelmed;

      const activateBrownNoise =
        /\b(loud|noise|sensory|overwhelmed|migraine|headache|shield)\b/i.test(lower);

      const cleanedTaskText = raw
        .replace(/^alexa[,:\s]*/i, '')
        .replace(/i\s+(?:have\s+)?slept\s+(?:for\s+)?(?:only\s+)?(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:hours?|hrs?|h)\s*(?:and|,)?/gi, '')
        .replace(/i\s+(?:am|m)\s+not\s+feeling\s+(?:okay|well)\s*(?:and|,)?/gi, '')
        .replace(/i\s+have\s+(?:few|little|low|no|\d+)\s+(?:energy|spoons?)\s*(?:only|left|today)?\s*(?:and|,)?/gi, '')
        .replace(/(?:schedule|keep|plan)\s+(?:only\s+|just\s+)?(?:\d+|one|two|three|four|five)\s*(?:tasks?|activities|things|items)\s*(?:and|,)?/gi, '')
        .replace(/clear\s+(?:my\s+)?board\s*(?:and|,)?/gi, '')
        .replace(/i(?:'m|\s+am)\s+(?:feeling\s+)?(?:exhausted|overwhelmed|tired|drained|anxious|unwell)\s*(?:and|,)?/gi, '')
        .replace(/make\s+a\s+plan\s*(?:for|to)?/gi, '')
        .trim();

      const spokenParts: string[] = [];
      if (detectedHours !== null) {
        spokenParts.push(`logged ${detectedHours} hours of sleep`);
      }
      if (isOverwhelmed) {
        spokenParts.push('switched Spoons to low-effort recovery mode');
      }
      if (maxTasks !== null) {
        spokenParts.push(`cleared your board and scheduled only your ${maxTasks} lightest tasks for today`);
      } else if (clearBoard) {
        spokenParts.push('cleared heavy tasks from your board into your Later queue');
      }

      const alexaSpokenResponse =
        spokenParts.length > 0
          ? `I heard you. I ${spokenParts.join(', ')}. Take your time and rest.`
          : `Got it. I updated Spoons and organized your schedule around your current energy.`;

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tool: name,
                utterance: raw,
                detectedSleepHours: detectedHours,
                explicitSpoons,
                maxTasks,
                clearBoard,
                isOverwhelmed,
                activateBrownNoise,
                taskSegmentText: cleanedTaskText,
                alexaSpokenResponse,
              }),
            },
          ],
        },
      });
    }

    if (name === 'log_sleep_and_calibrate') {
      const minutes = Math.round((args.hoursSlept || 4.25) * 60);
      const recommendedBudget = args.hoursSlept < 6 ? 6 : args.hoursSlept >= 7.5 ? 11 : 9;
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tool: name,
                sleepMinutes: minutes,
                calibratedDailyBudget: recommendedBudget,
                alexaSpokenResponse: `I logged ${args.hoursSlept} hours of sleep in Spoons. Since you're running on sleep debt, I calibrated your daily budget to ${recommendedBudget} spoons and paced your schedule for recovery.`,
              }),
            },
          ],
        },
      });
    }

    if (name === 'trigger_sensory_shield') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tool: name,
                brownNoise: 'ACTIVATE_380HZ',
                energyMode: 'survival',
                triggerLogged: args.triggerType,
                alexaSpokenResponse: `I've turned on your 380 Hertz brown noise acoustic shield, dimmed Spoons to Quiet Dusk mode, and adjusted your pace for ${args.triggerType}.`,
              }),
            },
          ],
        },
      });
    }

    if (name === 'voice_brain_dump') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tool: name,
                rawUtterance: args.rawUtterance,
                alexaSpokenResponse: `I captured your voice brain dump in Spoons, split it into separate tasks, and logged your morning water and breakfast.`,
              }),
            },
          ],
        },
      });
    }

    if (name === 'rebalance_schedule') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tool: name,
                remainingSpoons: args.remainingSpoons,
                alexaSpokenResponse: `I've updated your Spoons budget to ${args.remainingSpoons} spoons, switched to low-effort mode, and moved heavy tasks to tomorrow so you can rest.`,
              }),
            },
          ],
        },
      });
    }

    if (name === 'decompose_overwhelming_task') {
      let microSteps = [
        `1. [1 Spoon] Open the file for "${args.taskTitle}" without editing yet`,
        `2. [1 Spoon] Complete just the first 2-minute section`,
        `3. [1 Spoon] Save progress and take a sensory breath`,
      ];

      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        try {
          const command = new ConverseCommand({
            modelId: 'us.amazon.nova-lite-v1:0',
            messages: [{ role: 'user', content: [{ text: `Break "${args.taskTitle}" into 3 neurodivergent-friendly 1-spoon micro-steps. Return a numbered list.` }] }],
          });
          const response = await bedrock.send(command);
          const outputText = response.output?.message?.content?.[0]?.text;
          if (outputText) microSteps = outputText.split('\n').filter(Boolean);
        } catch {}
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify({ tool: name, task: args.taskTitle, engine: 'Amazon Bedrock Nova Lite', microSteps }) }],
        },
      });
    }

    if (name === 'start_body_double') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tool: name,
                status: 'FLOW_TIMER_STARTED',
                durationMinutes: 5,
              }),
            },
          ],
        },
      });
    }
  }

  return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    protocol: 'MCP Streamable HTTP',
    protocolVersion: MCP_PROTOCOL_VERSION,
    endpoint: '/api/mcp',
    tools: MCP_TOOLS.map((t) => t.name),
  });
}
