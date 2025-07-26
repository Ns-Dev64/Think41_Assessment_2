export interface message{
    messageId?:string
    content:string,
    conversationId:string,
    type:"user"| "LLM",
    createdAt:string
}

export interface conversation{
    userId:string,
    messageArray?:message[],
    startedAt:string,
    endedAt:string | null,
};