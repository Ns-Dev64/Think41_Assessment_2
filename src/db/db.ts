import { Db, MongoClient } from "mongodb";

let client= new MongoClient("mongodb://localhost:27017/");
let db:Db | null=null;

export async function connectTodb(){

    if(db) return db;

    db=(await client.connect()).db("test");

    return db;

}