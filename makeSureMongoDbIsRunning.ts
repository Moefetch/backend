import settings from "./settings";
import mongoose from "mongoose";

mongoose.connection.on('open', function (ref) {
    mongoose.connection.close();
    console.log('Connected to Mongo server...');
});
  
mongoose.connection.on('error', function(error) {
    throw new Error("mongoDB not started \n STARTING . . . . ");
})
if (settings.database_url) mongoose.connect(settings.database_url);



