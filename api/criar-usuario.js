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

    const { token } = req.body;

    if (token !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: "Não autorizado" });
    }

    // 🔥 pegar email do webhook OU manual
    let email = req.body.email || req.body.customer?.email;

    if (!email) {
      return res.status(400).json({ error: "Email obrigatório" })
    }

    email = email.toLowerCase();

    // 🔎 verificar se já existe no AUTH
    const { data: users } = await supabase.auth.admin.listUsers();

    let userAuth = users.users.find(u => u.email === email);

    // 🔥 se NÃO existir → cria
      return res.status(200).json({
  teste: "ANTES DO if (!userAuth) {"
});

    if (!userAuth) {
      console.log("ANTES ENVIAR EMAIL");
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
      console.log("DEPOIS ENVIAR EMAIL");

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      userAuth = data.user;
    }
    console.log("ANTES TIMEOUT"); 
    // ⏳ esperar o usuário existir no auth
    await new Promise(resolve => setTimeout(resolve, 2000));
     console.log("DEPOIS TIMEOUT"); 
    // 🔎 verificar se já existe na tabela usuario
    const { data: existingUser } = await supabase
      .from("usuario")
      .select("id_auth")
      .eq("ds_email", email)
      .maybeSingle();

    // 🔥 se NÃO existir → cria
    console.log("ANTES EXISTINGUSER"); 
    if (!existingUser) {
const { error: insertError } = await supabase.from("usuario").insert({
  id_auth: userAuth.id,
  ds_email: email,
  ds_plano: "pro",
  ie_situacao: "ativa",
  dt_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  dt_primeira_assinatura: new Date()
});

if (insertError) {
  console.log("ERRO INSERT:", insertError);
}
    } else {
      // 🔥 se já existe → atualiza plano
      await supabase.from("usuario").update({
        ds_plano: "pro",
        ie_situacao: "ativa",
        dt_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }).eq("ds_email", email);
    }

    return res.status(200).json({
      success: true,
      message: "Usuário processado com sucesso"
    })

  } catch (err) {

    return res.status(500).json({
      error: "Erro interno",
      details: err.message
    })

  }

}
