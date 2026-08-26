import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceMemoryService } from '@/services/supabase/memory';
import { AiMemoryService } from '@/services/ai/memory-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');
    const query = searchParams.get('q');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id query parameter is required' }, { status: 400 });
    }

    if (query && query.trim()) {
      const results = await WorkspaceMemoryService.searchMemories(workspaceId, query.trim());
      return NextResponse.json({ memories: results });
    }

    const memories = await WorkspaceMemoryService.getWorkspaceMemories(workspaceId);
    return NextResponse.json({ memories });
  } catch (err: any) {
    console.error('[API /api/ai/memory GET] Exception:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch memories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, workspace_id, title, content, category, tags, text, context_type, source_id, created_by } = body;

    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 });
    }

    // Action: Auto-extract memories from text (meeting transcript or chat thread) using Gemini
    if (action === 'extract') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'text is required for extraction' }, { status: 400 });
      }

      const extractedItems = await AiMemoryService.extractMemoriesFromText(text, context_type || 'chat');
      const insertedMemories = [];

      for (const item of extractedItems) {
        const created = await WorkspaceMemoryService.createMemory({
          workspace_id,
          category: item.category,
          title: item.title,
          content: item.content,
          tags: item.tags || [],
          source_type: context_type === 'transcript' ? 'meeting' : 'ai_extraction',
          source_id: source_id || null,
          created_by: created_by || null,
        });
        if (created) insertedMemories.push(created);
      }

      return NextResponse.json({
        message: `Extracted ${insertedMemories.length} memory item(s)`,
        memories: insertedMemories,
      });
    }

    // Action: Manual creation
    if (!title || !content) {
      return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
    }

    const newMemory = await WorkspaceMemoryService.createMemory({
      workspace_id,
      category: category || 'fact',
      title,
      content,
      tags: tags || [],
      source_type: 'manual',
      source_id: source_id || null,
      created_by: created_by || null,
    });

    return NextResponse.json({ memory: newMemory }, { status: 201 });
  } catch (err: any) {
    console.error('[API /api/ai/memory POST] Exception:', err);
    return NextResponse.json({ error: err.message || 'Failed to process memory action' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const success = await WorkspaceMemoryService.deleteMemory(id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Memory deleted' });
  } catch (err: any) {
    console.error('[API /api/ai/memory DELETE] Exception:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete memory' }, { status: 500 });
  }
}
