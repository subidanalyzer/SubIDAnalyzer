import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {

  const { usuario, slug } = req.query;

  const { data: link } = await supabase
  .from("links")
  .select("id, ds_link_original, usuario!inner(id_auth)")
  .eq("ds_slug", slug)
  .eq("usuario.nm_usuario", usuario)
  .single();


  // buscar usuário
  /* const { data: user } = await supabase
    .from("usuario")
    .select("id_auth")
    .eq("nm_usuario", usuario)
    .single();
  
  if (!user) {
    return res.status(404).send("Usuário não encontrado");
  }

  // buscar link
 /* const { data: link } = await supabase
    .from("links")
    .select("id, ds_link_original")
    .eq("id_usuario", user.id_auth)
    .eq("ds_slug", slug)
    .single();
  */
  if (!link) {
    return res.status(404).send("Link não encontrado");
  }

    // capturar dados do clique
  const referer = req.headers.referer || null;
  const userAgent = req.headers["user-agent"] || null;
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    null;

  // detectar dispositivo simples
  const device = /mobile/i.test(userAgent) ? "mobile" : "desktop";

  const isBot = /bot|crawler|spider|facebookexternalhit|WhatsApp|TelegramBot/i.test(userAgent);
 
    // salvar clique (não bloqueia redirect)
    await supabase.from("cliques").insert({
      id_usuario: user.id_auth,
      slug: slug,
      nr_seq_link: link.id,
      referer: referer,
      device: device,
      user_agent: userAgent,
      ip: ip,
      ie_bot: isBot
    });
 

  // redirect
  res.writeHead(302, {
    Location: link.ds_link_original
  });

  res.end();
}
