import { Router, type IRouter } from "express";
import censusRouter from "./census";
import healthRouter from "./health";
import placesRouter from "./places";

const router: IRouter = Router();

router.use(healthRouter);
router.use(placesRouter);
router.use(censusRouter);

export default router;
