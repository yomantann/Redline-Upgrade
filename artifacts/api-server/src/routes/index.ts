import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import roomsRouter from "./rooms";
import progressionRouter from "./progression";
import assetArtRouter from "./asset-art";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(roomsRouter);
router.use(progressionRouter);
router.use(assetArtRouter);

export default router;
