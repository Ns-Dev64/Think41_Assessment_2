import type { Request,Response } from "express";
import { checkEmail } from "../helpers/emailChecket";
import { collections } from "../db/constants";
import { connectTodb } from "../db/db";
import type { Db, ObjectId } from "mongodb";
import type { conversation,message } from "../model/conversation";
import { processMarketplaceQuery } from "../helpers/aiHelper";

let db:Db | null;

db=await connectTodb();


async function createMessage(message:message) {
    const newMessage= await db!.collection(collections.messages).insertOne(message);
    return newMessage;
}

async function pushMessageToConversation(conversationId:ObjectId,messageId:ObjectId,message:message,createdAt:string) {
   return await db!.collection<conversation>(collections.conversations).updateOne({
                _id:conversationId
            },
            {
                $push:{
                    messageArray:{
                        $each:[{
                            messageId:messageId.toString(),
                            content:message.content,
                            conversationId: conversationId.toString(),
                            createdAt:createdAt,
                            type:'user'
                        }],
                        $position:0
                    }
                }
            }
        )

}

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

            const newMessage=await createMessage(messagePayload);

            await pushMessageToConversation(newConversation.insertedId,newMessage.insertedId,messagePayload,createdAt);

           
            let result=await processMarketplaceQuery(message,db,checkEmail);

            messagePayload={
                content:result.botMessage,
                conversationId:newConversation.insertedId.toString(),
                type:'LLM',
                createdAt:createdAt
            }

            const llmMessage=await createMessage(messagePayload)

            await pushMessageToConversation(newConversation.insertedId,llmMessage.insertedId,result.botMessage,createdAt)

            if(result.needsEmail){
                return res.status(200).send(result.botMessage)
            }


        return res.status(200).send(result.botMessage)
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