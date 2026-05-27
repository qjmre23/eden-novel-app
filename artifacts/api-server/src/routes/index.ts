import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ttsRouter from "./tts";

const router: IRouter = Router();

router.use("/tts", ttsRouter);
router.use(healthRouter);

export default router;
