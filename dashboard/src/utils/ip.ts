import {z} from "zod";

export const isIP = (value: string): boolean => {
    const ip = z.string().ip();

    const parsed = ip.safeParse(value);

    return parsed.success;
};

export const stringifiedDNSRecordType = (value: string): string => {
    if (isIP(value)) {
       return "an A record"
    } else {
        return "a CNAME record"
    }
};