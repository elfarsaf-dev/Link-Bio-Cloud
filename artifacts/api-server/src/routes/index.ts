import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import linksRouter from "./links";
import statsRouter from "./stats";
import publicRouter from "./public";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(linksRouter);
router.use(statsRouter);
router.use(publicRouter);

export default router;
