import mongoose, { Schema } from "mongoose";

import {IAnimePic} from "../../types";
import settings from '../../settings.json'

const databasePath = settings.database_url;

mongoose.connect(databasePath);
export default function CreateAnimePicModel(modelName: string) {
    const schema = new Schema<IAnimePic>(
        {
            id: { type: String, required: true },
            indexer: {type: Number, required: true},
            imagesDataArray: {type: [Object], required: true},
            alternative_names: {type: [String], required: false},
            oldFile: {type: String, required: false},
            album: {type: String, required: true},
            artists: {type: [String], required: false},
            storedResult: {type: String, required: true},
            links: {type: {}, required: true},
            ids: {type: {}, required: false},
            isHidden: {type: Boolean, required: false},
            isNSFW: {type: Boolean, required: false},
            hasResults: {type: Boolean, required: false},
            tags: {type: [String], required: false},

        },
        {
            collection: modelName
        }
    )


    return mongoose.model<IAnimePic>(modelName, schema);
}
