export default async ({ req, res, log }) => {
  log("Function started");

  return res.json({
    success: true,
    message: "Appwrite function is running ✅",
  });
};
