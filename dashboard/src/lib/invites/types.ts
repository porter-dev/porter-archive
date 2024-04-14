import {z} from "zod";

export const inviteValidator = z.object({
    id: z.number(),
    status: z.string(),
    project: z.object(
        {
            id: z.number(),
            name: z.string(),
        }
    ),
    inviter: z.object(
        {
            email: z.string(),
            company: z.string(),
        }
    ),
});
export type Invite = z.infer<typeof inviteValidator>;