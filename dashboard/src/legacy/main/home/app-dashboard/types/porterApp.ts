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
    image_info?: {
        repository: string;
        tag: string;
    }
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
        image_info: {
            repository: "",
            tag: "",
        }
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
}

export type BuildMethod = "docker" | "buildpacks";