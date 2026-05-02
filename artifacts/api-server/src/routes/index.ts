import { Router, type IRouter } from "express";
import healthRouter from "./health";
import migrateRouter from "./migrate";
import coverageRouter from "./coverage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(migrateRouter);
router.use(coverageRouter);

export default router;
