import mongoose, { Schema } from "mongoose";

import {IAnimePic} from "../../types";
import settings from '../../settings.json'

const databasePath = settings.database_url;

mongoose.connect(databasePath);

const schema = new Schema<IAnimePic>(
    {
        id: { type: String, required: true },
        file: {type: String, required: true},
        alternative_names: {type: [String], required: false},
        old_file: {type: String, required: false},
        thumbnail_file: {type: String, required: true},
        album: {type: String, required: true},
        tags_pixiv: {type: [String], required: false},
        tags_danbooru: {type: [String], required: false},
        artist: {type: {}, required: false},
        links: {type: {}, required: true},
        characters: {type: [String], required: false},
        has_results: {type: Boolean, required: false},
        pixiv_post_id:{type: Number, required: false},
    }
)

export default function CreateAnimePicModel(modelName: string) {
    return mongoose.model<IAnimePic>(modelName, schema);
}
