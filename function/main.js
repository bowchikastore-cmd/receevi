module.exports = async ({ req, res }) => {
  return res.json({
    status: "ok",
    message: "Appwrite function running test"
  });
};
