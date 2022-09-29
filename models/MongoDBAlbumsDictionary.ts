import mongoose, { Schema } from "mongoose";

import { IAlbumDictionaryItemMongo } from "../types";


const schema = new Schema<IAlbumDictionaryItemMongo>(
    {
        uuid: { type: String, required: true },
        name: {type: String, required: false},
        estimatedPicCount: {type: Number, required: true},
        albumCoverImage: {type: String, required: true},
        type: {type: String, required: true},
        isHidden: {type: Boolean, required: true},
    },
    {
        collection: "Albums Dictionary"
    }
)
 
const AlbumsDictionary = mongoose.model<IAlbumDictionaryItemMongo>("Albums Dictionary", schema);
export default AlbumsDictionary;