//stolen from TAKU.MOE by Geoxor & N1ko

import multer from "multer";
const storage = multer.diskStorage({
  destination: "../files/",
  filename: (req, file, next) => {
    const folder = file.fieldname + "s";
    const uniqueKey = Date.now();
    const fileName = file.originalname.replace(/\s/g, "_");
    next(null, `${folder}/${uniqueKey}-${fileName}`);
  },
});
export const upload = multer({ storage });
