import { createClient } from "@supabase/supabase-js"
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }
  console.log("🔔 Webhook Kiwify recebido!");
  console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body, null, 2));
  try {

    //const { token } = req.body;

    //if (token !== process.env.ADMIN_TOKEN) {
    //    return res.status(401).json({ error: "Não autorizado" });
    //}

    // 1️⃣ Validação do webhook via assinatura HMAC
    const payload = JSON.stringify(req.body);
    const signature = req.headers["x-kiwify-signature"];
    const secret = process.env.KIWIFY_SECRET;

    const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    if (hash !== signature) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    // 2️⃣ Extraindo dados do JSON
    const body = req.body;
    const email = body.Customer.email;
    const nomeUsuario = body.Customer.first_name || body.Customer.full_name || email.split("@")[0];
    const kiwifyCustomer = body.Customer.id;
    const kiwifySubscription = body.Subscription?.id || body.subscription_id || null;
    const dtVencimento = body.Subscription?.next_payment ? new Date(body.Subscription.next_payment) : new Date(Date.now() + 30*24*60*60*1000);
    const dtPrimeira = body.Subscription?.start_date ? new Date(body.Subscription.start_date) : new Date();

    // 🔥 pegar email do webhook OU manual
    //let email = req.body.email || req.body.customer?.email;

    if (!email) {
      return res.status(400).json({ error: "Email obrigatório" })
    }

    email = email.toLowerCase();

    // 🔎 verificar se já existe no AUTH
    const { data: users } = await supabase.auth.admin.listUsers();

    let userAuth = users.users.find(u => u.email === email);

    // 🔥 se NÃO existir → cria
    if (!userAuth) {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      userAuth = data.user;
    }

    // ⏳ esperar o usuário existir no auth
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 🔎 verificar se já existe na tabela usuario
    const { data: existingUser } = await supabase
      .from("usuario")
      .select("id_auth")
      .eq("ds_email", email)
      .maybeSingle();

    // 🔥 se NÃO existir → cria
    if (!existingUser) {
    const nomeUsuario = email.split("@")[0];
    const { error: insertError } = await supabase.from("usuario").insert({
          id_auth: userAuth.id,
          ds_email: email,
          nm_usuario: nomeUsuario,
          ds_plano: "pro",
          ie_situacao: "ativa",
          dt_vencimento: dtVencimento,
          dt_primeira_assinatura: dtPrimeira,
          nr_kiwify_customer: kiwifyCustomer,
          ne_kiwify_subscription: kiwifySubscription
        });

    } else {
      // 🔥 se já existe → atualiza plano
      await supabase.from("usuario").update({
        ds_plano: "pro",
        ie_situacao: "ativa",
        dt_vencimento: dt_vencimento
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
