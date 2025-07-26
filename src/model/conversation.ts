export interface message{
    id:string,
    content:string,
    conversationId:string,
    type:"user"| "LLM",
    createdAt:string
}

export interface conversation{
    id:string,
    userId:string,
    messageArray?:message[],
    startedAt:string,
    endedAt:string,
};