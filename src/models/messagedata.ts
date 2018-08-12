export interface MessageData {
    message: string;
}

export function isMessageData(arg: any) : arg is MessageData {
    return arg.message !== undefined;
}