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

    // 1️⃣ Validação do webhook 
    const { signature } = req.query;
    const payload = JSON.stringify(req.body);
    const hash = crypto.createHmac("sha1", process.env.KIWIFY_TOKEN)
       .update(payload)
       .digest("hex");
    console.log("signature:", signature);
    console.log("process.env.KIWIFY_TOKEN:", process.env.KIWIFY_TOKEN);
    if (hash !== signature) {
      console.log("DENTRO IF");
      return res.status(401).json({ error: "Não autorizado" });
    }
    console.log("FORA IF");
    // 2️⃣ Extraindo dados do JSON
    const body = req.body;
    let email = body.Customer.email;
    let nomeUsuario = body.Customer.first_name || body.Customer.full_name || email.split("@")[0];
    const kiwifyCustomer = body.Customer.id;
    const kiwifySubscription = body.Subscription?.id || body.subscription_id || null;
    const dtVencimento = body.Subscription?.next_payment ? new Date(body.Subscription.next_payment) : new Date(Date.now() + 30*24*60*60*1000);
    const dtPrimeira = body.Subscription?.start_date ? new Date(body.Subscription.start_date) : new Date();
    const orderId = body.order_id;
    const statusPedido = body.order_status;
    const eventoKiwify = body.webhook_event_type;
    const statusAssinatura = body.Subscription?.status || null;
    const telefone = body.Customer.mobile || null;
    const nomePessoa = body.Customer.full_name || null;
    const cpf = body.Customer.CPF || null;
    const instagram = body.Customer.instagram || null;
    const ds_rua = body.Customer.street || null;
    const nr_numero = body.Customer.number || null;
    const ds_bairro = body.Customer.neighborhood || null;
    const ds_cidade = body.Customer.city || null;
    const ds_uf = body.Customer.state || null;
    const cd_cep = body.Customer.zipcode || null;
    const refundedAt = body.refunded_at ? new Date(body.refunded_at) : null;


    // 🔥 pegar email do webhook OU manual
    //let email = req.body.email || req.body.customer?.email;
    console.log("email:", email);
    if (!email) {
      return res.status(400).json({ error: "Email obrigatório" })
    }
    console.log("email1:", email);
    email = email.toLowerCase();
    console.log("email2:", email);
    // 🔎 verificar se já existe no AUTH
    const { data: users } = await supabase.auth.admin.listUsers();
    console.log("data: users:", email);
    if (email.includes("@example.com")) {
      email = `subidanalyzer@gmail.com`;
    }
    console.log("email:", email);
    let userAuth = users.users.find(u => u.email === email);
    console.log("userAuth:", userAuth);
    // 🔥 se NÃO existir → cria
    if (!userAuth) {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
      console.log("error:", error);
      if (error) {
        return res.status(400).json({ error: error.message })
      }

      userAuth = data.user;
    }
    console.log("userAuth:", userAuth);
    // ⏳ esperar o usuário existir no auth
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("DEPOIS TIMEOUT:", userAuth);
    
    // 🔎 verificar se já existe na tabela usuario
    const { data: existingUser } = await supabase
      .from("usuario")
      .select("id_auth")
      .eq("ds_email", email)
      .maybeSingle();
    console.log("existingUser:", existingUser);
    // 🔥 se NÃO existir → cria
    if (!existingUser && eventoKiwify === "order_approved") {
    nomeUsuario = email.split("@")[0];
    console.log("nomeUsuario:", nomeUsuario);
    const { data, error: insertError } = await supabase.from("usuario").insert({
          id_auth: userAuth.id,
          ds_email: email,
          nm_usuario: nomeUsuario,
          ds_plano: "pro",
          ie_situacao: "ativa",
          dt_vencimento: dtVencimento,
          dt_primeira_assinatura: dtPrimeira,
          nr_kiwify_customer: kiwifyCustomer,
          nr_kiwify_subscription: kiwifySubscription,
          nr_kiwify_order: orderId,
          ds_status_pedido: statusPedido,
          ds_evento_kiwify: eventoKiwify,
          ds_status_assinatura: statusAssinatura,
          nr_telefone: telefone,
          nm_pessoa: nomePessoa,
          nr_cpf: cpf,
          ds_instagram: instagram,
          ds_rua: ds_rua,
          nr_numero: nr_numero,
          ds_bairro: ds_bairro,
          ds_cidade: ds_cidade,
          ds_uf: ds_uf,
          cd_cep: cd_cep
        });
    console.log("💾 INSERT DATA:", data);
    console.log("💥 INSERT ERROR:", insertError);
    } else {
      
      let ie_situacao = "ativa";
      
      if (eventoKiwify === "order_refunded" || eventoKiwify === "subscription_canceled") {
        ie_situacao = "inativa";  
        
        //Banir o usuario para nao conseguir logar mais, devido ter pedido reembolso. 
        await supabase.auth.admin.updateUserById(userAuth.id, {
          ban_duration: "876600h"
        });
      }

      if (eventoKiwify === "subscription_late") {
        ie_situacao = "inadimplente";  
      }

      if (eventoKiwify === "subscription_renewed") {
        ie_situacao = "ativa";
        // Desbanir no Auth caso estivesse banido
        await supabase.auth.admin.updateUserById(userAuth.id, {
          ban_duration: "none"
        });
      }


      // 🔥 se já existe → atualiza plano
      console.log("email:", email);
      await supabase.from("usuario").update({
        ds_plano: "pro",
        ie_situacao: ie_situacao,
        dt_vencimento: dtVencimento,
        nr_kiwify_subscription: kiwifySubscription,
        nr_kiwify_customer: kiwifyCustomer,
        nr_kiwify_order: orderId,
        ds_status_pedido: statusPedido,
        ds_evento_kiwify: eventoKiwify,
        ds_status_assinatura: statusAssinatura,
        nr_telefone: telefone,
        nm_pessoa: nomePessoa,
        nr_cpf: cpf,
        dt_reembolso: refundedAt
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
