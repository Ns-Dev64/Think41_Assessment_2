import type { Request,Response } from "express";
import { checkEmail } from "../helpers/emailChecket";
import { collections } from "../db/constants";
import { connectTodb } from "../db/db";
import type { Db } from "mongodb";
import type { conversation,message } from "../model/conversation";

let db:Db | null;

db=await connectTodb();


export const chatHandler=async(req:Request,res:Response)=>{

    try{

        const {userId,message,conversationId}=req.body;

        if(!userId || !message) throw new Error("Missing property");

        const createdAt=new Date().toISOString()

        if(!conversationId){
            let convoPayload:conversation={
                userId,
                startedAt:createdAt,
                endedAt:null,
                messageArray:[],
            }

            const newConversation= await db.collection(collections.conversations).insertOne(convoPayload) ;

            let messagePayload:message={
                content:message,
                conversationId:newConversation.insertedId.toString(),
                type:"user",
                createdAt:createdAt
            }

            const newMessage=await db.collection(collections.messages).insertOne(messagePayload)!;

            await db.collection<conversation>(collections.conversations).updateOne({
                _id:newConversation.insertedId
            },
            {
                $push:{
                    messageArray:{
                        $each:[{
                            messageId:newMessage.insertedId.toString(),
                            content:message,
                            conversationId: newConversation.insertedId.toString(),
                            createdAt:createdAt,
                            type:'user'
                        }],
                        $position:0
                    }
                }
            }
        )
        }

        



    }
    catch(err){

        console.error("Error occured while initating chat",err);
        return res.status(400).send(err);

    }

}

export const checkStatus=async(req:Request,res:Response)=>{

      try{

        const email=req.query.email?.toString();
        if(!email) throw new Error('Missing property');

        const user=await checkEmail(email);
        if(!user) throw new Error("User doesn't exist");

        return res.status(200).send(user);

    }
    catch(err){

        console.error("Error occured while checking status",err);
        return res.status(400).send(err);

    }



}