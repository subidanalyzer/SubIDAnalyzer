import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }

  try {

    const { email, token } = req.body;

    if (token !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: "Não autorizado" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email obrigatório" })
    }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(200).json({
      success: true,
      message: "Convite enviado"
    })

  } catch (err) {

    return res.status(500).json({
      error: "Erro interno"
    })

  }

}
