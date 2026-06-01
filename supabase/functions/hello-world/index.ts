
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("Hello from Edge Functions!")

serve(async (req) => {
  const data = {
    message: `Hello from Talk2Me AI!`,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})
