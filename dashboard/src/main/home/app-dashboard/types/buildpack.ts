export type BuildConfig = {
    builder: string;
    buildpacks: string[];
    config: null | {
        [key: string]: string;
    };
};
export type Buildpack = {
    name: string;
    buildpack: string;
    config: {
        [key: string]: string;
    };
};
export type DetectedBuildpack = {
    name: string;
    builders: string[];
    detected: Buildpack[];
    others: Buildpack[];
    buildConfig: BuildConfig;
};
export const DEFAULT_BUILDER_NAME = "heroku";
export const DEFAULT_PAKETO_STACK = "paketobuildpacks/builder:full";
export const DEFAULT_HEROKU_STACK = "heroku/buildpacks:20";

export const BUILDPACK_TO_NAME: { [key: string]: string } = {
    "heroku/nodejs": "NodeJS",
    "heroku/python": "Python",
    "heroku/java": "Java",
    "heroku/ruby": "Ruby",
    "heroku/go": "Go",
};