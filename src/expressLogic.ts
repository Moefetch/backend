import type { Request } from "express";
//import Express from "express";



/**
 * Gets the first file from a multipart form data
 */
 export const getFirstFile = (req: Request) => {
    const files = req.files as Express.Multer.File[];
    const targetFile = files[0];
    //if (!targetFile) throw new APIError(404, "sus file requestus");
    return targetFile;
  };