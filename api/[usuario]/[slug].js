export default async function handler(req, res) {

  const { usuario, slug } = req.query;

  return res.json({
    usuario,
    slug
  });

}
