import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { presignRoute } from "./presign.js";
import { deleteRoute } from "./delete.js";
import { authMiddleware } from "./auth.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
  })
);

app.use("/presign", authMiddleware);
app.use("/delete", authMiddleware);

app.post("/presign", presignRoute);
app.post("/delete", deleteRoute);

app.get("/health", (c) => c.json({ ok: true }));

const port = parseInt(process.env.PORT || "3001", 10);
serve({ fetch: app.fetch, port }, () => {
  console.log(`gallery_api listening on port ${port}`);
});
