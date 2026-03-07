import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {

  const { usuario, slug } = req.query;

  // buscar usuário pelo nome público
  const { data: user, error: userError } = await supabase
    .from("usuario")
    .select("id_auth")
    .eq("nm_usuario", usuario)
    .single();

  if (!user) {
    return res.status(404).send("Usuário não encontrado");
  }

  // buscar link pelo UUID do usuário
  const { data: link, error: linkError } = await supabase
    .from("links")
    .select("ds_link_original")
    .eq("id_usuario", user.id_auth)
    .eq("ds_slug", slug)
    .single();

  if (!link) {
    return res.status(404).send("Link não encontrado");
  }

  // redirecionar
  res.writeHead(302, {
    Location: link.ds_link_original
  });

  res.end();
}
