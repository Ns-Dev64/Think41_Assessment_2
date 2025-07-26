import type { Db } from "mongodb";
import { connectTodb } from "../db/db";
import { collections } from "../db/constants";

let db:Db | null;

db=await connectTodb();

export const checkEmail=async(emailId:string)=>{
    if(!emailId) return '';

    const user=await  db.collection(collections.users).findOne({
        email:emailId
    });

    if(!user) return '';

    return user;
}