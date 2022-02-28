import mongoose from "mongoose";

async function connect() {
    const mongooseDB = await mongoose.connect('mongodb://localhost:27017/test');
    console.log(typeof(mongooseDB));
}
