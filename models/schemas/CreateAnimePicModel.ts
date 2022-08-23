import mongoose, { Schema } from "mongoose";

import {IAnimePic} from "../../types";
import settings from '../../settings.json'

const databasePath = settings.database_url;

mongoose.connect(databasePath);
export default function CreateAnimePicModel(modelName: string) {
    const schema = new Schema<IAnimePic>(
        {
            id: { type: String, required: true },
            file: {type: String, required: true},
            alternative_names: {type: [String], required: false},
            old_file: {type: String, required: false},
            thumbnail_file: {type: String, required: true},
            album: {type: String, required: true},
            tags: {type: {}, required: false},
            artist: {type: {}, required: false},
            links: {type: {}, required: true},
            characters: {type: [String], required: false},
            has_results: {type: Boolean, required: false},
        },
        {
            collection: modelName
        }
    )


    return mongoose.model<IAnimePic>(modelName, schema);
}
