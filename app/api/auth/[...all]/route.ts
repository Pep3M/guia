import { getAuthInstance } from "@/lib/auth/auth-server"

export async function GET(request: Request) {
  const auth = await getAuthInstance()
  return auth.handler(request)
}

export async function POST(request: Request) {
  const auth = await getAuthInstance()
  return auth.handler(request)
}

