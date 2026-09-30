import cookieParser from "cookie-parser";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import createError, { type HttpError } from "http-errors";
import logger from "morgan";
import path from "path";
import { userSetter } from "./lib/auth/auth-handlers.ts";
import { cafeRouter } from "./modules/cafe/cafe.routes.ts";
import { geoRouter } from "./modules/geo/geo.routes.ts";
import { userRouter } from "./modules/user/user.routes.ts";

const app: Express = express();

const trustProxy = process.env.TRUST_PROXY;
if (trustProxy === "true") {
  app.set("trust proxy", true);
} else if (trustProxy && /^\d+$/.test(trustProxy)) {
  app.set("trust proxy", Number(trustProxy));
}

const __dirname = import.meta.dirname;
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use("/user/login", authLimiter);
app.use("/user/refresh", authLimiter);
app.use("/user/logout", authLimiter);
app.use(limiter);

app.get("/health", (_req, res) => {
  res.json({ success: true });
});

app.use("/user", userRouter);

const protectedRoutes = express.Router();
protectedRoutes.use(userSetter);
protectedRoutes.use("/geo", geoRouter);
protectedRoutes.use("/cafes", cafeRouter);
app.use("/", protectedRoutes);

app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(createError(404));
});

app.use((err: HttpError, req: Request, res: Response, _next: NextFunction) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

export default app;
