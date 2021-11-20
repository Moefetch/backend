import mongoose, { Schema } from "mongoose";

import {IAnimePic, IPostLinks} from "../types";

const databasePath = 'mongodb://localhost:27017/animeP01'

mongoose.connect(databasePath);

const schema = new Schema<IAnimePic>(
    {
        id: { type: String, required: true },
        file: {type: String, required: true},
        old_file: {type: String, required: false},
        thumbnail_file: {type: String, required: true},
        tags_pixiv: {type: [String], required: false},
        tags_danbooru: {type: [String], required: false},
        links: {type: {}, required: true},
        characters: {type: [String], required: false},
        has_results: {type: Boolean, required:true},
        pixiv_id:{type: Number, required: false},
    }
)

export const AnimePic = mongoose.model<IAnimePic>("AnimePic", schema);