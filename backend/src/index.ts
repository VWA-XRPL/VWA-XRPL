import express from "express";

const app = express();
const port = 3000;

app.get("/api/assets", (req, res) => {
  res.json([{ id: 1, name: "Tokenized Asset", value: "1000 USD" }]);
});

app.listen(port, () => console.log(`Backend running on port ${port}`));
