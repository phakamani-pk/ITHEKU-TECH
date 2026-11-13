import { toFetchHandler } from "srvx/node";
import app from "./api";

export const handleApi = toFetchHandler(app);
