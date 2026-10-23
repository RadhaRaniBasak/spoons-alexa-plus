'use client';
import React, { useState } from 'react';

export default function AlexaPlusSimulator() {
  const [alexaReply, setAlexaReply] = useState('Hi Radha. You have 4 spoons remaining today. How are you feeling?');
  const [mcpLog, setMcpLog] = useState('// MCP (2025-11-25) Streamable HTTP Inspector Ready\n// Endpoint: POST /api/mcp');
  const [loading, setLoading] = useState(false);

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  };

  const callMcpTool = async (toolName: string, args: Record<string, any>, userUtterance: string) => {
    setLoading(true);
    const requestPayload = { jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name: toolName, arguments: args } };
    setMcpLog(`// 1. User to Alexa+: "${userUtterance}"\n// 2. Request -> POST /api/mcp (2025-11-25)\n` + JSON.stringify(requestPayload, null, 2));

    try {
      const res = await fetch('/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestPayload) });
      const data = await res.json();
      setMcpLog(prev => `${prev}\n\n// 3. Response <- MCP Server\n` + JSON.stringify(data, null, 2));

      const parsed = JSON.parse(data?.result?.content?.[0]?.text || '{}');
      if (parsed.alexaSpokenResponse) {
        setAlexaReply(parsed.alexaSpokenResponse);
        speak(parsed.alexaSpokenResponse);
      } else if (parsed.microSteps) {
        const spoken = `I used Amazon Bedrock to break that down into 3 one-spoon steps. Step 1: ${parsed.microSteps[0]}`;
        setAlexaReply(`${spoken}\n\n${parsed.microSteps.join('\n')}`);
        speak(spoken);
      }
    } catch (e) {
      setAlexaReply('Connection error communicating with MCP server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#09090b',
      border: '1px solid rgba(6, 182, 212, 0.4)',
      borderRadius: '16px',
      padding: '24px',
      color: '#f4f4f5',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxShadow: '0 20px 25px -5px rgb(0 0 / 0.5)',
      margin: '24px 0',
      zIndex: 50,
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #27272a', paddingBottom: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ height: '12px', width: '12px', borderRadius: '50%', background: '#22d3ee', display: 'inline-block' }} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#22d3ee', letterSpacing: '0.025em' }}>
            Alexa+ Multimodal Simulator (MCP Spec 2025-11-25)
          </h3>
        </div>
        <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '9999px', background: '#083344', color: '#67e8f9', border: '1px solid #0e7490' }}>
          Amazon Bedrock Active
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#18181b', padding: '16px', borderRadius: '12px', border: '1px solid #27272a' }}>
          <div>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', margin: '0 0 8px 0' }}>Alexa+ Spoken & Visual Response</p>
            <div style={{ padding: '12px', borderRadius: '8px', background: '#09090b', border: '1px solid rgba(6, 182, 212, 0.2)', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-line', color: '#ecfdf5' }}>
              {loading ? 'Invoking MCP tool...' : alexaReply}
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '8px' }}>Trigger Voice Utterance:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button 
                onClick={() => callMcpTool('rebalance_schedule', { remainingSpoons: 2, sensoryState: 'migraine' }, 'Alexa, I have a migraine and I am down to 2 spoons.')} 
                style={{ fontSize: '12px', padding: '8px 12px', borderRadius: '8px', background: '#0891b2', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                🎙️ &ldquo;Alexa, I&apos;m down to 2 spoons&rdquo;
              </button>
              <button 
                onClick={() => callMcpTool('decompose_overwhelming_task', { taskTitle: 'Refactor auth middleware' }, 'Alexa, break down auth refactor.')} 
                style={{ fontSize: '12px', padding: '8px 12px', borderRadius: '8px', background: '#27272a', color: '#e4e4e7', border: '1px solid #3f3f46', cursor: 'pointer' }}
              >
                ⚡ &ldquo;Alexa, break down my task&rdquo;
              </button>
            </div>
          </div>
        </div>

        <div style={{ borderRadius: '12px', background: '#000', padding: '16px', border: '1px solid #27272a', fontFamily: 'monospace', fontSize: '11px', overflowX: 'auto', maxHeight: '240px' }}>
          <div style={{ color: '#71717a', marginBottom: '8px', borderBottom: '1px solid #18181b', paddingBottom: '4px' }}>LIVE STREAMABLE HTTP PAYLOAD (`POST /api/mcp`)</div>
          <pre style={{ color: '#34d399', margin: 0, whiteSpace: 'pre-wrap' }}>{mcpLog}</pre>
        </div>
      </div>
    </div>
  );
}
