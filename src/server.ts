import express from "express";
import { connectTodb } from "./db/db";

const app=express();

try{

    await connectTodb();
    console.log("Mongo connected")
}
catch(err){
    console.error("Error connecting to the db",err);
}


app.listen(5001,()=>{
    console.log("Server listening on port 5001");
})