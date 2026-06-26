import { redirect } from "next/navigation"

// Rota /mais não existe — redireciona para dashboard
// O menu "Mais" no mobile agora abre um popup, não navega para esta rota
export default function MaisPage() {
  redirect("/dashboard")
}
