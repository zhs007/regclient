import { NextResponse } from 'next/server';
import { OpenAIStream, StreamingTextResponse } from 'vercel-ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Example: Use OpenAI (or compatible) API endpoint
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      stream: true,
    }),
  });

  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
