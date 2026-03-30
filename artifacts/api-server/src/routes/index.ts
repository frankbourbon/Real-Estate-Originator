import { Router, type IRouter } from "express";
import censusRouter from "./census";
import floodRouter from "./flood";
import healthRouter from "./health";
import placesRouter from "./places";

const router: IRouter = Router();

router.use(healthRouter);
router.use(placesRouter);
router.use(censusRouter);
router.use(floodRouter);

export default router;
