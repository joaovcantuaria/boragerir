import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const BUCKET = "tarefa-anexos"
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

// GET — listar anexos de uma tarefa
export async function GET(req: NextRequest) {
  const tarefaId = req.nextUrl.searchParams.get("tarefa_id")
  if (!tarefaId) return NextResponse.json({ erro: "tarefa_id obrigatório" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

  const { data, error } = await supabase
    .from("tarefa_anexos")
    .select("*")
    .eq("tarefa_id", tarefaId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ anexos: data })
}

// POST — upload de anexo
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const tarefaId = formData.get("tarefa_id") as string | null
  const empresaId = formData.get("empresa_id") as string | null

  if (!file || !tarefaId || !empresaId) {
    return NextResponse.json({ erro: "file, tarefa_id e empresa_id são obrigatórios" }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ erro: "Arquivo muito grande (máx 10MB)" }, { status: 400 })
  }

  // Upload para Supabase Storage
  const ext = file.name.split(".").pop() || "bin"
  const path = `${empresaId}/${tarefaId}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error("[api/tarefas/anexos] Erro upload:", uploadError.message)
    return NextResponse.json({ erro: uploadError.message }, { status: 500 })
  }

  // Gerar URL pública
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = urlData.publicUrl

  // Inserir registro no banco
  const { data: anexo, error: dbError } = await supabase
    .from("tarefa_anexos")
    .insert({
      tarefa_id: tarefaId,
      empresa_id: empresaId,
      nome: file.name,
      url,
      tipo: file.type || "application/octet-stream",
      tamanho: file.size,
    })
    .select()
    .single()

  if (dbError) {
    console.error("[api/tarefas/anexos] Erro DB:", dbError.message)
    return NextResponse.json({ erro: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ anexo })
}

// DELETE — remover anexo
export async function DELETE(req: NextRequest) {
  const { id, path } = await req.json()
  if (!id) return NextResponse.json({ erro: "id obrigatório" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

  // Remover do storage se tiver path
  if (path) {
    await supabase.storage.from(BUCKET).remove([path])
  }

  // Remover do banco
  const { error } = await supabase.from("tarefa_anexos").delete().eq("id", id)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
