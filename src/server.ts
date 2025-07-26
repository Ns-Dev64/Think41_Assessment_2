import express from "express";
import { connectTodb } from "./db/db";
import aiRouter from "./routes/ai";
const app=express();

try{

    await connectTodb();
    console.log("Mongo connected")
}
catch(err){
    console.error("Error connecting to the db",err);
}

app.use('/api',aiRouter);

app.listen(5001,()=>{
    console.log("Server listening on port 5001");
})