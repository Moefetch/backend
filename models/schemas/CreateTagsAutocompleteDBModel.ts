import mongoose, { Schema } from "mongoose";

import { ITagEntryMongo } from "../../types";


export default function CreateTagsAutocompleteDBModel(modelName: string) {

    const schema = new Schema<ITagEntryMongo>(
        {
            _id: { type: String, required: true, unique: true }
        },
        {
            collection: modelName
        }
    )
    return mongoose.model<ITagEntryMongo>(modelName, schema);
}
