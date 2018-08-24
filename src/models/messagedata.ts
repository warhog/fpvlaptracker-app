export interface MessageData {
    type: string,
    message: string;
}

export function isMessageData(arg: any) : arg is MessageData {
    return arg.type !== undefined && arg.type == "message";
}