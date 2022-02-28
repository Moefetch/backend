import mongoose, { Schema } from "mongoose";

import { ITableOfContentsMongo } from "../types";
import settings from '../settings.json'

const databasePath = settings.database_url;

mongoose.connect(databasePath);

const schema = new Schema<ITableOfContentsMongo>(
    {
        uuid: { type: String, required: true },
        name: {type: String, required: false},
        albumCoverImage: {type: String, required: true},
        type: {type: String, required: true},
    }
)
 
const TableOfContentsModel = mongoose.model<ITableOfContentsMongo>("TableOfContents", schema);
export default TableOfContentsModel;