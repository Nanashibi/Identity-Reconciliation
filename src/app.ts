import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import routes from "./routes/index";

const app = express();

app.use(express.json());

app.use("/", routes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
