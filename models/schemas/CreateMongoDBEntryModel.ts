import mongoose, { Schema } from "mongoose";

import {IMongoDBEntry} from "../../types";


export default function CreateMongoDBEntryModel(modelName: string) {
    const schema = new Schema<IMongoDBEntry>(
        {
            id: { type: String, required: true },
            name: { type: String, required: false },
            indexer: {type: Number, required: true},
            imagesDataArray: {type: [Object], required: true},
            alternative_names: {type: [String], required: false},
            oldImagesDataArray: {type: [Object], required: false},
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


    return mongoose.model<IMongoDBEntry>(modelName, schema);
}
