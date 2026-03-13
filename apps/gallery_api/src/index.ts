import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import photos from "./photos.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
  })
);

app.route("/photos", photos);

app.get("/health", (c) => c.json({ ok: true }));

const port = parseInt(process.env.PORT || "3001", 10);
serve({ fetch: app.fetch, port }, () => {
  console.log(`gallery_api listening on port ${port}`);
});
