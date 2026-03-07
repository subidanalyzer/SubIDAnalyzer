import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {

  const { usuario } = req.query;

  const { data, error } = await supabase
    .from("usuario")
    .select("*")
    .ilike("nm_usuario", usuario)

  return res.json({
    usuario,
    resultado: data,
    erro: error
  });

}
