// @ts-check

export default (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.statusCode = 200;
  res.end(JSON.stringify({ enabled: Boolean(process.env.OPENAI_API_KEY) }));
};

