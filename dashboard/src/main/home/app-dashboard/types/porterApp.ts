import { z } from "zod";

export const porterAppValidator = z.object({
    name: z.string().default(""),
    git_branch: z.string().default(""),
    git_repo_id: z.number().default(0),
    repo_name: z.string().default(""),
    build_context: z.string().default("./"),
    builder: z.string().default(""),
    buildpacks: z
        .preprocess((val) => String(val).split(","), z.array(z.string()))
        .default([]),
    dockerfile: z.string().default(""),
    image_repo_uri: z.string().default(""),
    porter_yaml_path: z.string().default(""),
});

export interface PorterApp {
    name: string;
    git_branch: string;
    git_repo_id: number;
    repo_name: string;
    build_context: string;
    builder: string;
    buildpacks: string[];
    dockerfile: string;
    image_repo_uri: string;
    porter_yaml_path: string;
}

export const PorterApp = {
    empty: (): PorterApp => ({
        name: "",
        git_branch: "",
        git_repo_id: 0,
        repo_name: "",
        build_context: "./",
        builder: "",
        buildpacks: [],
        dockerfile: "",
        image_repo_uri: "",
        porter_yaml_path: "",
    }),

    setAttribute: <K extends keyof PorterApp>(
        app: PorterApp,
        key: K,
        value: PorterApp[K]
    ): PorterApp => ({
        ...app,
        [key]: value,
    }),

    setAttributes: (app: PorterApp, values: Partial<PorterApp>): PorterApp => ({
        ...app,
        ...values,
    }),
};

export type BuildMethod = "docker" | "buildpacks";
